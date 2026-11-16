module.exports = function validateIds(paramNames) {
  return (req, res, next) => {
    for (const name of paramNames) {
      const value = String(req.params[name] || "");
      if (!/^\d+$/.test(value) || BigInt(value) < 1n || BigInt(value) > 9223372036854775807n) {
        return res.status(400).json({ success: false, message: `Invalid ${name}` });
      }
    }
    return next();
  };
};
