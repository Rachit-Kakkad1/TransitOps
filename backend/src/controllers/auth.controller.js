const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Pass client metadata for audit logging and session tracking
  const meta = {
    ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    device: req.headers['user-agent']?.includes('Mobile') ? 'Mobile' : 'Desktop',
  };

  const result = await authService.login(email, password, meta);

  res.status(200).json({
    success: true,
    message: 'Authentication successful',
    data: result,
  });
});

const me = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  // If user is authenticated, invalidate their session
  if (req.user) {
    const auditService = require('../services/audit.service');
    await auditService.logAction({
      actor: { id: req.user.id, email: req.user.email, role: req.user.role },
      module: 'Security',
      action: 'LOGOUT',
      entityType: 'User',
      entityId: req.user.id,
      description: `User ${req.user.email} logged out`,
      ipAddress: req.clientIp,
      userAgent: req.clientUserAgent,
      status: 'SUCCESS'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Logout successful. Client must discard access token.',
  });
});

module.exports = {
  login,
  me,
  logout,
};
