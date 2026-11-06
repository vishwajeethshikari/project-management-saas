
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Project Management API is running",
  });
});
app.get("/", (req, res) => {
  res.send("Project Management SaaS API");
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error("Unhandled API request error:", error.name);
  return res.status(500).json({
    success: false,
    message: "An unexpected error occurred",
  });
});

module.exports = app;
