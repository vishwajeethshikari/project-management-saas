const path = require("node:path");
const { createRequire } = require("node:module");
const br = createRequire(path.resolve(__dirname, "../backend/package.json"));
br("dotenv").config({ path: path.resolve(__dirname, "../backend/.env") });
const pool = br("./src/config/db");

async function run() {
  // Find all user accounts
  const users = await pool.query("SELECT id, name, email, created_at FROM users ORDER BY id");
  console.log("=== EXISTING USER ACCOUNTS ===");
  for (const u of users.rows) {
    console.log(`  ID=${u.id} name="${u.name}" email="${u.email}" created=${u.created_at}`);
  }
  
  // Check organizations
  const orgs = await pool.query("SELECT o.id, o.name, o.owner_id, u.email AS owner_email FROM organizations o JOIN users u ON u.id = o.owner_id ORDER BY o.id");
  console.log("\n=== ORGANIZATIONS ===");
  for (const o of orgs.rows) {
    console.log(`  ID=${o.id} name="${o.name}" owner_email="${o.owner_email}"`);
  }
  
  // Check organization memberships
  const orgMembers = await pool.query("SELECT om.organization_id, om.user_id, om.role, u.email FROM organization_members om JOIN users u ON u.id = om.user_id ORDER BY om.organization_id, om.user_id");
  console.log("\n=== ORG MEMBERSHIPS ===");
  for (const m of orgMembers.rows) {
    console.log(`  org=${m.organization_id} user=${m.user_id} role="${m.role}" email="${m.email}"`);
  }
  
  // Check workspace memberships
  const wsMembers = await pool.query("SELECT wm.workspace_id, wm.user_id, wm.role, u.email, w.name AS ws_name FROM workspace_members wm JOIN users u ON u.id = wm.user_id JOIN workspaces w ON w.id = wm.workspace_id ORDER BY wm.workspace_id, wm.user_id");
  console.log("\n=== WORKSPACE MEMBERSHIPS ===");
  for (const m of wsMembers.rows) {
    console.log(`  ws=${m.workspace_id}("${m.ws_name}") user=${m.user_id} role="${m.role}" email="${m.email}"`);
  }
  
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
