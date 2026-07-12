/**
 * Audit Logging Service — Immutable append-only audit trail
 * Every admin action and significant system event is recorded here.
 * No delete or update operations are exposed.
 */

const prisma = require('../config/db');

/**
 * Log an action to the audit trail.
 * @param {Object} params
 * @param {Object} params.actor - { id, email, role }
 * @param {string} params.module - e.g. 'Users', 'Vehicles', 'Trips'
 * @param {string} params.action - e.g. 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'
 * @param {string} [params.entityType] - e.g. 'User', 'Vehicle'
 * @param {string} [params.entityId]
 * @param {*} [params.oldValue] - Previous state (JSON-serializable)
 * @param {*} [params.newValue] - New state (JSON-serializable)
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 * @param {string} [params.status] - 'SUCCESS' | 'FAILURE'
 * @param {string} [params.description] - Human-readable description
 */
async function logAction({
  actor,
  module,
  action,
  entityType = null,
  entityId = null,
  oldValue = null,
  newValue = null,
  ipAddress = null,
  userAgent = null,
  status = 'SUCCESS',
  description = null
}) {
  try {
    await prisma.$executeRaw`
      INSERT INTO public.audit_logs
        (id, "timestamp", actor_id, actor_email, actor_role, module, action,
         entity_type, entity_id, old_value, new_value, ip_address, user_agent,
         status, description)
      VALUES (
        gen_random_uuid(), NOW(),
        ${actor.id}::uuid, ${actor.email}, ${actor.role},
        ${module}, ${action},
        ${entityType}, ${entityId},
        ${oldValue ? JSON.stringify(oldValue) : null}::jsonb,
        ${newValue ? JSON.stringify(newValue) : null}::jsonb,
        ${ipAddress}, ${userAgent},
        ${status}, ${description}
      )
    `;
  } catch (err) {
    // Never let audit logging failures crash the main operation
    console.error('[AUDIT] Failed to write audit log:', err.message);
  }
}

/**
 * Query audit logs with pagination and filters.
 */
async function getAuditLogs({ page = 1, limit = 25, module, action, actorId, search, startDate, endDate } = {}) {
  const offset = (page - 1) * limit;

  // Build WHERE clauses dynamically
  const conditions = [];
  const params = [];

  if (module) {
    conditions.push(`module = $${params.length + 1}`);
    params.push(module);
  }
  if (action) {
    conditions.push(`action = $${params.length + 1}`);
    params.push(action);
  }
  if (actorId) {
    conditions.push(`actor_id = $${params.length + 1}::uuid`);
    params.push(actorId);
  }
  if (search) {
    conditions.push(`(description ILIKE $${params.length + 1} OR actor_email ILIKE $${params.length + 1} OR entity_type ILIKE $${params.length + 1})`);
    params.push(`%${search}%`);
  }
  if (startDate) {
    conditions.push(`"timestamp" >= $${params.length + 1}::timestamptz`);
    params.push(startDate);
  }
  if (endDate) {
    conditions.push(`"timestamp" <= $${params.length + 1}::timestamptz`);
    params.push(endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM public.audit_logs ${whereClause}`;
  const dataQuery = `SELECT * FROM public.audit_logs ${whereClause} ORDER BY "timestamp" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const countResult = await prisma.$queryRawUnsafe(countQuery, ...params);
  const logs = await prisma.$queryRawUnsafe(dataQuery, ...params, limit, offset);

  return {
    logs,
    pagination: {
      page,
      limit,
      total: Number(countResult[0]?.total || 0),
      totalPages: Math.ceil(Number(countResult[0]?.total || 0) / limit)
    }
  };
}

module.exports = {
  logAction,
  getAuditLogs,
};
