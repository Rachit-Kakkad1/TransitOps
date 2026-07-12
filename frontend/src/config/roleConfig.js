// TransitOps Role-Based Access Control Configuration

export const ROLES = {
  FLEET_MANAGER: 'FLEET_MANAGER',
  DISPATCHER: 'DISPATCHER',
  DRIVER: 'DRIVER',
  SAFETY_OFFICER: 'SAFETY_OFFICER',
  FINANCIAL_ANALYST: 'FINANCIAL_ANALYST',
  ADMIN: 'ADMIN',
};

const DISPLAY_NAMES = {
  [ROLES.FLEET_MANAGER]: 'Fleet Manager',
  [ROLES.DISPATCHER]: 'Dispatcher',
  [ROLES.DRIVER]: 'Driver',
  [ROLES.SAFETY_OFFICER]: 'Safety Officer',
  [ROLES.FINANCIAL_ANALYST]: 'Financial Analyst',
  [ROLES.ADMIN]: 'System Administrator',
};

const roleConfig = {
  [ROLES.FLEET_MANAGER]: {
    title: DISPLAY_NAMES[ROLES.FLEET_MANAGER],
    sidebarItems: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { path: '/vehicles', label: 'Vehicles', icon: 'Truck' },
      { path: '/trips', label: 'Trips', icon: 'Navigation' },
      { path: '/maintenance', label: 'Maintenance', icon: 'Wrench' },
      { path: '/drivers', label: 'Drivers', icon: 'Users' }
    ]
  },
  [ROLES.DISPATCHER]: {
    title: DISPLAY_NAMES[ROLES.DISPATCHER],
    sidebarItems: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { path: '/trips', label: 'Trips', icon: 'Navigation' }
    ]
  },
  [ROLES.DRIVER]: {
    title: DISPLAY_NAMES[ROLES.DRIVER],
    sidebarItems: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' }
    ]
  },
  [ROLES.SAFETY_OFFICER]: {
    title: DISPLAY_NAMES[ROLES.SAFETY_OFFICER],
    sidebarItems: [
      { path: '/dashboard', label: 'Safety Overview', icon: 'LayoutDashboard' },
      { path: '/drivers', label: 'Driver Compliance', icon: 'Users' },
      { path: '/trips', label: 'Trip Safety Engine', icon: 'Truck' }
    ]
  },
  [ROLES.FINANCIAL_ANALYST]: {
    title: DISPLAY_NAMES[ROLES.FINANCIAL_ANALYST],
    sidebarItems: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { path: '/analytics', label: 'Expenses & ROI', icon: 'DollarSign' }
    ]
  },
  [ROLES.ADMIN]: {
    title: DISPLAY_NAMES[ROLES.ADMIN],
    sidebarItems: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { path: '/admin/users', label: 'User Management', icon: 'Users' },
      { path: '/admin/permissions', label: 'Permissions Matrix', icon: 'Shield' },
      { path: '/admin/audit', label: 'Audit Logging', icon: 'FileText' },
      { path: '/admin/security', label: 'Security Center', icon: 'Key' },
      { path: '/admin/settings', label: 'System Settings', icon: 'Settings' }
    ]
  }
};

export function getRoleConfig(role) {
  return roleConfig[role] || roleConfig[ROLES.FLEET_MANAGER];
}

export function getRoleTitle(role) {
  return DISPLAY_NAMES[role] || 'User';
}
