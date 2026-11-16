function redactLogText(value) {
  return String(value || "")
    .replace(/((?:postgres(?:ql)?|https?):\/\/[^:/\s]+:)[^@\s]+@/gi, "$1[REDACTED]@")
    .replace(/((?:password|secret|token|api[_-]?key)\s*[=:]\s*)("[^\"]*"|'[^']*'|[^\s,;]+)/gi, "$1[REDACTED]");
}

function logError(context, error) {
  const details = {
    name: error?.name || "Error",
    ...(error?.code ? { code: error.code } : {}),
    message: redactLogText(error?.message || error),
    ...(error?.stack ? { stack: redactLogText(error.stack) } : {}),
  };
  console.error(`${context}: ${JSON.stringify(details)}`);
}

module.exports = { logError, redactLogText };
