const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/db');
const jwtUtil = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const auditService = require('./audit.service');

const login = async (email, password, meta = {}) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    // Log failed login attempt for non-existent user
    await auditService.logAction({
      actor: { id: '00000000-0000-0000-0000-000000000000', email: normalizedEmail, role: 'UNKNOWN' },
      module: 'Security',
      action: 'LOGIN_FAILED',
      description: `Failed login attempt for non-existent email: ${normalizedEmail}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      status: 'FAILURE'
    });
    throw new ApiError(401, 'Invalid credentials. Account locked after 5 failed attempts.');
  }

  if (!user.isActive) {
    throw new ApiError(401, 'User account is inactive');
  }

  // Check if account is locked
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    throw new ApiError(401, 'Account locked due to 5 failed attempts. Please try again later.');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const newAttempts = user.failedLoginAttempts + 1;
    if (newAttempts >= 5) {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await prisma.$executeRaw`
        UPDATE public.profiles
        SET failed_login_attempts = 0,
            locked_until = ${lockedUntil}
        WHERE id = ${user.id}::uuid
      `;
      await auditService.logAction({
        actor: { id: user.id, email: user.email, role: user.role },
        module: 'Security',
        action: 'ACCOUNT_LOCKED',
        entityType: 'User',
        entityId: user.id,
        description: `Account locked after 5 failed login attempts`,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        status: 'FAILURE'
      });
      throw new ApiError(401, 'Account locked due to 5 failed attempts. Please try again later.');
    } else {
      await prisma.$executeRaw`
        UPDATE public.profiles
        SET failed_login_attempts = ${newAttempts}
        WHERE id = ${user.id}::uuid
      `;
      await auditService.logAction({
        actor: { id: user.id, email: user.email, role: user.role },
        module: 'Security',
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        description: `Failed login attempt (${newAttempts}/5)`,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        status: 'FAILURE'
      });
      throw new ApiError(401, 'Invalid credentials. Account locked after 5 failed attempts.');
    }
  }

  // Reset failed login attempts on success
  await prisma.$executeRaw`
    UPDATE public.profiles
    SET failed_login_attempts = 0,
        locked_until = NULL
    WHERE id = ${user.id}::uuid
  `;

  const accessToken = jwtUtil.generateToken({
    sub: user.id,
    role: user.role,
  });

  // Track active session
  const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // match JWT_ACCESS_EXPIRES_IN default

  try {
    await prisma.$executeRaw`
      INSERT INTO public.active_sessions (id, user_id, token_hash, ip_address, user_agent, device, expires_at)
      VALUES (gen_random_uuid(), ${user.id}::uuid, ${tokenHash}, ${meta.ipAddress || null}, ${meta.userAgent || null}, ${meta.device || null}, ${expiresAt})
    `;
  } catch (err) {
    // Session tracking failure should not break login
    console.error('[SESSION] Failed to track session:', err.message);
  }

  // Log successful login
  await auditService.logAction({
    actor: { id: user.id, email: user.email, role: user.role },
    module: 'Security',
    action: 'LOGIN',
    entityType: 'User',
    entityId: user.id,
    description: `User ${user.email} logged in successfully`,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    status: 'SUCCESS'
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    accessToken,
  };
};

module.exports = {
  login,
};
