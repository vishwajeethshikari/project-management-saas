const { randomUUID } = require("node:crypto");
const { chmod, mkdir, open, unlink } = require("node:fs/promises");
const path = require("node:path");
const multer = require("multer");
const pool = require("../config/db");
const { apiError } = require("../utils/api");
const { isManagerOrHigher } = require("../security/roles");

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function storageDirectory() {
  return path.resolve(process.env.ATTACHMENT_STORAGE_DIR || path.join(__dirname, "..", "..", "private-uploads"));
}

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      mkdir(storageDirectory(), { recursive: true, mode: 0o700 })
        .then(() => callback(null, storageDirectory()))
        .catch(callback);
    },
    filename(req, file, callback) {
      callback(null, randomUUID());
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter(req, file, callback) {
    callback(null, allowedMimeTypes.has(file.mimetype));
  },
});

function receiveAttachment(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return apiError(res, status, status === 413 ? "File exceeds the 10 MB limit" : "Invalid file upload");
    }
    return next(error);
  });
}

function detectMimeType(header) {
  if (header.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  if (header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return "image/jpeg";
  if (["GIF87a", "GIF89a"].includes(header.subarray(0, 6).toString())) return "image/gif";
  if (header.subarray(0, 4).toString() === "RIFF" && header.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

async function detectFileMimeType(filePath) {
  const file = await open(filePath, "r");
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await file.read(header, 0, header.length, 0);
    return detectMimeType(header.subarray(0, bytesRead));
  } finally {
    await file.close();
  }
}

async function removeUploadedFile(filePath) {
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function safeOriginalName(name) {
  return name
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 255);
}

const metadataColumns = `id,task_id,uploaded_by,original_name,mime_type,byte_size,created_at`;

async function listAttachments(req, res) {
  const task = await pool.query("SELECT id FROM tasks WHERE id=$1 AND workspace_id=$2", [req.params.taskId, req.workspaceId]);
  if (!task.rows[0]) return apiError(res, 404, "Task not found");
  const result = await pool.query(
    `SELECT ${metadataColumns} FROM task_attachments
     WHERE task_id=$1 AND workspace_id=$2 AND organization_id=$3
     ORDER BY created_at,id`,
    [req.params.taskId, req.workspaceId, req.organizationId]
  );
  res.json({ success: true, attachments: result.rows });
}

async function createAttachment(req, res) {
  if (!req.file) return apiError(res, 415, "Choose a supported PDF or image file");

  let detectedMimeType;
  try {
    await chmod(req.file.path, 0o600);
    detectedMimeType = await detectFileMimeType(req.file.path);
  } catch (error) {
    await removeUploadedFile(req.file.path);
    throw error;
  }
  if (!detectedMimeType || detectedMimeType !== req.file.mimetype) {
    await removeUploadedFile(req.file.path);
    return apiError(res, 415, "File content does not match a supported MIME type");
  }

  const originalName = safeOriginalName(req.file.originalname);
  if (!originalName) {
    await removeUploadedFile(req.file.path);
    return apiError(res, 400, "File name is required");
  }

  try {
    const task = await pool.query(
      "SELECT id FROM tasks WHERE id=$1 AND workspace_id=$2",
      [req.params.taskId, req.workspaceId]
    );
    if (!task.rows[0]) {
      await removeUploadedFile(req.file.path);
      return apiError(res, 404, "Task not found");
    }

    const result = await pool.query(
      `INSERT INTO task_attachments
        (organization_id,workspace_id,task_id,uploaded_by,original_name,storage_key,mime_type,byte_size)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING ${metadataColumns}`,
      [
        req.organizationId,
        req.workspaceId,
        req.params.taskId,
        req.user.id,
        originalName,
        path.basename(req.file.path),
        detectedMimeType,
        req.file.size,
      ]
    );
    return res.status(201).json({ success: true, attachment: result.rows[0] });
  } catch (error) {
    await removeUploadedFile(req.file.path);
    throw error;
  }
}

async function getAttachment(req) {
  const result = await pool.query(
    `SELECT a.id,a.uploaded_by,a.original_name,a.storage_key,a.mime_type,a.byte_size
     FROM task_attachments a
     JOIN tasks t ON t.id=a.task_id AND t.workspace_id=a.workspace_id
     JOIN workspaces w ON w.id=a.workspace_id AND w.organization_id=a.organization_id
     WHERE a.id=$1 AND a.task_id=$2 AND a.workspace_id=$3 AND a.organization_id=$4`,
    [req.params.attachmentId, req.params.taskId, req.workspaceId, req.organizationId]
  );
  return result.rows[0];
}

async function downloadAttachment(req, res) {
  const attachment = await getAttachment(req);
  if (!attachment) return apiError(res, 404, "Attachment not found");
  const filename = attachment.original_name.replace(/["\\\r\n]/g, "_");
  const asciiFilename = filename.replace(/[^\x20-\x7e]/g, "_");
  res.set({
    "Content-Type": attachment.mime_type,
    "Content-Length": attachment.byte_size,
    "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  return res.sendFile(attachment.storage_key, { root: storageDirectory() });
}

async function deleteAttachment(req, res) {
  const attachment = await getAttachment(req);
  if (!attachment) return apiError(res, 404, "Attachment not found");
  if (
    String(attachment.uploaded_by) !== String(req.user.id) &&
    !isManagerOrHigher(req.workspaceRole)
  ) {
    return apiError(res, 403, "Only the uploader or a manager can delete this attachment");
  }

  const result = await pool.query(
    `DELETE FROM task_attachments
     WHERE id=$1 AND task_id=$2 AND workspace_id=$3 AND organization_id=$4
     RETURNING storage_key`,
    [req.params.attachmentId, req.params.taskId, req.workspaceId, req.organizationId]
  );
  if (result.rows[0]) {
    try {
      await unlink(path.join(storageDirectory(), result.rows[0].storage_key));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return res.status(204).send();
}

async function removeStoredAttachmentFiles(storageKeys) {
  for (const storageKey of storageKeys) {
    try {
      await unlink(path.join(storageDirectory(), storageKey));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

module.exports = {
  createAttachment,
  deleteAttachment,
  downloadAttachment,
  listAttachments,
  receiveAttachment,
  removeStoredAttachmentFiles,
};
