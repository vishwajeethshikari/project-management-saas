
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const collaborationRoutes = require("./routes/collaborationRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const pool = require("./config/db");
const { logError } = require("./utils/errorLogging");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (process.env.NODE_ENV !== "production") {
    try {
      const parsed = new URL(origin);
      if (
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "::1" ||
        parsed.hostname.startsWith("192.168.") ||
        parsed.hostname.startsWith("10.") ||
        parsed.hostname.endsWith(".local")
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/workspaces", projectRoutes);
app.use("/api/workspaces", taskRoutes);
app.use("/api/workspaces", collaborationRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Project Management API is running",
  });
});
app.get("/api/ready", async (req, res, next) => {
  try {
    await pool.query("SELECT 1");
    return res.status(200).json({
      success: true,
      message: "API and PostgreSQL are ready",
    });
  } catch (error) {
    return next(error);
  }
});
app.get("/", (req, res) => {
  res.send("Project Management SaaS API");
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error && error.message && error.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      message: error.message,
    });
  }

  logError("Unhandled API request error", error);
  return res.status(500).json({
    success: false,
    message: "An unexpected error occurred",
  });
});

module.exports = app;
