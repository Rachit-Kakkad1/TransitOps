/**
 * Frontend API Service for ADMIN-only operations.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export const adminService = {
  // User Management
  getUsers: async () => {
    const response = await fetch(`${API_URL}/api/admin/users`, { headers: getHeaders() });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || 'Failed to fetch users');
    return res.data;
  },

  createUser: async (userData) => {
    const response = await fetch(`${API_URL}/api/admin/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || 'Failed to create user');
    return res.data;
  },

  updateUser: async (id, updateData) => {
    const response = await fetch(`${API_URL}/api/admin/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updateData)
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || 'Failed to update user');
    return res.data;
  },

  suspendUser: async (id) => {
    const response = await fetch(`${API_URL}/api/admin/users/${id}/suspend`, { method: 'POST', headers: getHeaders() });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || 'Failed to suspend user');
    return res;
  },

  activateUser: async (id) => {
    const response = await fetch(`${API_URL}/api/admin/users/${id}/activate`, { method: 'POST', headers: getHeaders() });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || 'Failed to activate user');
    return res;
  },

  lockUser: async (id, durationMinutes) => {
    const response = await fetch(`${API_URL}/api/admin/users/${id}/lock`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ durationMinutes })
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || 'Failed to lock user');
    return res.data;
  },

  unlockUser: async (id) => {
    const response = await fetch(`${API_URL}/api/admin/users/${id}/unlock`, { method: 'POST', headers: getHeaders() });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || 'Failed to unlock user');
    return res;
  },

  resetPassword: async (id, password) => {
    const response = await fetch(`${API_URL}/api/admin/users/${id}/reset-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ password })
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || 'Failed to reset password');
    return res;
  },

  forceLogout: async (id) => {
    const response = await fetch(`${API_URL}/api/admin/users/${id}/force-logout`, { method: 'POST', headers: getHeaders() });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || 'Failed to invalidate sessions');
    return res;
  },

  // Role & Permission Management
  getPermissionMatrix: async () => {
    const response = await fetch(`${API_URL}/api/admin/permissions`, { headers: getHeaders() });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || 'Failed to fetch permission matrix');
    return res.data;
  },

  updatePermission: async (payload) => {
    const response = await fetch(`${API_URL}/api/admin/permissions`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || 'Failed to update permission');
    return res;
  },

  // Audit Logs
  getAuditLogs: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/api/admin/audit-logs?${query}`, { headers: getHeaders() });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || 'Failed to fetch audit logs');
    return res.data;
  },

  // Security Center
  getSecurityOverview: async () => {
    const response = await fetch(`${API_URL}/api/admin/security/overview`, { headers: getHeaders() });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || 'Failed to fetch security overview');
    return res.data;
  },

  terminateSession: async (sessionId) => {
    const response = await fetch(`${API_URL}/api/admin/security/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || 'Failed to terminate session');
    return res;
  },

  // System Settings
  getSettings: async () => {
    const response = await fetch(`${API_URL}/api/admin/settings`, { headers: getHeaders() });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || 'Failed to fetch system settings');
    return res.data;
  },

  updateSetting: async (key, value) => {
    const response = await fetch(`${API_URL}/api/admin/settings/${key}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ value })
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.message || 'Failed to update setting');
    return res;
  }
};
