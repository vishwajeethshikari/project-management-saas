const path = require("node:path");
const { createRequire } = require("node:module");
const br = createRequire(path.resolve(__dirname, "../backend/package.json"));
br("dotenv").config({ path: path.resolve(__dirname, "../backend/.env") });
const pool = br("./src/config/db");
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='project_members' ORDER BY ordinal_position")
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
