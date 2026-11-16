const { getRequestToken } = require("../utils/authCookie");
const authenticateToken = require("./authenticateToken");

module.exports = function optionalAuthenticateToken(req, res, next) {
  if (!getRequestToken(req)) return next();
  return authenticateToken(req, res, next);
};
