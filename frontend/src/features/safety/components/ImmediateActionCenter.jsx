import React from 'react';
import { AlertCircle, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

export default function ImmediateActionCenter({ alerts, onReviewDriver }) {
  // Sort alerts: CRITICAL first, then HIGH, then WARNING, then INFO
  const severityOrder = { CRITICAL: 1, HIGH: 2, WARNING: 3, INFO: 4 };
  const sortedAlerts = [...(alerts || [])].sort((a, b) => {
    return (severityOrder[a.severity] || 9) - (severityOrder[b.severity] || 9);
  });

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL': return <ShieldAlert size={20} color="#dc2626" />;
      case 'HIGH': return <AlertTriangle size={20} color="#ea580c" />;
      case 'WARNING': return <AlertCircle size={20} color="#ca8a04" />;
      default: return <Info size={20} color="#2563eb" />;
    }
  };

  const getAlertBg = (severity) => {
    switch (severity) {
      case 'CRITICAL': return '#fef2f2';
      case 'HIGH': return '#fff7ed';
      case 'WARNING': return '#fef9c3';
      default: return '#eff6ff';
    }
  };

  const getAlertBorder = (severity) => {
    switch (severity) {
      case 'CRITICAL': return '#fee2e2';
      case 'HIGH': return '#ffedd5';
      case 'WARNING': return '#fef08a';
      default: return '#dbeafe';
    }
  };

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }} className="immediate-action-center">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Requires Immediate Action</h2>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 12 }}>
          {sortedAlerts.length} issues
        </span>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxHeight: 400,
        overflowY: 'auto',
        paddingRight: 4
      }}>
        {sortedAlerts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#64748b',
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px dashed #e2e8f0',
            fontSize: '0.85rem'
          }}>
            ✓ All compliance metrics are within healthy limits. No active alerts.
          </div>
        ) : (
          sortedAlerts.map((alert, idx) => (
            <div key={idx} style={{
              background: getAlertBg(alert.severity),
              border: `1px solid ${getAlertBorder(alert.severity)}`,
              borderRadius: 8,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {getAlertIcon(alert.severity)}
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{alert.name}</span>
                </div>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: alert.severity === 'CRITICAL' ? '#dc2626' : alert.severity === 'HIGH' ? '#ea580c' : '#ca8a04',
                  textTransform: 'uppercase'
                }}>
                  {alert.severity}
                </span>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600, marginTop: 4 }}>
                {alert.issue}
              </div>

              <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                <strong>Evidence:</strong> Score: {alert.safetyScore}% | License Expiry: {new Date(alert.expiryDate).toLocaleDateString()} | State: {alert.status.toUpperCase()}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTop: '1px solid rgba(0,0,0,0.03)', paddingTop: 8 }}>
                <span style={{ fontSize: '0.7rem', color: '#475569', fontStyle: 'italic' }}>
                  <strong>Recommend:</strong> {alert.recommendedAction}
                </span>
                <button
                  onClick={() => onReviewDriver(alert.id)}
                  style={{
                    background: '#0f172a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.opacity = 0.9}
                  onMouseOut={(e) => e.target.style.opacity = 1}
                >
                  Review Driver
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
