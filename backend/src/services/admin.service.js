const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const auditService = require('./audit.service');
const permissionService = require('./permission.service');

/**
 * Get all users from the system view.
 */
async function getAllUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Get detailed user record, including login sessions and recent actions.
 */
async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id }
  });
  if (!user) throw new ApiError(404, 'User not found');

  const sessions = await prisma.activeSession.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return { user, sessions };
}

/**
 * Create a new user account.
 * Inserts into auth.users (authentication credentials) and public.profiles (application metadata).
 */
async function createUser(userData, actor) {
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(userData.password, 10);
  const email = userData.email.trim().toLowerCase();

  // Run database transactions to ensure consistency
  await prisma.$transaction(async (tx) => {
    // 1. Insert into auth.users
    await tx.$executeRawUnsafe(
      `INSERT INTO auth.users (id, email, encrypted_password, aud, role, created_at, updated_at, email_confirmed_at)
       VALUES ($1::uuid, $2, $3, 'authenticated', 'authenticated', NOW(), NOW(), NOW())`,
      id, email, passwordHash
    );

    // 2. Insert into public.profiles
    await tx.$executeRawUnsafe(
      `INSERT INTO public.profiles (id, full_name, role, failed_login_attempts, locked_until, created_at)
       VALUES ($1::uuid, $2, $3::public.user_role, 0, NULL, NOW())`,
      id, userData.name, userData.role.toLowerCase()
    );
  });

  const createdUser = { id, name: userData.name, email, role: userData.role };

  await auditService.logAction({
    actor,
    module: 'Users',
    action: 'CREATE',
    entityType: 'User',
    entityId: id,
    newValue: createdUser,
    description: `Created new user: ${email} with role ${userData.role}`
  });

  return createdUser;
}

/**
 * Update user details.
 */
async function updateUser(id, updateData, actor) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, 'User not found');

  await prisma.$transaction(async (tx) => {
    if (updateData.name || updateData.role) {
      await tx.$executeRawUnsafe(
        `UPDATE public.profiles
         SET full_name = COALESCE($1, full_name),
             role = COALESCE($2::public.user_role, role)
         WHERE id = $3::uuid`,
        updateData.name || null,
        updateData.role ? updateData.role.toLowerCase() : null,
        id
      );
    }

    if (updateData.email) {
      const newEmail = updateData.email.trim().toLowerCase();
      await tx.$executeRawUnsafe(
        `UPDATE auth.users
         SET email = $1,
             updated_at = NOW()
         WHERE id = $2::uuid`,
        newEmail, id
      );
    }
  });

  const updatedUser = await prisma.user.findUnique({ where: { id } });

  await auditService.logAction({
    actor,
    module: 'Users',
    action: 'UPDATE',
    entityType: 'User',
    entityId: id,
    oldValue: user,
    newValue: updatedUser,
    description: `Updated profile details for user ${user.email}`
  });

  return updatedUser;
}

/**
 * Suspend/deactivate user account.
 */
async function suspendUser(id, actor) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, 'User not found');

  // Since public.profiles doesn't have is_active, deactivating is represented by a permanent lockout
  const farFuture = new Date('9999-12-31T23:59:59.000Z');
  await prisma.$executeRawUnsafe(
    `UPDATE public.profiles SET locked_until = $1 WHERE id = $2::uuid`,
    farFuture, id
  );

  // Invalidate any active sessions immediately
  await prisma.$executeRawUnsafe(
    `UPDATE public.active_sessions SET is_active = false WHERE user_id = $1::uuid`,
    id
  );

  await auditService.logAction({
    actor,
    module: 'Users',
    action: 'SUSPEND',
    entityType: 'User',
    entityId: id,
    description: `Suspended user account: ${user.email}`
  });

  return { success: true };
}

/**
 * Activate suspended user account.
 */
async function activateUser(id, actor) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, 'User not found');

  await prisma.$executeRawUnsafe(
    `UPDATE public.profiles SET locked_until = NULL, failed_login_attempts = 0 WHERE id = $1::uuid`,
    id
  );

  await auditService.logAction({
    actor,
    module: 'Users',
    action: 'ACTIVATE',
    entityType: 'User',
    entityId: id,
    description: `Activated user account: ${user.email}`
  });

  return { success: true };
}

/**
 * Lock user account manually.
 */
async function lockUser(id, durationMinutes, actor) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, 'User not found');

  const lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
  await prisma.$executeRawUnsafe(
    `UPDATE public.profiles SET locked_until = $1, updated_at = NOW() WHERE id = $2::uuid`,
    lockedUntil, id
  );

  await auditService.logAction({
    actor,
    module: 'Security',
    action: 'LOCK_USER',
    entityType: 'User',
    entityId: id,
    description: `Locked account manually for ${durationMinutes} minutes: ${user.email}`
  });

  return { success: true, lockedUntil };
}

/**
 * Unlock account manually.
 */
async function unlockUser(id, actor) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, 'User not found');

  await prisma.$executeRawUnsafe(
    `UPDATE public.profiles SET locked_until = NULL, failed_login_attempts = 0, updated_at = NOW() WHERE id = $1::uuid`,
    id
  );

  await auditService.logAction({
    actor,
    module: 'Security',
    action: 'UNLOCK_USER',
    entityType: 'User',
    entityId: id,
    description: `Unlocked user account manually: ${user.email}`
  });

  return { success: true };
}

/**
 * Force update password.
 */
async function resetUserPassword(id, newPassword, actor) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, 'User not found');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.$executeRawUnsafe(
    `UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2::uuid`,
    passwordHash, id
  );

  await auditService.logAction({
    actor,
    module: 'Security',
    action: 'RESET_PASSWORD',
    entityType: 'User',
    entityId: id,
    description: `Forced password reset for user: ${user.email}`
  });

  return { success: true };
}

/**
 * Force logout user (invalidates active sessions).
 */
async function forceLogoutUser(id, actor) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, 'User not found');

  await prisma.$executeRawUnsafe(
    `UPDATE public.active_sessions SET is_active = false WHERE user_id = $1::uuid`,
    id
  );

  await auditService.logAction({
    actor,
    module: 'Security',
    action: 'FORCE_LOGOUT',
    entityType: 'User',
    entityId: id,
    description: `Forced active sessions expiration for user: ${user.email}`
  });

  return { success: true };
}

/**
 * Security center overview KPIs.
 */
async function getSecurityOverview() {
  const [lockedAccountsCount, activeSessionsCount, failedLoginsRow] = await Promise.all([
    prisma.user.count({ where: { lockedUntil: { gt: new Date() } } }),
    prisma.activeSession.count({ where: { isActive: true } }),
    prisma.$queryRaw`SELECT SUM(failed_login_attempts) as total FROM public.profiles`
  ]);

  const activeSessions = await prisma.activeSession.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  // Pull matching user info for active sessions
  const users = await prisma.user.findMany({
    where: { id: { in: activeSessions.map(s => s.userId) } },
    select: { id: true, name: true, email: true, role: true }
  });

  const sessionDetails = activeSessions.map(s => {
    const u = users.find(user => user.id === s.userId);
    return {
      id: s.id,
      userId: s.userId,
      name: u ? u.name : 'Unknown User',
      email: u ? u.email : 'Unknown Email',
      role: u ? u.role : 'Unknown Role',
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      device: s.device,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt
    };
  });

  return {
    lockedAccounts: lockedAccountsCount,
    activeSessionsCount,
    totalFailedAttempts: Number(failedLoginsRow[0]?.total || 0),
    activeSessions: sessionDetails
  };
}

/**
 * Terminate specific active user session.
 */
async function terminateSession(sessionId, actor) {
  const session = await prisma.activeSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new ApiError(404, 'Session not found');

  await prisma.activeSession.update({
    where: { id: sessionId },
    data: { isActive: false }
  });

  await auditService.logAction({
    actor,
    module: 'Security',
    action: 'TERMINATE_SESSION',
    description: `Terminated session ID ${sessionId}`
  });

  return { success: true };
}

/**
 * System settings config list.
 */
async function getSystemSettings() {
  return prisma.systemSetting.findMany();
}

/**
 * Update system settings by key.
 */
async function updateSystemSetting(key, value, actor) {
  const oldValue = await prisma.systemSetting.findUnique({ where: { key } });

  await prisma.systemSetting.upsert({
    where: { key },
    update: { value, updatedBy: actor.id, updatedAt: new Date() },
    create: { key, value, updatedBy: actor.id }
  });

  await auditService.logAction({
    actor,
    module: 'Settings',
    action: 'UPDATE_SETTING',
    oldValue: oldValue ? oldValue.value : null,
    newValue: value,
    description: `Updated system setting: ${key}`
  });

  return { success: true };
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  suspendUser,
  activateUser,
  lockUser,
  unlockUser,
  resetUserPassword,
  forceLogoutUser,
  getSecurityOverview,
  terminateSession,
  getSystemSettings,
  updateSystemSetting
};
