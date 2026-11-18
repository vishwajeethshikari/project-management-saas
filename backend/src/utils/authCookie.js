const AUTH_COOKIE_NAME = "projectflow_session";

function authCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
}

function getRequestToken(req) {
  const authorization = req.get("authorization");
  const bearerMatch = authorization && authorization.match(/^Bearer\s+(\S+)$/i);
  if (bearerMatch) return bearerMatch[1];

  const cookies = req.get("cookie") || "";
  const cookie = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));

  return cookie ? cookie.slice(AUTH_COOKIE_NAME.length + 1) : null;
}

function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions());
}

module.exports = { clearAuthCookie, getRequestToken, setAuthCookie };
