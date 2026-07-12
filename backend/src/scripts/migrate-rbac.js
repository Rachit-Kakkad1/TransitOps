/**
 * RBAC Database Migration Script
 * Creates audit_logs, permissions, active_sessions, system_settings tables
 * and seeds the default enterprise permission matrix.
 *
 * Usage: node src/scripts/migrate-rbac.js
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── DDL: Create Tables ──────────────────────────────────────────────

const DDL_STATEMENTS = [
  // Audit Logs — immutable append-only ledger
  `CREATE TABLE IF NOT EXISTS public.audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "timestamp"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id      UUID NOT NULL,
    actor_email   TEXT NOT NULL,
    actor_role    TEXT NOT NULL,
    module        TEXT NOT NULL,
    action        TEXT NOT NULL,
    entity_type   TEXT,
    entity_id     TEXT,
    old_value     JSONB,
    new_value     JSONB,
    ip_address    TEXT,
    user_agent    TEXT,
    status        TEXT DEFAULT 'SUCCESS',
    description   TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs("timestamp" DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module)`,

  // Permissions — enterprise RBAC matrix
  `CREATE TABLE IF NOT EXISTS public.permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role        TEXT NOT NULL,
    module      TEXT NOT NULL,
    action      TEXT NOT NULL,
    granted     BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, module, action)
  )`,

  // Active Sessions — JWT session tracking
  `CREATE TABLE IF NOT EXISTS public.active_sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL,
    token_hash   TEXT NOT NULL,
    ip_address   TEXT,
    user_agent   TEXT,
    device       TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL,
    is_active    BOOLEAN DEFAULT true
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.active_sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.active_sessions(is_active)`,

  // System Settings — key-value configuration store
  `CREATE TABLE IF NOT EXISTS public.system_settings (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL,
    updated_by  UUID,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
  )`
];

// ─── Permission Matrix Seed Data ─────────────────────────────────────

const MODULES = [
  'Users', 'Roles', 'Vehicles', 'Drivers', 'Trips', 'Dispatch',
  'Maintenance', 'Expenses', 'Fuel', 'Analytics', 'Reports',
  'Notifications', 'AuditLogs', 'Settings', 'Security'
];

const ACTIONS = ['view', 'create', 'update', 'delete', 'approve', 'assign', 'export'];

const ROLES = ['ADMIN', 'FLEET_MANAGER', 'DISPATCHER', 'DRIVER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'];

// Operational role permissions — only what they need
const ROLE_PERMISSIONS = {
  FLEET_MANAGER: {
    Vehicles:     ['view', 'create', 'update', 'export'],
    Drivers:      ['view', 'assign', 'export'],
    Trips:        ['view', 'create', 'update', 'assign', 'export'],
    Maintenance:  ['view', 'create', 'update', 'approve', 'export'],
    Expenses:     ['view', 'export'],
    Reports:      ['view', 'export'],
    Analytics:    ['view'],
    Notifications:['view'],
  },
  DISPATCHER: {
    Trips:        ['view', 'create', 'update', 'assign'],
    Dispatch:     ['view', 'create', 'update', 'assign'],
    Vehicles:     ['view'],
    Drivers:      ['view'],
    Notifications:['view'],
  },
  DRIVER: {
    Trips:        ['view'],
    Vehicles:     ['view'],
    Expenses:     ['view', 'create'],
    Notifications:['view'],
  },
  SAFETY_OFFICER: {
    Drivers:      ['view', 'update', 'export'],
    Vehicles:     ['view'],
    Trips:        ['view'],
    Reports:      ['view', 'export'],
    Analytics:    ['view'],
    Notifications:['view'],
  },
  FINANCIAL_ANALYST: {
    Expenses:     ['view', 'create', 'update', 'approve', 'export'],
    Fuel:         ['view', 'export'],
    Trips:        ['view'],
    Vehicles:     ['view'],
    Maintenance:  ['view'],
    Reports:      ['view', 'export'],
    Analytics:    ['view', 'export'],
    Notifications:['view'],
  },
};

// Default system settings
const DEFAULT_SETTINGS = [
  { key: 'company_name', value: JSON.stringify('TransitOps') },
  { key: 'session_timeout_minutes', value: JSON.stringify(30) },
  { key: 'max_failed_login_attempts', value: JSON.stringify(5) },
  { key: 'lockout_duration_minutes', value: JSON.stringify(15) },
  { key: 'password_min_length', value: JSON.stringify(8) },
  { key: 'require_uppercase', value: JSON.stringify(true) },
  { key: 'require_special_char', value: JSON.stringify(false) },
  { key: 'app_version', value: JSON.stringify('1.0.0') },
];

// ─── Main Migration ──────────────────────────────────────────────────

async function runMigration() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   TransitOps RBAC Database Migration        ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  try {
    // 1. Run DDL statements
    console.log('[1/4] Creating tables and indexes...');
    for (const sql of DDL_STATEMENTS) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.log('      ✓ Tables created successfully\n');

    // 2. Seed ADMIN permissions (full access to everything)
    console.log('[2/4] Seeding ADMIN permissions (full access)...');
    let adminCount = 0;
    for (const mod of MODULES) {
      for (const act of ACTIONS) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO public.permissions (id, role, module, action, granted)
          VALUES (gen_random_uuid(), 'ADMIN', '${mod}', '${act}', true)
          ON CONFLICT (role, module, action) DO NOTHING
        `);
        adminCount++;
      }
    }
    console.log(`      ✓ ${adminCount} ADMIN permissions seeded\n`);

    // 3. Seed operational role permissions
    console.log('[3/4] Seeding operational role permissions...');
    let opCount = 0;
    for (const [role, modules] of Object.entries(ROLE_PERMISSIONS)) {
      for (const [mod, actions] of Object.entries(modules)) {
        for (const act of actions) {
          await prisma.$executeRawUnsafe(`
            INSERT INTO public.permissions (id, role, module, action, granted)
            VALUES (gen_random_uuid(), '${role}', '${mod}', '${act}', true)
            ON CONFLICT (role, module, action) DO NOTHING
          `);
          opCount++;
        }
      }
      // Also add denied entries for all un-granted module/action combos
      for (const mod of MODULES) {
        for (const act of ACTIONS) {
          const granted = modules[mod]?.includes(act) || false;
          if (!granted) {
            await prisma.$executeRawUnsafe(`
              INSERT INTO public.permissions (id, role, module, action, granted)
              VALUES (gen_random_uuid(), '${role}', '${mod}', '${act}', false)
              ON CONFLICT (role, module, action) DO NOTHING
            `);
          }
        }
      }
    }
    console.log(`      ✓ ${opCount} operational permissions seeded\n`);

    // 4. Seed default system settings
    console.log('[4/4] Seeding default system settings...');
    for (const setting of DEFAULT_SETTINGS) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO public.system_settings (key, value)
        VALUES ('${setting.key}', '${setting.value}'::jsonb)
        ON CONFLICT (key) DO NOTHING
      `);
    }
    console.log(`      ✓ ${DEFAULT_SETTINGS.length} settings seeded\n`);

    console.log('═══════════════════════════════════════════════');
    console.log('  Migration completed successfully!');
    console.log('═══════════════════════════════════════════════');

  } catch (error) {
    console.error('\n[ERROR] Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
