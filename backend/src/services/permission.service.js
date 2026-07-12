/**
 * Permission Service — Enterprise RBAC permission matrix
 */

const prisma = require('../config/db');

/**
 * Check if a role has a specific permission.
 * ADMIN always returns true (bypasses the matrix).
 */
async function checkPermission(role, module, action) {
  if (role === 'ADMIN') return true;

  const result = await prisma.$queryRawUnsafe(
    `SELECT granted FROM public.permissions WHERE role = $1 AND module = $2 AND action = $3 LIMIT 1`,
    role, module, action
  );

  return result.length > 0 && result[0].granted === true;
}

/**
 * Get full permission matrix for a specific role.
 */
async function getPermissionsByRole(role) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT module, action, granted FROM public.permissions WHERE role = $1 ORDER BY module, action`,
    role
  );
  return rows;
}

/**
 * Get the entire permission matrix (all roles).
 */
async function getFullMatrix() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT role, module, action, granted FROM public.permissions ORDER BY role, module, action`
  );

  // Group by role -> module -> action
  const matrix = {};
  for (const row of rows) {
    if (!matrix[row.role]) matrix[row.role] = {};
    if (!matrix[row.role][row.module]) matrix[row.role][row.module] = {};
    matrix[row.role][row.module][row.action] = row.granted;
  }
  return matrix;
}

/**
 * Update a single permission entry.
 */
async function updatePermission(role, module, action, granted) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.permissions (id, role, module, action, granted, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
     ON CONFLICT (role, module, action)
     DO UPDATE SET granted = $4, updated_at = NOW()`,
    role, module, action, granted
  );
}

/**
 * Batch update permissions for a role.
 */
async function batchUpdatePermissions(role, permissions) {
  for (const perm of permissions) {
    await updatePermission(role, perm.module, perm.action, perm.granted);
  }
}

module.exports = {
  checkPermission,
  getPermissionsByRole,
  getFullMatrix,
  updatePermission,
  batchUpdatePermissions,
};
