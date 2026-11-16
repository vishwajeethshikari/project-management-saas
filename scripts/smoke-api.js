#!/usr/bin/env node

// Local end-to-end smoke test for this checkout. Creates only clearly marked
// smoke data in project_management_saas and removes those records in finally.
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { unlink } = require("node:fs/promises");
const { createRequire } = require("node:module");

const backendRequire = createRequire(path.resolve(__dirname, "../backend/package.json"));
backendRequire("dotenv").config({ path: path.resolve(__dirname, "../backend/.env") });
const pool = backendRequire("./src/config/db");
pool.removeAllListeners("error");
pool.on("error", () => {});

const apiBase = process.env.SMOKE_API_URL || "http://localhost:5001/api";
const unique = randomUUID();
const email = `phase-c-${unique}@smoketest.local`;
const password = `Smoke-${randomUUID()}-Pass9`;
const displayName = `Phase C Smoke ${unique.slice(0, 8)}`;
const results = [];
const cleanupResults = [];
let userId;
let organizationId;
let workspaceId;
let projectId;
let taskId;
let attachmentId;
let attachmentStorageKey;
let cookie;

function record(label, method, route, expected, actual, reason = undefined) {
  const verified = expected.includes(actual);
  results.push({ label, method, route, expected, actual, status: verified ? "Verified" : "Failed", ...(reason ? { reason } : {}) });
  return verified;
}

async function request(label, method, route, { body, form, expected = [], asBytes = false } = {}) {
  try {
    const response = await fetch(`${apiBase}${route}`, {
      method,
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(form ? { body: form } : {}),
    });
    let payload = null;
    if (response.status !== 204) {
      if (asBytes) payload = Buffer.from(await response.arrayBuffer());
      else {
        const content = await response.text();
        try { payload = content ? JSON.parse(content) : null; }
        catch { payload = content; }
      }
    }
    const status = response.status;
    const passed = record(label, method, route, expected, status,
      expected.includes(status) ? undefined : (payload?.message || `HTTP ${status}`));
    return { response, payload, passed };
  } catch (error) {
    record(label, method, route, expected, "NETWORK_ERROR", error?.name || "Request failed");
    return { response: null, payload: null, passed: false };
  }
}

async function cleanupRequest(label, method, route) {
  if (!cookie) {
    cleanupResults.push({ label, status: "Skipped (no authenticated session)" });
    return false;
  }
  const result = await request(label, method, route, { expected: [204] });
  cleanupResults.push({ label, status: result.passed ? "Removed" : `Failed (${result.response?.status ?? "network"})` });
  return result.passed;
}

async function cleanupDatabase() {
  if (!userId) {
    cleanupResults.push({ label: "smoke user/org records", status: "No user was created" });
    return;
  }

  const current = await pool.query("SELECT current_database() AS name");
  if (current.rows[0].name !== "project_management_saas") {
    throw new Error("Refusing cleanup because the configured database is not the approved main database.");
  }

  if (attachmentId && attachmentStorageKey && !cleanupResults.some((entry) => entry.label === "attachment" && entry.status === "Removed")) {
    const directory = path.resolve(process.env.ATTACHMENT_STORAGE_DIR || path.resolve(__dirname, "../backend/private-uploads"));
    try {
      await unlink(path.join(directory, attachmentStorageKey));
      cleanupResults.push({ label: "smoke attachment file", status: "Removed" });
    } catch (error) {
      if (error.code !== "ENOENT") cleanupResults.push({ label: "smoke attachment file", status: `Failed (${error.code || error.name})` });
    }
  }

  if (organizationId) {
    const removed = await pool.query(
      "DELETE FROM organizations WHERE id=$1 AND owner_id=$2 RETURNING id",
      [organizationId, userId]
    );
    cleanupResults.push({ label: "smoke organization and cascaded data", status: removed.rowCount === 1 ? "Removed" : "Not found/already removed" });
  }

  const removedUser = await pool.query(
    "DELETE FROM users WHERE id=$1 AND email=$2 AND email LIKE '%@smoketest.local' RETURNING id",
    [userId, email]
  );
  cleanupResults.push({ label: "marked smoke user", status: removedUser.rowCount === 1 ? "Removed" : "Not found/already removed" });
}

async function main() {
  const database = await pool.query("SELECT current_database() AS name");
  if (database.rows[0].name !== "project_management_saas") {
    throw new Error("Refusing smoke requests unless backend configuration targets project_management_saas.");
  }

  const health = await request("health", "GET", "/health", { expected: [200] });
  const ready = await request("readiness", "GET", "/ready", { expected: [200] });
  if (!health.passed || !ready.passed) return;

  const registration = await request("register", "POST", "/auth/register", {
    body: { name: displayName, email, password }, expected: [201],
  });
  if (!registration.passed) return;
  userId = registration.payload?.user?.id;
  if (!userId) throw new Error("Registration returned success without a user id.");

  const login = await request("login", "POST", "/auth/login", {
    body: { email, password }, expected: [200],
  });
  const setCookie = login.response?.headers.get("set-cookie");
  if (login.passed && setCookie) cookie = setCookie.split(";")[0];

  await request("invalid login", "POST", "/auth/login", {
    body: { email, password: `${password}-wrong` }, expected: [401],
  });

  if (!cookie) return;

  await request("GET /auth/me", "GET", "/auth/me", { expected: [200] });
  const organization = await request("create organization", "POST", "/organizations", {
    body: { name: `SMOKE ${unique.slice(0, 8)}` }, expected: [201],
  });
  organizationId = organization.payload?.organization?.id;
  if (!organization.passed || !organizationId) return;

  const workspace = await request("create workspace", "POST", "/workspaces", {
    body: { name: `SMOKE ${unique.slice(0, 8)}`, organizationId }, expected: [201],
  });
  workspaceId = workspace.payload?.workspace?.id;
  if (!workspace.passed || !workspaceId) return;

  const project = await request("create project", "POST", `/workspaces/${workspaceId}/projects`, {
    body: { name: `SMOKE ${unique.slice(0, 8)}`, description: "Phase C disposable smoke record" }, expected: [201],
  });
  projectId = project.payload?.project?.id;
  if (!project.passed || !projectId) return;

  const task = await request("create task", "POST", `/workspaces/${workspaceId}/tasks`, {
    body: { projectId, title: `SMOKE ${unique.slice(0, 8)}`, description: "Phase C disposable smoke record" }, expected: [201],
  });
  taskId = task.payload?.task?.id;
  if (!task.passed || !taskId) return;

  await request("update task status", "PATCH", `/workspaces/${workspaceId}/tasks/${taskId}`, {
    body: { status: "in_progress" }, expected: [200],
  });
  await request("add comment", "POST", `/workspaces/${workspaceId}/tasks/${taskId}/comments`, {
    body: { body: "Phase C disposable smoke comment" }, expected: [201],
  });
  await request("list notifications", "GET", `/workspaces/${workspaceId}/notifications`, { expected: [200] });

  const form = new FormData();
  form.append("file", new Blob([Buffer.from("%PDF-1.4\n% phase-c-smoke\n")], { type: "application/pdf" }), "phase-c-smoke.pdf");
  const upload = await request("upload attachment", "POST", `/workspaces/${workspaceId}/tasks/${taskId}/attachments`, {
    form, expected: [201],
  });
  attachmentId = upload.payload?.attachment?.id;
  if (upload.passed && attachmentId) {
    const keyResult = await pool.query(
      "SELECT storage_key FROM task_attachments WHERE id=$1 AND uploaded_by=$2 AND task_id=$3",
      [attachmentId, userId, taskId]
    );
    attachmentStorageKey = keyResult.rows[0]?.storage_key;
    const download = await request("download attachment", "GET", `/workspaces/${workspaceId}/tasks/${taskId}/attachments/${attachmentId}/download`, {
      expected: [200], asBytes: true,
    });
    if (download.passed && !download.payload?.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      const result = results.find((entry) => entry.label === "download attachment");
      result.status = "Failed";
      result.reason = "Response did not contain the uploaded PDF signature";
    }
  } else {
    record("download attachment", "GET", `/workspaces/${workspaceId}/tasks/${taskId}/attachments/:attachmentId/download`, [200], "NOT_RUN", "Upload prerequisite failed");
  }

  if (attachmentId) await cleanupRequest("attachment", "DELETE", `/workspaces/${workspaceId}/tasks/${taskId}/attachments/${attachmentId}`);
  if (taskId) await cleanupRequest("smoke task", "DELETE", `/workspaces/${workspaceId}/tasks/${taskId}`);
  if (projectId) await cleanupRequest("smoke project", "DELETE", `/workspaces/${workspaceId}/projects/${projectId}`);
  if (workspaceId) await cleanupRequest("smoke workspace", "DELETE", `/workspaces/${workspaceId}`);

  await request("logout", "POST", "/auth/logout", { expected: [200] });
}

(async () => {
  let fatal;
  try {
    await main();
  } catch (error) {
    fatal = { name: error?.name || "Error", message: error?.message || "Smoke test failed" };
  } finally {
    try { await cleanupDatabase(); }
    catch (error) { cleanupResults.push({ label: "database cleanup", status: `Failed (${error?.code || error?.name || "error"})` }); }
    await pool.end().catch(() => {});
  }

  process.stdout.write(JSON.stringify({
    target_database: "project_management_saas",
    smoke_identity: "email suffix @smoketest.local (value withheld)",
    results,
    cleanup: cleanupResults,
    ...(fatal ? { fatal } : {}),
  }, null, 2) + "\n");
  if (fatal || results.some((entry) => entry.status !== "Verified") || cleanupResults.some((entry) => entry.status.startsWith("Failed"))) {
    process.exitCode = 1;
  }
})();
