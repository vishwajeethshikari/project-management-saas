const assert = require("node:assert/strict");
const { mkdtemp, readFile, rm, stat, writeFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { test } = require("node:test");
const express = require("express");
const http = require("node:http");
const pool = require("../src/config/db");
const { createAttachment, receiveAttachment } = require("../src/controllers/attachmentController");

test("stores PDF metadata only after the file signature matches its MIME type", async () => {
  const directory = await mkdtemp(join(tmpdir(), "projectflow-attachment-test-"));
  const filePath = join(directory, "private-file");
  const content = Buffer.from("%PDF-1.4\nprivate test file");
  await writeFile(filePath, content);
  const originalQuery = pool.query;
  const queries = [];
  pool.query = async (sql, values) => {
    queries.push({ sql, values });
    if (sql.startsWith("SELECT id FROM tasks")) return { rows: [{ id: "14" }] };
    return {
      rows: [{
        id: "26",
        task_id: "14",
        uploaded_by: "3",
        original_name: "brief.pdf",
        mime_type: "application/pdf",
        byte_size: content.length,
      }],
    };
  };
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  try {
    await createAttachment({
      file: {
        path: filePath,
        originalname: "..\\private\\brief.pdf",
        mimetype: "application/pdf",
        size: content.length,
      },
      params: { taskId: "14" },
      workspaceId: "8",
      organizationId: "5",
      user: { id: "3" },
    }, response);

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.attachment.original_name, "brief.pdf");
    assert.equal(queries.length, 2);
    assert.equal(queries[1].values[0], "5");
    assert.equal(queries[1].values[1], "8");
    assert.equal(queries[1].values[4], "brief.pdf");
    assert.deepEqual(await readFile(filePath), content);
  } finally {
    pool.query = originalQuery;
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects mismatched file content and removes the rejected upload", async () => {
  const directory = await mkdtemp(join(tmpdir(), "projectflow-attachment-test-"));
  const filePath = join(directory, "rejected-file");
  await writeFile(filePath, "%PDF-1.4\nnot a PNG");
  const originalQuery = pool.query;
  let queried = false;
  pool.query = async () => {
    queried = true;
    return { rows: [] };
  };
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  try {
    await createAttachment({
      file: { path: filePath, originalname: "fake.png", mimetype: "image/png", size: 18 },
      params: { taskId: "14" },
      workspaceId: "8",
      organizationId: "5",
      user: { id: "3" },
    }, response);

    assert.equal(response.statusCode, 415);
    assert.equal(queried, false);
    await assert.rejects(stat(filePath), { code: "ENOENT" });
  } finally {
    pool.query = originalQuery;
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects uploads larger than 10 MB", async () => {
  const directory = await mkdtemp(join(tmpdir(), "projectflow-attachment-test-"));
  const previousStorageDirectory = process.env.ATTACHMENT_STORAGE_DIR;
  process.env.ATTACHMENT_STORAGE_DIR = directory;
  const app = express();
  app.post("/upload", receiveAttachment, (req, res) => res.status(201).end());
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([Buffer.alloc(10 * 1024 * 1024 + 1)], { type: "application/pdf" }),
      "large.pdf"
    );
    const response = await fetch(`http://127.0.0.1:${server.address().port}/upload`, {
      method: "POST",
      body: formData,
    });

    assert.equal(response.status, 413);
    assert.match((await response.json()).message, /10 MB limit/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previousStorageDirectory === undefined) delete process.env.ATTACHMENT_STORAGE_DIR;
    else process.env.ATTACHMENT_STORAGE_DIR = previousStorageDirectory;
    await rm(directory, { recursive: true, force: true });
  }
});
