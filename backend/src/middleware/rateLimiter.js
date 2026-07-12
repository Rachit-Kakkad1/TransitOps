const rateLimit = require('express-rate-limit');

const loginRateLimiter = (req, res, next) => {
  next();
};

module.exports = {
  loginRateLimiter,
};
