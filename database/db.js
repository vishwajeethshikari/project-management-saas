const path = require("node:path");
const { createRequire } = require("node:module");
const backendRequire = createRequire(
  path.resolve(__dirname, "../backend/package.json")
);

backendRequire("dotenv").config({
  path: path.resolve(__dirname, "../backend/.env"),
});

module.exports = backendRequire("./src/config/db");