const adminService = require('../services/admin.service');
const auditService = require('../services/audit.service');
const permissionService = require('../services/permission.service');
const emailService = require('../services/email.service');
const asyncHandler = require('../utils/asyncHandler');

// User Management
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await adminService.getAllUsers();
  res.status(200).json({ success: true, data: users });
});

const getUserById = asyncHandler(async (req, res) => {
  const data = await adminService.getUserById(req.params.id);
  res.status(200).json({ success: true, data });
});

const createUser = asyncHandler(async (req, res) => {
  const user = await adminService.createUser(req.body, req.user);

  let warning = null;
  try {
    await emailService.sendWelcomeEmail({
      fullName: user.name,
      email: user.email,
      password: req.body.password,
      role: user.role,
      adminUser: req.user,
      createdUserId: user.id
    });
  } catch (err) {
    warning = 'User created successfully. Unable to send welcome email.';
  }

  res.status(201).json({
    success: true,
    message: warning || 'User account created successfully and welcome email sent',
    data: user,
    ...(warning && { warning })
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await adminService.updateUser(req.params.id, req.body, req.user);
  res.status(200).json({ success: true, message: 'User updated successfully', data: user });
});

const suspendUser = asyncHandler(async (req, res) => {
  await adminService.suspendUser(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'User account suspended' });
});

const activateUser = asyncHandler(async (req, res) => {
  await adminService.activateUser(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'User account activated' });
});

const lockUser = asyncHandler(async (req, res) => {
  const { durationMinutes } = req.body;
  const result = await adminService.lockUser(req.params.id, durationMinutes, req.user);
  res.status(200).json({ success: true, message: `User account locked until ${result.lockedUntil.toISOString()}`, data: result });
});

const unlockUser = asyncHandler(async (req, res) => {
  await adminService.unlockUser(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'User account unlocked' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  await adminService.resetUserPassword(req.params.id, password, req.user);
  res.status(200).json({ success: true, message: 'User password reset completed' });
});

const forceLogout = asyncHandler(async (req, res) => {
  await adminService.forceLogoutUser(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'User sessions invalidated' });
});

// Role & Permission Management
const getPermissionMatrix = asyncHandler(async (req, res) => {
  const matrix = await permissionService.getFullMatrix();
  res.status(200).json({ success: true, data: matrix });
});

const updatePermission = asyncHandler(async (req, res) => {
  const { role, module, action, granted } = req.body;
  await permissionService.updatePermission(role, module, action, granted);
  res.status(200).json({ success: true, message: 'Permission matrix updated' });
});

// Audit Logs
const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, module, action, actorId, search, startDate, endDate } = req.query;
  const parsedPage = parseInt(page || '1', 10);
  const parsedLimit = parseInt(limit || '25', 10);

  const logs = await auditService.getAuditLogs({
    page: parsedPage,
    limit: parsedLimit,
    module,
    action,
    actorId,
    search,
    startDate,
    endDate
  });
  res.status(200).json({ success: true, data: logs });
});

// Security Center
const getSecurityOverview = asyncHandler(async (req, res) => {
  const data = await adminService.getSecurityOverview();
  res.status(200).json({ success: true, data });
});

const terminateSession = asyncHandler(async (req, res) => {
  await adminService.terminateSession(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Active session terminated successfully' });
});

// System Settings
const getSettings = asyncHandler(async (req, res) => {
  const settings = await adminService.getSystemSettings();
  res.status(200).json({ success: true, data: settings });
});

const updateSetting = asyncHandler(async (req, res) => {
  const { value } = req.body;
  await adminService.updateSystemSetting(req.params.key, value, req.user);
  res.status(200).json({ success: true, message: 'System configuration saved' });
});

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  suspendUser,
  activateUser,
  lockUser,
  unlockUser,
  resetPassword,
  forceLogout,
  getPermissionMatrix,
  updatePermission,
  getAuditLogs,
  getSecurityOverview,
  terminateSession,
  getSettings,
  updateSetting
};
