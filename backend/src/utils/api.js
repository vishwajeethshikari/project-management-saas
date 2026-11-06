const apiError = (res, status, message, errors) => res.status(status).json({
  success: false,
  message,
  ...(errors ? { errors } : {}),
});

const validationError = (res, error) => apiError(
  res,
  400,
  "Invalid request data",
  error.issues.map(({ path, message }) => ({ field: path.join("."), message }))
);

module.exports = { apiError, validationError };
