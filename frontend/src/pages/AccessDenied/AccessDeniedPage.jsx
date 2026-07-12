import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      padding: '40px 20px',
      textAlign: 'center',
      background: 'transparent'
    }}>
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 24,
        padding: '48px 32px',
        maxWidth: 500,
        width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24
      }}>
        {/* Shield illustration */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: '#fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
          marginBottom: 8
        }}>
          <ShieldAlert size={44} />
        </div>

        {/* Text Details */}
        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#0b1f3a', // deep navy
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em'
          }}>
            403 Access Denied
          </h1>
          <p style={{
            fontSize: '0.95rem',
            color: '#64748b', // secondary text
            margin: 0,
            fontWeight: 500,
            lineHeight: 1.6
          }}>
            Your role does not have permission to access this module.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 24px',
            background: '#f97316', // orange accent
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'background-color 150ms ease',
            boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.2)'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ea580c'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f97316'}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
