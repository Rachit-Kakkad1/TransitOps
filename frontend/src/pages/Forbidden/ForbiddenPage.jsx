import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '24px',
      background: '#f8fafc'
    }}>
      <div className="card-premium" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '40px 32px',
        textAlign: 'center',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05)'
      }}>
        {/* Shield Alert Illustration */}
        <div style={{
          position: 'relative',
          width: '80px',
          height: '80px',
          margin: '0 auto 24px auto',
          background: '#fff7ed', // soft light orange
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Pulsing decoration circle */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: '50%',
            border: '2px solid #ffedd5',
            animation: 'pulse 2s infinite'
          }} />
          <ShieldAlert size={40} color="#f97316" />
        </div>

        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          color: '#0f172a',
          margin: '0 0 12px 0'
        }}>
          403 Access Denied
        </h1>

        <p style={{
          fontSize: '0.95rem',
          color: '#64748b',
          lineHeight: '1.6',
          margin: '0 0 32px 0'
        }}>
          Your role does not have permission to access this module. If you believe this is an error, please contact your system administrator.
        </p>

        <button
          onClick={() => navigate('/dashboard')}
          className="btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 24px',
            background: '#0f172a', // deep navy
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            width: '100%'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#1e293b'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#0f172a'}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
