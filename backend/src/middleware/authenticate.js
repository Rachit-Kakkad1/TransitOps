const ApiError = require('../utils/ApiError');
const jwtUtil = require('../utils/jwt');
const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Please authenticate: JWT token is missing');
  }

  const token = authHeader.split(' ')[1];
  let decoded;

  try {
    decoded = jwtUtil.verifyToken(token);
  } catch (error) {
    throw new ApiError(401, error.message || 'JWT authentication failed');
  }

  if (!decoded || !decoded.sub) {
    throw new ApiError(401, 'JWT authentication failed: Invalid payload');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
  });

  if (!user) {
    throw new ApiError(401, 'User account no longer exists');
  }

  if (!user.isActive) {
    throw new ApiError(401, 'User account is inactive');
  }

  // Check if account is locked
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    throw new ApiError(401, 'Account is locked. Please try again later.');
  }

  // Attach safe user object to request
  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };

  // Attach client metadata for audit logging
  req.clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  req.clientUserAgent = req.headers['user-agent'] || 'unknown';

  next();
});

module.exports = authenticate;
