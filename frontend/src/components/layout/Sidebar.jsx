import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Truck, Navigation, Wrench, Users, DollarSign, 
  LogOut, PanelLeftClose, PanelLeftOpen, ShieldCheck, Shield, FileText,
  Key, Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRoleConfig, getRoleTitle } from '../../config/roleConfig';

const IconMap = {
  LayoutDashboard,
  Truck,
  Navigation,
  Wrench,
  Users,
  DollarSign,
  ShieldCheck,
  Shield,
  FileText,
  Key,
  Settings
};

const COLLAPSED_KEY = 'transitops-sidebar-collapsed';

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen, collapsed, setCollapsed }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const config = getRoleConfig(user?.role);
  const isMobile = window.innerWidth <= 768;

  const sidebarWidth = isMobile ? (mobileMenuOpen ? '260px' : '0px') : (collapsed ? '70px' : '240px');

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)',
            zIndex: 900,
          }}
        />
      )}

      <aside
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: sidebarWidth,
          background: '#f8fafc', // off-white
          borderRight: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column',
          zIndex: 1000,
          overflow: 'hidden',
          transition: 'width 200ms ease, transform 200ms ease',
          transform: isMobile && !mobileMenuOpen ? 'translateX(-260px)' : 'none',
        }}
      >
        {/* Brand Header */}
        <div style={{
          padding: collapsed && !isMobile ? '16px 10px' : '16px 20px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid #e2e8f0',
          minHeight: 64,
          flexShrink: 0
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#f97316', // orange accent
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            color: '#fff',
            fontWeight: 800,
            fontSize: '1.1rem'
          }}>
            T
          </div>
          {(!collapsed || isMobile) && (
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', whiteSpace: 'nowrap' }}>
              Transit<span style={{ color: '#f97316' }}>Ops</span>
            </span>
          )}
        </div>

        {/* Navigation list */}
        <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
          {config.sidebarItems.map(item => {
            const isActive = location.pathname === item.path;
            const IconComponent = IconMap[item.icon] || LayoutDashboard;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => isMobile && setMobileMenuOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center',
                  gap: 12,
                  padding: collapsed && !isMobile ? '12px 0' : '10px 16px',
                  margin: '4px 12px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#f97316' : '#475569',
                  background: isActive ? '#ffedd5' : 'transparent', // light peach/orange bg
                  justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                  transition: 'all 150ms ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <IconComponent size={20} style={{ flexShrink: 0 }} />
                {(!collapsed || isMobile) && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse toggle (Hide on Mobile) */}
        {!isMobile && (
          <div style={{ padding: '8px 12px', borderTop: '1px solid #e2e8f0' }}>
            <button
              onClick={() => setCollapsed(c => !c)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
                gap: 12, padding: '10px',
                background: 'transparent', border: 'none',
                color: '#64748b', cursor: 'pointer',
                borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                transition: 'all 150ms ease',
              }}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              {!collapsed && <span>Collapse Sidebar</span>}
            </button>
          </div>
        )}

        {/* User Card */}
        <div style={{
          padding: collapsed && !isMobile ? '12px 8px' : '14px 16px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700, color: '#0f172a',
            flexShrink: 0,
          }}>
            {user?.name?.slice(0, 2).toUpperCase() || 'U'}
          </div>
          {(!collapsed || isMobile) && (
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                {user?.name || 'User'}
              </p>
              <p style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                {getRoleTitle(user?.role)}
              </p>
            </div>
          )}
          <button
            onClick={logout}
            title="Sign out"
            style={{
              background: 'transparent', border: 'none',
              color: '#94a3b8', cursor: 'pointer',
              padding: 4, borderRadius: 6, display: 'flex',
              flexShrink: 0,
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
