module.exports = function validateIds(paramNames) {
  return (req, res, next) => {
    for (const name of paramNames) {
      if (!/^\d+$/.test(String(req.params[name] || ""))) {
        return res.status(400).json({ success: false, message: `Invalid ${name}` });
      }
    }
    return next();
  };
};
