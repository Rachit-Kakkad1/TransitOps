import React from 'react';
import { User, Shield, Mail, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRoleTitle } from '../../config/roleConfig';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>My Profile</h2>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
          Manage your personal details, review role permissions, and modify authentication security settings.
        </p>
      </div>

      {/* Profile Card */}
      <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* User avatar and summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#ffedd5',
            color: '#f97316',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 800
          }}>
            {user?.name?.slice(0, 2).toUpperCase() || 'US'}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{user?.name || 'TransitOps User'}</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{getRoleTitle(user?.role)}</span>
          </div>
        </div>

        {/* Details grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Mail size={16} color="#64748b" />
            <div style={{ fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Email Address</span>
              <strong style={{ color: '#0f172a' }}>{user?.email || 'N/A'}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Shield size={16} color="#64748b" />
            <div style={{ fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Rbac Role Security</span>
              <strong style={{ color: '#0f172a' }}>{user?.role || 'N/A'}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Key size={16} color="#64748b" />
            <div style={{ fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Roster Permission Group</span>
              <strong style={{ color: '#f97316' }}>Dispatcher Desk Operations</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
