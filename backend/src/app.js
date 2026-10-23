
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Project Management API is running",
  });
});
app.get("/", (req, res) => {
  res.send("Project Management SaaS API");
});
module.exports = app;
