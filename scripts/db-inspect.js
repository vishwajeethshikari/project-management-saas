#!/usr/bin/env node

// Read-only inventory of the configured PostgreSQL database.
// This script intentionally contains SELECT statements only.
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const backendRequire = createRequire(path.resolve(__dirname, "../backend/package.json"));
backendRequire("dotenv").config({ path: path.resolve(__dirname, "../backend/.env") });

const inspectTestDatabase = process.argv.includes("--test-db");
if (inspectTestDatabase && process.argv.includes("--write-report")) {
  throw new Error("Use --summary for test database inspection; the main DB report will not be overwritten.");
}
const pool = inspectTestDatabase
  ? new (backendRequire("pg").Pool)({
      connectionString: backendRequire("./src/config/testDb").getTestDatabaseUrl(),
    })
  : backendRequire("./src/config/db");

// Do not let the application pool's default error listener print raw driver
// messages in this diagnostic utility.
pool.removeAllListeners("error");
pool.on("error", () => {});

const migrationDirectory = path.resolve(__dirname, "../database/migrations");
const migrationFiles = Array.from({ length: 9 }, (_, index) =>
  `${String(index + 1).padStart(3, "0")}_${[
    "create_users",
    "create_workspace_domain",
    "expand_task_workflows",
    "teams_and_account_recovery",
    "organizations_sessions",
    "task_attachments",
    "time_reporting_recurring_rules",
    "workload_analytics_notifications",
    "backfill_organization_memberships",
  ][index]}.sql`
);

function unquote(identifier) {
  return identifier.replace(/^"|"$/g, "");
}

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function migrationManifest() {
  const tables = new Map();
  const indexes = new Set();
  const constraints = new Set();

  for (const filename of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationDirectory, filename), "utf8");
    const createTable = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([\w"]+)\s*\(([\s\S]*?)\n\);/gi;
    for (const match of sql.matchAll(createTable)) {
      const table = unquote(match[1]);
      const columns = tables.get(table) || new Set();
      for (const line of match[2].split(/\r?\n/)) {
        const column = line.trim().match(/^([a-zA-Z_][\w]*)\s+/);
        if (column && !/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK|EXCLUDE)$/i.test(column[1])) {
          columns.add(column[1]);
        }
      }
      tables.set(table, columns);
    }

    const alterTable = /ALTER\s+TABLE\s+([\w"]+)\s+([\s\S]*?);/gi;
    for (const match of sql.matchAll(alterTable)) {
      const table = unquote(match[1]);
      const columns = tables.get(table) || new Set();
      for (const column of match[2].matchAll(/ADD\s+COLUMN(?:\s+IF\s+NOT\s+EXISTS)?\s+([\w"]+)/gi)) {
        columns.add(unquote(column[1]));
      }
      tables.set(table, columns);
      for (const constraint of match[2].matchAll(/ADD\s+CONSTRAINT\s+([\w"]+)/gi)) {
        constraints.add(unquote(constraint[1]));
      }
    }

    for (const index of sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+([\w"]+)/gi)) {
      indexes.add(unquote(index[1]));
    }
    for (const constraint of sql.matchAll(/ADD\s+CONSTRAINT\s+([\w"]+)/gi)) {
      constraints.add(unquote(constraint[1]));
    }
  }

  return { tables, indexes, constraints };
}

const migrationMarkers = [
  { id: "001", objects: [["users", "table"], ["users", "column", "password_hash"]] },
  { id: "002", objects: [["workspaces", "table"], ["workspace_members", "table"], ["workspace_invitations", "table"], ["projects", "table"], ["tasks", "table"], ["task_comments", "table"], ["notifications", "table"]] },
  { id: "003", objects: [["tasks", "column", "start_date"], ["subtasks", "table"], ["task_dependencies", "table"], ["activity_logs", "table"], ["milestones", "table"], ["labels", "table"], ["time_entries", "table"], ["recurring_tasks", "table"]] },
  { id: "004", objects: [["teams", "table"], ["team_members", "table"], ["password_reset_tokens", "table"]] },
  { id: "005", objects: [["organizations", "table"], ["organization_members", "table"], ["organization_invitations", "table"], ["workspaces", "column", "organization_id"], ["users", "column", "token_version"]] },
  { id: "006", objects: [["task_attachments", "table"]] },
  { id: "007", objects: [["recurring_tasks", "column", "recurrence_unit"], ["tasks", "column", "recurrence_id"], ["tasks", "column", "recurrence_run_at"]] },
  { id: "008", objects: [["notification_preferences", "table"], ["notifications", "column", "dedupe_key"], ["tasks", "column", "estimated_minutes"], ["tasks", "column", "completed_at"]] },
  { id: "009", dataOnly: true, objects: [] },
];

function quoteRelation(schema, table) {
  return `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;
}

function markdownCell(value) {
  return String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function markdownTable(headers, rows) {
  if (rows.length === 0) return "_None._\n";
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(" | ")} |`),
  ].join("\n") + "\n";
}

function reportMarkdown(report) {
  const rowCounts = new Map(report.row_counts.map((entry) => [`${entry.table_schema}.${entry.table_name}`, entry.row_count]));
  const columnsByTable = new Map();
  for (const column of report.columns) {
    const key = `${column.table_schema}.${column.table_name}`;
    const entries = columnsByTable.get(key) || [];
    const type = column.character_maximum_length
      ? `${column.data_type}(${column.character_maximum_length})`
      : column.data_type;
    entries.push(`${column.column_name} ${type}${column.is_nullable === "NO" ? " NOT NULL" : " NULL"}`);
    columnsByTable.set(key, entries);
  }

  const migrationRows = report.migration_status.map((entry) => [
    entry.migration,
    entry.appears_applied ? "Appears applied" : "Not fully applied",
    entry.evidence,
    entry.missing_markers.join(", ") || "—",
  ]);
  const tablesRows = report.tables.map((entry) => [
    entry.table_schema,
    entry.table_name,
    rowCounts.get(`${entry.table_schema}.${entry.table_name}`) ?? "not counted",
  ]);
  const columnsRows = [...columnsByTable.entries()].flatMap(([table, entries]) =>
    entries.map((entry) => [table, entry])
  );
  const typeLabels = { p: "Primary key", f: "Foreign key", u: "Unique", c: "Check", x: "Exclusion" };
  const constraintRows = report.primary_foreign_unique_and_check_constraints.map((entry) => [
    entry.table_schema,
    entry.table_name,
    typeLabels[entry.constraint_type] || entry.constraint_type,
    entry.constraint_name,
    (entry.columns || []).join(", ") || "—",
    entry.constraint_type === "f"
      ? `${entry.referenced_schema}.${entry.referenced_table} (${(entry.referenced_columns || []).join(", ")})`
      : "—",
    entry.definition,
  ]);
  const indexRows = report.indexes.map((entry) => [
    `${entry.table_schema}.${entry.table_name}`,
    entry.index_name,
    entry.definition,
  ]);
  const missing = report.migration_mismatches;
  const orphan = report.workspace_members_without_matching_organization_members;
  const orphanRows = orphan.examples.map((entry) => [entry.workspace_id, entry.user_id, entry.organization_id]);
  const appliedMigrations = report.migration_status.filter((entry) => entry.appears_applied).map((entry) => entry.migration);
  const missingMigrations = report.migration_status.filter((entry) => !entry.appears_applied).map((entry) => entry.migration);

  return `# Live Database Status\n\n` +
    `- **Inspected:** ${new Date().toISOString()}\n` +
    `- **Database/schema:** \`${report.database_name}\` / \`${report.database_schema}\`\n` +
    `- **Method:** read-only catalog queries and exact \`SELECT count(*)\` queries; no migrations or other writes executed. Counts were taken sequentially and are not guaranteed to share one transaction snapshot.\n\n` +
    `## Summary\n\n` +
    `- ${report.tables.length} live base tables found across non-system schemas.\n` +
    `- Migration markers: ${appliedMigrations.length ? `${appliedMigrations.join(", ")} appear applied` : "none appear applied"}; ${missingMigrations.length ? `migration(s) ${missingMigrations.join(", ")} are not fully applied` : "no migration markers are missing"}. This is inferred from schema objects, not a migration-history ledger.\n` +
    `- Missing migration-defined objects: ${missing.missing_tables.length} table(s), ${missing.missing_columns.length} column(s), ${missing.missing_named_indexes.length} named index(es), ${missing.missing_named_constraints.length} named constraint(s).\n` +
    `- Workspace members without matching organization membership: **${orphan.count ?? "not checked"}**.\n\n` +
    `## Migration markers\n\n` +
    markdownTable(["Migration", "Assessment", "Markers", "Missing markers"], migrationRows) + "\n" +
    `## Tables and row counts\n\n` +
    markdownTable(["Schema", "Table", "Rows"], tablesRows) + "\n" +
    `## Columns\n\n` +
    markdownTable(["Table", "Column / type / nullability"], columnsRows) + "\n" +
    `## Primary keys, foreign keys, unique and check constraints\n\n` +
    markdownTable(["Schema", "Table", "Type", "Name", "Columns", "References", "Definition"], constraintRows) + "\n" +
    `## Indexes\n\n` +
    markdownTable(["Table", "Index", "Definition"], indexRows) + "\n" +
    `## Workspace membership isolation check\n\n` +
    `Count of \`workspace_members\` rows without a matching \`organization_members\` row for the workspace's organization: **${orphan.count ?? "not checked"}**.\n\n` +
    markdownTable(["Workspace ID", "User ID", "Organization ID"], orphanRows) + "\n" +
    `## Migration mismatches\n\n` +
    `Comparison is against objects parsed from the migration \`CREATE TABLE\`, \`ALTER TABLE ADD COLUMN/CONSTRAINT\`, and \`CREATE INDEX\` statements in the current schema. Extra live objects are not treated as a mismatch. Definitions that differ despite matching names, inline constraints not parsed as named objects, data backfills, and unsupported SQL constructs require manual review.\n\n` +
    `- Missing tables: ${missing.missing_tables.join(", ") || "none"}\n` +
    `- Missing columns: ${missing.missing_columns.join(", ") || "none"}\n` +
    `- Missing named indexes: ${missing.missing_named_indexes.join(", ") || "none"}\n` +
    `- Missing named constraints: ${missing.missing_named_constraints.join(", ") || "none"}\n\n` +
    `## Reproduction\n\n` +
    `Run \`node scripts/db-inspect.js --write-report\` from the repository root. The script uses the backend pool configuration and emits no connection credentials or table row values.\n`;
}

async function inspect() {
  const manifest = migrationManifest();
  const currentSchemaResult = await pool.query("SELECT current_database() AS database_name, current_schema() AS schema_name");
  const databaseName = currentSchemaResult.rows[0].database_name;
  const expectedDatabase = inspectTestDatabase ? "project_management_test" : "project_management_saas";
  if (databaseName !== expectedDatabase) {
    throw new Error("Connected database does not match the explicitly approved inspection target.");
  }
  const currentSchema = currentSchemaResult.rows[0].schema_name;

  const tableResult = await pool.query(
    `SELECT table_schema, table_name
       FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name`
  );
  const tables = tableResult.rows;
  const schemas = [...new Set(tables.map((row) => row.table_schema))];

  const columnResult = await pool.query(
    `SELECT table_schema, table_name, column_name, data_type, udt_name,
            is_nullable, character_maximum_length
       FROM information_schema.columns
      WHERE table_schema = ANY($1::text[])
      ORDER BY table_schema, table_name, ordinal_position`,
    [schemas]
  );
  const columns = columnResult.rows;

  const constraintResult = await pool.query(
    `SELECT ns.nspname AS table_schema, tbl.relname AS table_name,
            con.conname AS constraint_name, con.contype AS constraint_type,
            ARRAY(
              SELECT att.attname::text
                FROM unnest(con.conkey) WITH ORDINALITY AS key(attnum, ord)
                JOIN pg_attribute att ON att.attrelid = tbl.oid AND att.attnum = key.attnum
               ORDER BY key.ord
            ) AS columns,
            ref_ns.nspname AS referenced_schema,
            ref_tbl.relname AS referenced_table,
            ARRAY(
              SELECT att.attname::text
                FROM unnest(con.confkey) WITH ORDINALITY AS key(attnum, ord)
                JOIN pg_attribute att ON att.attrelid = ref_tbl.oid AND att.attnum = key.attnum
               ORDER BY key.ord
            ) AS referenced_columns,
            pg_get_constraintdef(con.oid, true) AS definition
       FROM pg_constraint con
       JOIN pg_class tbl ON tbl.oid = con.conrelid
       JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
       LEFT JOIN pg_class ref_tbl ON ref_tbl.oid = con.confrelid
       LEFT JOIN pg_namespace ref_ns ON ref_ns.oid = ref_tbl.relnamespace
      WHERE ns.nspname = ANY($1::text[])
      ORDER BY ns.nspname, tbl.relname, con.conname`,
    [schemas]
  );

  const indexResult = await pool.query(
    `SELECT schemaname AS table_schema, tablename AS table_name,
            indexname AS index_name, indexdef AS definition
       FROM pg_indexes
      WHERE schemaname = ANY($1::text[])
      ORDER BY schemaname, tablename, indexname`,
    [schemas]
  );

  const rowCounts = [];
  for (const table of tables) {
    const result = await pool.query(
      `SELECT count(*)::text AS row_count FROM ${quoteRelation(table.table_schema, table.table_name)}`
    );
    rowCounts.push({ ...table, row_count: result.rows[0].row_count });
  }

  const currentColumns = new Map();
  for (const column of columns.filter((entry) => entry.table_schema === currentSchema)) {
    const found = currentColumns.get(column.table_name) || new Set();
    found.add(column.column_name);
    currentColumns.set(column.table_name, found);
  }
  const currentTables = new Set(tables.filter((entry) => entry.table_schema === currentSchema).map((entry) => entry.table_name));
  const currentIndexes = new Set(indexResult.rows.filter((entry) => entry.table_schema === currentSchema).map((entry) => entry.index_name));
  const currentConstraints = new Set(constraintResult.rows.filter((entry) => entry.table_schema === currentSchema).map((entry) => entry.constraint_name));

  const migrationStatus = migrationMarkers.map((migration) => {
    if (migration.dataOnly) {
      return {
        migration: migration.id,
        appears_applied: null,
        evidence: "data-only migration; no schema marker or migration ledger exists",
        missing_markers: [],
      };
    }
    const has = (object) => {
      const [name, kind, member] = object;
      if (kind === "table") return currentTables.has(name);
      if (kind === "column") return currentColumns.get(name)?.has(member) || false;
      return false;
    };
    const present = migration.objects.filter(has).length;
    const total = migration.objects.length;
    return {
      migration: migration.id,
      appears_applied: present === total,
      evidence: `${present}/${total} schema markers present`,
      missing_markers: migration.objects.filter((object) => !has(object)).map((object) => object.join(".")),
    };
  });

  const missingTables = [...manifest.tables.keys()].filter((name) => !currentTables.has(name));
  const missingColumns = [];
  for (const [table, expectedColumns] of manifest.tables) {
    const actualColumns = currentColumns.get(table) || new Set();
    for (const column of expectedColumns) {
      if (!actualColumns.has(column)) missingColumns.push(`${table}.${column}`);
    }
  }
  const missingIndexes = [...manifest.indexes].filter((name) => !currentIndexes.has(name));
  const missingNamedConstraints = [...manifest.constraints].filter((name) => !currentConstraints.has(name));

  let orphanMemberships = { count: null, examples: [], note: "Required tables not present; check skipped." };
  if (currentTables.has("workspace_members") && currentTables.has("workspaces") && currentTables.has("organization_members")) {
    const result = await pool.query(
      `SELECT count(*)::text AS count
         FROM workspace_members wm
         JOIN workspaces w ON w.id = wm.workspace_id
         LEFT JOIN organization_members om
           ON om.organization_id = w.organization_id AND om.user_id = wm.user_id
        WHERE om.user_id IS NULL`
    );
    const examples = await pool.query(
      `SELECT wm.workspace_id, wm.user_id, w.organization_id
         FROM workspace_members wm
         JOIN workspaces w ON w.id = wm.workspace_id
         LEFT JOIN organization_members om
           ON om.organization_id = w.organization_id AND om.user_id = wm.user_id
        WHERE om.user_id IS NULL
        ORDER BY wm.workspace_id, wm.user_id
        LIMIT 100`
    );
    orphanMemberships = {
      count: result.rows[0].count,
      examples: examples.rows,
      note: examples.rows.length === 100 ? "Examples capped at 100 rows." : null,
    };
  }

  return {
    database_name: databaseName,
    database_schema: currentSchema,
    read_only: true,
    query_types_used: ["SELECT"],
    tables,
    columns,
    primary_foreign_unique_and_check_constraints: constraintResult.rows,
    indexes: indexResult.rows,
    row_counts: rowCounts,
    migration_status: migrationStatus,
    migration_mismatches: {
      missing_tables: missingTables,
      missing_columns: missingColumns,
      missing_named_indexes: missingIndexes,
      missing_named_constraints: missingNamedConstraints,
      note: "Comparison covers objects parsed from migration CREATE TABLE, ALTER TABLE ADD COLUMN/CONSTRAINT, and CREATE INDEX statements in the current schema. Unrecognized SQL constructs and object-definition differences still require manual review.",
    },
    workspace_members_without_matching_organization_members: orphanMemberships,
  };
}

inspect()
  .then((report) => {
    if (process.argv.includes("--write-report")) {
      const reportPath = path.resolve(__dirname, "../docs/DB_STATUS.md");
      fs.writeFileSync(reportPath, reportMarkdown(report), "utf8");
      console.log(`Wrote ${path.relative(process.cwd(), reportPath)} from read-only database inspection.`);
      console.log(`Tables: ${report.tables.length}; missing task_attachments table: ${report.migration_mismatches.missing_tables.includes("task_attachments")}; orphan workspace memberships: ${report.workspace_members_without_matching_organization_members.count}.`);
    } else if (process.argv.includes("--summary")) {
      console.log(JSON.stringify({
        database: report.database_name,
        schema: report.database_schema,
        tables: report.row_counts,
        migration_status: report.migration_status,
        mismatches: report.migration_mismatches,
        orphan_workspace_memberships: report.workspace_members_without_matching_organization_members.count,
      }, null, 2));
    } else {
      console.log(JSON.stringify(report, null, 2));
    }
  })
  .catch((error) => {
    const safeError = {
      name: error?.name || "Error",
      code: typeof error?.code === "string" ? error.code : undefined,
      location: typeof error?.stack === "string" ? error.stack.split("\n").slice(1, 4).map((line) => line.trim()) : undefined,
      message: "Database inspection failed; details are suppressed to avoid exposing connection information.",
    };
    console.error(JSON.stringify({ read_only: true, error: safeError }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
