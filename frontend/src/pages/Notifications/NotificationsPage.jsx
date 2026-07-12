import React, { useState } from 'react';
import { Bell, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Wrench, Shield, Zap } from 'lucide-react';
import StatusChip from '../../components/ui/StatusChip';

export default function NotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: '1', type: 'dispatch_conflict', message: 'Dispatch conflict flagged: Driver Amit Patel rolling duty hours exceed 10-hour limit.', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), severity: 'error' },
    { id: '2', type: 'license_expiry', message: 'License expiry warning: Driver Sanjay Singh license has expired.', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), severity: 'error' },
    { id: '3', type: 'vehicle_unavailable', message: 'Vehicle GJ-01-ZZ-1111 is unavailable due to active maintenance.', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), severity: 'warning' },
    { id: '4', type: 'maintenance_alert', message: 'Maintenance alert: Vehicle GJ-01-ZZ-1111 entered the shop for scheduled service.', timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), severity: 'info' },
    { id: '5', type: 'trip_completed', message: 'Trip Completed: Retail Hub B dispatch successful.', timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(), severity: 'success' },
    { id: '6', type: 'trip_delayed', message: 'Trip Delayed: Transit to Retail Depot 5 is behind schedule.', timestamp: new Date(Date.now() - 1000 * 60 * 420).toISOString(), severity: 'warning' }
  ]);

  const handleClearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'dispatch_conflict': return <AlertTriangle size={18} color="#ef4444" />;
      case 'license_expiry': return <Shield size={18} color="#ef4444" />;
      case 'vehicle_unavailable': return <Truck size={18} color="#f59e0b" />;
      case 'maintenance_alert': return <Wrench size={18} color="#3b82f6" />;
      case 'trip_completed': return <CheckCircle2 size={18} color="#10b981" />;
      case 'trip_delayed': return <Clock size={18} color="#f59e0b" />;
      default: return <Bell size={18} color="#64748b" />;
    }
  };

  const getSeverityBg = (severity) => {
    switch (severity) {
      case 'error': return '#fee2e2';
      case 'warning': return '#fffbeb';
      case 'success': return '#dcfce7';
      default: return '#f1f5f9';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Operational Alerts</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Monitor real-time system alerts, driver roster warnings, vehicle maintenance flags, and route delays.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={handleClearAll} 
            className="btn-secondary" 
            style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {notifications.length > 0 ? (
          notifications.map(notif => (
            <div 
              key={notif.id} 
              style={{ 
                padding: '16px', 
                borderRadius: 12, 
                border: '1px solid #e2e8f0', 
                background: '#fff',
                display: 'flex',
                gap: 14,
                alignItems: 'center'
              }}
            >
              {/* Left Alert Icon with shaded circle */}
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: getSeverityBg(notif.severity),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {getIcon(notif.type)}
              </div>

              {/* Message Details */}
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                  {notif.message}
                </p>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginTop: 4 }}>
                  {new Date(notif.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Bell size={32} color="#cbd5e1" style={{ margin: '0 auto 12px auto', display: 'block' }} />
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>No active notifications.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple clock icon import fallback helper
function Clock({ size, color, ...props }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// Simple truck icon import fallback helper
function Truck({ size, color, ...props }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}
