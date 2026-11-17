#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const backendRequire = createRequire(path.resolve(__dirname, "../backend/package.json"));
backendRequire("dotenv").config({ path: path.resolve(__dirname, "../backend/.env") });
const pool = backendRequire("./src/config/db");

async function run() {
  const sql = fs.readFileSync(path.resolve(__dirname, "../database/migrations/010_project_members_and_enhancements.sql"), "utf8");
  console.log("Applying migration 010...");
  await pool.query(sql);
  console.log("Migration 010 applied successfully!");
  await pool.end();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
