/**
 * Granular Permission Middleware
 * Checks the enterprise permission matrix for non-ADMIN roles.
 * ADMIN always passes immediately.
 */

const ApiError = require('../utils/ApiError');
const permissionService = require('../services/permission.service');

const checkPermission = (module, action) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Unauthorized: Authentication required'));
    }

    // ADMIN bypasses all permission checks
    if (req.user.role === 'ADMIN') {
      return next();
    }

    try {
      const allowed = await permissionService.checkPermission(req.user.role, module, action);
      if (!allowed) {
        return next(new ApiError(403, `Permission denied: ${module}.${action}`));
      }
      next();
    } catch (err) {
      return next(new ApiError(500, 'Permission check failed'));
    }
  };
};

module.exports = checkPermission;
