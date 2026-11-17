require("dotenv").config();

const bcrypt = require("bcrypt");
const pool = require("../src/config/db");

const DEMO_ORG = "ProjectFlow Demo Organization";
const DEMO_WORKSPACE = "ProjectFlow Demo Workspace";
const DEMO_USERS = [
  { key: "owner", name: "Alex Morgan", email: "demo.admin@projectflow.local", role: "owner", password: "DemoAdmin!2026" },
  { key: "manager", name: "Jordan Lee", email: "demo.manager@projectflow.local", role: "manager", password: "DemoManager!2026" },
  { key: "employee", name: "Sam Rivera", email: "demo.employee1@projectflow.local", role: "employee", password: "DemoEmployee1!2026" },
  { key: "employee2", name: "Taylor Chen", email: "demo.employee2@projectflow.local", role: "employee", password: "DemoEmployee2!2026" },
];

const PROJECTS = [
  { key: "website-refresh", name: "Website Refresh", description: "A focused redesign of the public site and conversion journey.", status: "in_progress", progress: ["completed", "completed", "in_progress", "in_review", "todo"] },
  { key: "mobile-launch", name: "Mobile App Launch", description: "Prepare the first mobile release for customer rollout.", status: "in_progress", progress: ["completed", "in_progress", "in_progress", "todo", "todo"] },
  { key: "customer-insights", name: "Customer Insights Dashboard", description: "Build a reporting dashboard for customer health and usage.", status: "in_progress", progress: ["completed", "completed", "completed", "in_review", "todo"] },
];

function assertDemoEnvironment() {
  const env = (process.env.NODE_ENV || "development").toLowerCase();
  if (!["development", "demo"].includes(env) || process.env.DEMO_SEED_ENABLED !== "true") {
    throw new Error("Demo seed refused. Set NODE_ENV=development (or demo) and DEMO_SEED_ENABLED=true. Production is never permitted.");
  }
  if (!process.env.DATABASE_URL && !process.env.DB_USER) {
    throw new Error("Configure backend/.env with DATABASE_URL or DB_USER before seeding.");
  }
}

async function ensureUser(client, user) {
  // Preserve existing users and credentials. New demo users receive bcrypt hashes.
  const result = await client.query(
    `INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [user.name, user.email, await bcrypt.hash(user.password, 12)]
  );
  if (result.rows[0]) return result.rows[0].id;
  const existing = await client.query("SELECT id FROM users WHERE email=$1", [user.email]);
  if (!existing.rows[0]) throw new Error(`Could not resolve demo user ${user.email}.`);
  return existing.rows[0].id;
}

async function run() {
  assertDemoEnvironment();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('projectflow-demo-seed'))");

    const users = {};
    for (const user of DEMO_USERS) users[user.key] = await ensureUser(client, user);

    let organizationId = (await client.query("SELECT id FROM organizations WHERE name=$1 AND owner_id=$2 ORDER BY id LIMIT 1", [DEMO_ORG, users.owner])).rows[0]?.id;
    if (!organizationId) {
      organizationId = (await client.query("INSERT INTO organizations(name,owner_id) VALUES($1,$2) RETURNING id", [DEMO_ORG, users.owner])).rows[0].id;
    }

    let workspaceId;
    const priorWorkspace = await client.query("SELECT id FROM workspaces WHERE name=$1 AND organization_id=$2 ORDER BY id LIMIT 1", [DEMO_WORKSPACE, organizationId]);
    if (priorWorkspace.rows[0]) workspaceId = priorWorkspace.rows[0].id;
    else {
      const created = await client.query(
        "INSERT INTO workspaces(name,description,owner_id,organization_id) VALUES($1,$2,$3,$4) RETURNING id",
        [DEMO_WORKSPACE, "A realistic sample workspace for local ProjectFlow demonstrations.", users.owner, organizationId]
      );
      workspaceId = created.rows[0].id;
    }

    for (const user of DEMO_USERS) {
      await client.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING", [organizationId, users[user.key], user.role]);
      await client.query("INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING", [workspaceId, users[user.key], user.role]);
      await client.query("INSERT INTO notification_preferences(workspace_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [workspaceId, users[user.key]]);
    }

    let teamId;
    const priorTeam = await client.query("SELECT id FROM teams WHERE workspace_id=$1 AND name='Product Delivery'", [workspaceId]);
    if (priorTeam.rows[0]) teamId = priorTeam.rows[0].id;
    else teamId = (await client.query(
      "INSERT INTO teams(workspace_id,name,description,manager_id,created_by) VALUES($1,'Product Delivery','Demo delivery team', $2, $3) RETURNING id",
      [workspaceId, users.manager, users.owner]
    )).rows[0].id;
    for (const [userId, role] of [[users.manager, "manager"], [users.employee, "employee"], [users.employee2, "employee"]]) {
      await client.query("INSERT INTO team_members(workspace_id,team_id,user_id,role) VALUES($1,$2,$3,$4) ON CONFLICT(team_id,user_id) DO NOTHING", [workspaceId, teamId, userId, role]);
    }

    const projectIds = {};
    for (const project of PROJECTS) {
      let projectId = (await client.query("SELECT id FROM projects WHERE workspace_id=$1 AND name=$2", [workspaceId, project.name])).rows[0]?.id;
      if (!projectId) projectId = (await client.query(
        `INSERT INTO projects(workspace_id,name,description,status,owner_id,manager_id,start_date,due_date)
         VALUES($1,$2,$3,$4,$5,$6,CURRENT_DATE-20,CURRENT_DATE+30) RETURNING id`,
        [workspaceId, project.name, project.description, project.status, users.owner, users.manager]
      )).rows[0].id;
      projectIds[project.key] = projectId;
      for (const userId of [users.owner, users.manager, users.employee, users.employee2]) {
        await client.query("INSERT INTO project_members(workspace_id,project_id,user_id,role) VALUES($1,$2,$3,'member') ON CONFLICT(project_id,user_id) DO NOTHING", [workspaceId, projectId, userId]);
      }
    }

    const taskRows = [];
    const taskInputs = [
      ["website-refresh", "Audit current pages", "in_review", users.employee], ["website-refresh", "Approve visual direction", "completed", users.manager], ["website-refresh", "Build responsive landing page", "in_progress", users.employee2], ["website-refresh", "Update pricing content", "todo", users.employee], ["website-refresh", "Run accessibility review", "completed", users.manager],
      ["mobile-launch", "Finalize onboarding flow", "in_progress", users.employee], ["mobile-launch", "Prepare app store assets", "todo", users.employee2], ["mobile-launch", "Complete release checklist", "todo", users.manager], ["mobile-launch", "Validate analytics events", "completed", users.employee2], ["mobile-launch", "Test account recovery", "in_review", users.employee],
      ["customer-insights", "Define health score metrics", "completed", users.manager], ["customer-insights", "Create dashboard wireframes", "completed", users.employee], ["customer-insights", "Connect usage data", "in_review", users.employee2], ["customer-insights", "Add export controls", "todo", users.employee], ["customer-insights", "Review dashboard with support", "completed", users.manager],
    ];
    for (let index = 0; index < taskInputs.length; index++) {
      const [projectKey, title, status, assigneeId] = taskInputs[index];
      let task = (await client.query("SELECT id FROM tasks WHERE workspace_id=$1 AND project_id=$2 AND title=$3", [workspaceId, projectIds[projectKey], title])).rows[0];
      if (!task) task = (await client.query(
        `INSERT INTO tasks(workspace_id,project_id,title,description,status,priority,assignee_id,due_date,created_by,estimated_minutes,completed_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE+$8::integer,$9,$10,$11) RETURNING id`,
        [workspaceId, projectIds[projectKey], title, `Demo task: ${title.toLowerCase()}.`, status, index % 4 === 0 ? "high" : "medium", assigneeId, index % 9 === 0 ? -2 : 10 + index, users.manager, 60 + (index % 4) * 30, status === "completed" ? new Date(Date.now() - 2 * 86_400_000) : null]
      )).rows[0];
      taskRows.push({ id: task.id, title, assigneeId, index });
    }

    for (const task of taskRows.slice(0, 4)) {
      await client.query("INSERT INTO task_comments(workspace_id,task_id,user_id,body) SELECT $1,$2,$3,$4 WHERE NOT EXISTS(SELECT 1 FROM task_comments WHERE workspace_id=$1 AND task_id=$2 AND body=$4)", [workspaceId, task.id, task.index % 2 ? users.manager : users.employee, task.index % 2 ? "I reviewed this and added a couple of follow-up notes." : "The latest draft is ready for the team to review."]);
    }

    for (const task of taskRows.slice(0, 5)) {
      const started = new Date(Date.now() - (task.index + 2) * 86_400_000);
      const ended = new Date(started.getTime() + (45 + task.index * 5) * 60_000);
      await client.query(
        `INSERT INTO time_entries(workspace_id,task_id,user_id,started_at,ended_at,duration_seconds,note)
         SELECT $1,$2,$3,$4,$5,$6,$7 WHERE NOT EXISTS(SELECT 1 FROM time_entries WHERE workspace_id=$1 AND task_id=$2 AND note=$7)`,
        [workspaceId, task.id, task.assigneeId, started, ended, (45 + task.index * 5) * 60, "Demo focus session"]
      );
    }

    const notices = [
      [users.owner, "assignment", "You have a new task assignment in Website Refresh.", taskRows[0].id, "owner-assignment"],
      [users.manager, "mention", "Sam Rivera mentioned you in a project discussion.", taskRows[1].id, "manager-mention"],
      [users.employee, "assignment", "A task is ready for your review.", taskRows[2].id, "employee-review"],
    ];
    for (const [userId, type, message, taskId, key] of notices) {
      await client.query(
        `INSERT INTO notifications(workspace_id,user_id,type,message,resource_type,resource_id,dedupe_key)
         VALUES($1,$2,$3,$4,'task',$5,$6) ON CONFLICT(dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING`,
        [workspaceId, userId, type, message, taskId, `projectflow-demo:${key}`]
      );
    }

    await client.query("COMMIT");
    console.log(`Demo data is ready in ${DEMO_WORKSPACE} (workspace ${workspaceId}).`);
    console.log("The dashboard and analytics endpoints calculate metrics from these database records.");
    console.log("Demo accounts:");
    for (const user of DEMO_USERS) console.log(`  ${user.role}: ${user.email} / ${user.password}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
