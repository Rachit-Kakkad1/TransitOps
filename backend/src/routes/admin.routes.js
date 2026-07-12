const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/admin.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  validate,
  createUserSchema,
  updateUserSchema,
  lockUserSchema,
  resetPasswordSchema,
  updateSettingSchema
} = require('../validators/admin.validator');

// All routes here require ADMIN role authentication
router.use(authenticate, authorize('ADMIN'));

// User Management
router.get('/admin/users', ctrl.getAllUsers);
router.post('/admin/users', validate(createUserSchema), ctrl.createUser);
router.get('/admin/users/:id', ctrl.getUserById);
router.put('/admin/users/:id', validate(updateUserSchema), ctrl.updateUser);
router.post('/admin/users/:id/suspend', ctrl.suspendUser);
router.post('/admin/users/:id/activate', ctrl.activateUser);
router.post('/admin/users/:id/lock', validate(lockUserSchema), ctrl.lockUser);
router.post('/admin/users/:id/unlock', ctrl.unlockUser);
router.post('/admin/users/:id/reset-password', validate(resetPasswordSchema), ctrl.resetPassword);
router.post('/admin/users/:id/force-logout', ctrl.forceLogout);

// Role & Permission Management
router.get('/admin/permissions', ctrl.getPermissionMatrix);
router.put('/admin/permissions', ctrl.updatePermission);

// Audit Logs
router.get('/admin/audit-logs', ctrl.getAuditLogs);

// Security Center
router.get('/admin/security/overview', ctrl.getSecurityOverview);
router.delete('/admin/security/sessions/:id', ctrl.terminateSession);

// System Settings
router.get('/admin/settings', ctrl.getSettings);
router.put('/admin/settings/:key', validate(updateSettingSchema), ctrl.updateSetting);

module.exports = router;
