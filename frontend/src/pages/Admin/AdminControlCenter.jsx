import { useState, useEffect } from 'react';
import { 
  Users, Shield, FileText, Settings, Key, UserCheck, UserMinus, 
  Lock, Unlock, Plus, Search, Power, AlertTriangle, ShieldCheck, 
  Terminal, Globe, Laptop, RefreshCw 
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import StatusChip from '../../components/ui/StatusChip';
import './AdminControlCenter.css';

export default function AdminControlCenter({ tab = 'users', hideTabs = false }) {
  const [activeTab, setActiveTab] = useState(tab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Data States
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [securityData, setSecurityData] = useState({ lockedAccounts: 0, activeSessionsCount: 0, totalFailedAttempts: 0, activeSessions: [] });
  const [settings, setSettings] = useState([]);
  const [permissionMatrix, setPermissionMatrix] = useState({});

  // Form / Modal States
  const [searchQuery, setSearchQuery] = useState('');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'FLEET_MANAGER' });

  // Pagination & Filters for Audit Logs
  const [auditFilter, setAuditFilter] = useState({ module: '', action: '', search: '', page: 1 });
  const [auditPagination, setAuditPagination] = useState({ totalPages: 1, page: 1 });

  useEffect(() => {
    setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    loadTabData();
  }, [activeTab, auditFilter.page, auditFilter.module, auditFilter.action]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const getTitle = () => {
    if (!hideTabs) return 'Enterprise Control Center';
    switch (activeTab) {
      case 'users': return 'User Management';
      case 'permissions': return 'Permissions Matrix';
      case 'audit': return 'Audit Logging';
      case 'security': return 'Security Center';
      case 'settings': return 'System Settings';
      default: return 'Control Center';
    }
  };

  const getSubtitle = () => {
    if (!hideTabs) return 'Global administrative controls, audit log trails, and system RBAC matrices.';
    switch (activeTab) {
      case 'users': return 'Manage all user accounts, roles, locks, and active sessions.';
      case 'permissions': return 'Adjust functional access layers dynamically for operational roles.';
      case 'audit': return 'Unified audit log trail and user activity logging.';
      case 'security': return 'Live security metrics, lockout counters, and session monitors.';
      case 'settings': return 'Configure global system parameters and security limits.';
      default: return '';
    }
  };

  const loadTabData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'users') {
        const data = await adminService.getUsers();
        setUsers(data);
      } else if (activeTab === 'audit') {
        const data = await adminService.getAuditLogs({
          page: auditFilter.page,
          module: auditFilter.module,
          action: auditFilter.action,
          search: auditFilter.search
        });
        setAuditLogs(data.logs);
        setAuditPagination(data.pagination);
      } else if (activeTab === 'security') {
        const data = await adminService.getSecurityOverview();
        setSecurityData(data);
      } else if (activeTab === 'settings') {
        const data = await adminService.getSettings();
        setSettings(data);
      } else if (activeTab === 'permissions') {
        const data = await adminService.getPermissionMatrix();
        setPermissionMatrix(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch administration data');
    } finally {
      setLoading(false);
    }
  };

  // User Actions handlers
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await adminService.createUser(newUser);
      setUserModalOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'FLEET_MANAGER' });
      showSuccess('User account successfully created');
      loadTabData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleDeactivate = async (user) => {
    try {
      if (user.isActive) {
        await adminService.suspendUser(user.id);
        showSuccess(`Suspended user: ${user.email}`);
      } else {
        await adminService.activateUser(user.id);
        showSuccess(`Activated user: ${user.email}`);
      }
      loadTabData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLockAccount = async (id, minutes) => {
    try {
      await adminService.lockUser(id, minutes);
      showSuccess(`Locked account for ${minutes} minutes`);
      loadTabData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUnlockAccount = async (id) => {
    try {
      await adminService.unlockUser(id);
      showSuccess('Unlocked user account');
      loadTabData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleForceLogout = async (id) => {
    try {
      await adminService.forceLogout(id);
      showSuccess('User sessions invalidated');
      loadTabData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await adminService.resetPassword(selectedUser.id, newPassword);
      setPwModalOpen(false);
      setNewPassword('');
      showSuccess(`Reset password successfully for ${selectedUser.email}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTerminateSession = async (sessionId) => {
    try {
      await adminService.terminateSession(sessionId);
      showSuccess('Active session terminated successfully');
      loadTabData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSettingChange = async (key, valString) => {
    try {
      let value = valString;
      if (valString === 'true') value = true;
      if (valString === 'false') value = false;
      if (!isNaN(valString) && valString.trim() !== '') value = parseInt(valString, 10);

      await adminService.updateSetting(key, value);
      showSuccess(`Setting updated: ${key}`);
      loadTabData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePermissionToggle = async (role, module, action, currentVal) => {
    try {
      await adminService.updatePermission({ role, module, action, granted: !currentVal });
      showSuccess(`Permissions updated for ${role}`);
      loadTabData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="control-center-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{getTitle()}</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>{getSubtitle()}</p>
        </div>
        <button className="btn-refresh" onClick={loadTabData} disabled={loading} title="Refresh Live Data">
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success">
          <ShieldCheck size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tab Navigation Menu */}
      {!hideTabs && (
        <div className="tabs-navigation">
          <button className={`tab-link ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={16} /> User Management
          </button>
          <button className={`tab-link ${activeTab === 'permissions' ? 'active' : ''}`} onClick={() => setActiveTab('permissions')}>
            <Shield size={16} /> Permissions Matrix
          </button>
          <button className={`tab-link ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
            <FileText size={16} /> Audit Logging
          </button>
          <button className={`tab-link ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
            <Key size={16} /> Security Center
          </button>
          <button className={`tab-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={16} /> System Settings
          </button>
        </div>
      )}

      {/* Tab Panel Content */}
      <div className="tab-panel-body">
        
        {/* --- USER MANAGEMENT --- */}
        {activeTab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="Search user email or name..." 
                  className="input-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={() => setUserModalOpen(true)}>
                <Plus size={16} /> Create User Account
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>User Details</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Failed Logins</th>
                    <th>Lock Until</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email}</div>
                      </td>
                      <td style={{ fontWeight: 800, fontSize: '0.75rem', color: '#1e293b' }}>
                        {u.role.replace('_', ' ')}
                      </td>
                      <td>
                        <StatusChip status={u.isActive ? 'Active' : 'Suspended'} />
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {u.failedLoginAttempts}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {u.lockedUntil && new Date(u.lockedUntil) > new Date() ? (
                          <span style={{ color: '#b91c1c', fontWeight: 700 }}>
                            {new Date(u.lockedUntil).toLocaleTimeString()}
                          </span>
                        ) : 'Not Locked'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button 
                            className={`btn-action ${u.isActive ? 'deactivate' : 'activate'}`}
                            onClick={() => handleToggleDeactivate(u)}
                            title={u.isActive ? 'Deactivate User Account' : 'Activate User Account'}
                          >
                            {u.isActive ? <UserMinus size={14} /> : <UserCheck size={14} />}
                          </button>
                          {u.lockedUntil && new Date(u.lockedUntil) > new Date() ? (
                            <button className="btn-action unlock" onClick={() => handleUnlockAccount(u.id)} title="Unlock User Account">
                              <Unlock size={14} />
                            </button>
                          ) : (
                            <button className="btn-action lock" onClick={() => handleLockAccount(u.id, 15)} title="Lock Account for 15m">
                              <Lock size={14} />
                            </button>
                          )}
                          <button className="btn-action key" onClick={() => { setSelectedUser(u); setPwModalOpen(true); }} title="Override Password">
                            <Key size={14} />
                          </button>
                          <button className="btn-action force-logout" onClick={() => handleForceLogout(u.id)} title="Terminate Active Sessions">
                            <Power size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- AUDIT LOGS --- */}
        {activeTab === 'audit' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="filter-label">Module Area</label>
                <select 
                  className="filter-select"
                  value={auditFilter.module}
                  onChange={(e) => setAuditFilter({ ...auditFilter, module: e.target.value, page: 1 })}
                >
                  <option value="">All Modules</option>
                  <option value="Users">Users Management</option>
                  <option value="Security">Security Center</option>
                  <option value="Settings">System Settings</option>
                  <option value="Vehicles">Vehicles</option>
                  <option value="Trips">Trips</option>
                </select>
              </div>
              <div>
                <label className="filter-label">Audit Action</label>
                <select 
                  className="filter-select"
                  value={auditFilter.action}
                  onChange={(e) => setAuditFilter({ ...auditFilter, action: e.target.value, page: 1 })}
                >
                  <option value="">All Actions</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="LOGIN">LOGIN</option>
                  <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                  <option value="SUSPEND">SUSPEND</option>
                  <option value="LOCK_USER">LOCK_USER</option>
                  <option value="RESET_PASSWORD">RESET_PASSWORD</option>
                </select>
              </div>
              <div>
                <label className="filter-label">Text Search</label>
                <input 
                  type="text" 
                  placeholder="Actor email, description..."
                  className="filter-input"
                  value={auditFilter.search}
                  onChange={(e) => setAuditFilter({ ...auditFilter, search: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && loadTabData()}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Role</th>
                    <th>Scope</th>
                    <th>Action</th>
                    <th>Details</th>
                    <th>IP / Browser</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 700 }}>{log.actor_email}</td>
                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{log.actor_role}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.module}</td>
                      <td>
                        <span className={`badge-action ${log.action.toLowerCase()}`}>{log.action}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{log.description}</td>
                      <td>
                        <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ color: '#0f172a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Globe size={12} /> {log.ip_address || 'unknown'}
                          </span>
                          <span style={{ color: '#64748b', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Laptop size={12} /> {log.user_agent ? log.user_agent.slice(0, 30) + '...' : 'unknown'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="pagination-bar">
              <button 
                disabled={auditFilter.page <= 1}
                onClick={() => setAuditFilter({ ...auditFilter, page: auditFilter.page - 1 })}
                className="btn-page"
              >
                Previous
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                Page {auditPagination.page} of {auditPagination.totalPages || 1}
              </span>
              <button 
                disabled={auditFilter.page >= auditPagination.totalPages}
                onClick={() => setAuditFilter({ ...auditFilter, page: auditFilter.page + 1 })}
                className="btn-page"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* --- SECURITY CENTER --- */}
        {activeTab === 'security' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div className="security-stat-box red">
                <span className="sec-label">Active Lockouts</span>
                <span className="sec-value">{securityData.lockedAccounts}</span>
              </div>
              <div className="security-stat-box orange">
                <span className="sec-label">Total Failed Logins</span>
                <span className="sec-value">{securityData.totalFailedAttempts}</span>
              </div>
              <div className="security-stat-box blue">
                <span className="sec-label">Live User Sessions</span>
                <span className="sec-value">{securityData.activeSessionsCount}</span>
              </div>
            </div>

            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Live Session Audit Trail</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Device Details</th>
                    <th>IP Address</th>
                    <th>Session Started</th>
                    <th>Expires</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {securityData.activeSessions?.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.email}</div>
                      </td>
                      <td style={{ fontSize: '0.75rem', fontWeight: 800 }}>{s.role}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#475569' }}>
                          <Laptop size={14} /> {s.userAgent ? s.userAgent.slice(0, 45) + '...' : 'Unknown'}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{s.ipAddress || 'unknown'}</td>
                      <td style={{ fontSize: '0.8rem' }}>{new Date(s.createdAt).toLocaleTimeString()}</td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(s.expiresAt).toLocaleTimeString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-terminate" onClick={() => handleTerminateSession(s.id)}>
                          Kill Session
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- PERMISSIONS MATRIX --- */}
        {activeTab === 'permissions' && (
          <div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 20 }}>
              Adjust functional access layers dynamically for operational roles. System Admins always retain full permissions.
            </p>
            {Object.keys(permissionMatrix).map(role => (
              <div key={role} className="role-permissions-section">
                <h3 className="role-perm-title">{role.replace('_', ' ')} Access Control Matrix</h3>
                <div className="permissions-grid">
                  {Object.keys(permissionMatrix[role]).map(module => (
                    <div key={module} className="module-row">
                      <div className="module-name-lbl">{module}</div>
                      <div className="actions-switches-container">
                        {Object.keys(permissionMatrix[role][module]).map(action => {
                          const isGranted = permissionMatrix[role][module][action];
                          return (
                            <label key={action} className="switch-label">
                              <span className="action-tag-label">{action}</span>
                              <input 
                                type="checkbox"
                                checked={isGranted}
                                onChange={() => handlePermissionToggle(role, module, action, isGranted)}
                              />
                              <span className="custom-slider" />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- SYSTEM SETTINGS --- */}
        {activeTab === 'settings' && (
          <div className="settings-tab-grid">
            {settings.map(setting => (
              <div key={setting.key} className="settings-field-card">
                <div style={{ flex: 1 }}>
                  <label className="settings-key-title">{setting.key.replace(/_/g, ' ').toUpperCase()}</label>
                  <span className="settings-key-desc">Configure system variable parameters for security thresholds.</span>
                </div>
                <div>
                  <input 
                    type="text" 
                    defaultValue={typeof setting.value === 'object' ? JSON.stringify(setting.value) : setting.value}
                    onBlur={(e) => handleSettingChange(setting.key, e.target.value)}
                    className="input-setting"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* --- CREATE USER MODAL --- */}
      {userModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800 }}>Create New User Account</h2>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Credentials Password</label>
                <input 
                  type="password" required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>System Role Mapping</label>
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="FLEET_MANAGER">Fleet Manager</option>
                  <option value="DISPATCHER">Dispatcher</option>
                  <option value="DRIVER">Driver</option>
                  <option value="SAFETY_OFFICER">Safety Officer</option>
                  <option value="FINANCIAL_ANALYST">Financial Analyst</option>
                  <option value="ADMIN">System Admin</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setUserModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PASSWORD OVERRIDE MODAL --- */}
      {pwModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800 }}>Force Password Override</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 12 }}>Changing password credentials for: <strong>{selectedUser?.email}</strong></p>
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>New Password Credentials</label>
                <input 
                  type="password" required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setPwModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Reset Credentials</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
