import React from 'react';
import { Calendar, ShieldAlert, Award, FileText, AlertCircle } from 'lucide-react';

export default function LicenseComplianceTimeline({ drivers, onReviewDriver }) {
  const now = new Date();
  
  let expiredCount = 0;
  let expiring7Count = 0;
  let expiring30Count = 0;
  let validCount = 0;

  const inconsistencies = [];

  drivers.forEach(d => {
    const expiry = new Date(d.licenseExpiry);
    const daysDiff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      expiredCount++;
      if (d.status === 'available') {
        inconsistencies.push({
          id: d.id,
          name: d.fullName,
          licenseNumber: d.licenseNumber,
          daysOverdue: Math.abs(daysDiff)
        });
      }
    } else if (daysDiff <= 7) {
      expiring7Count++;
    } else if (daysDiff <= 30) {
      expiring30Count++;
    } else {
      validCount++;
    }
  });

  const total = drivers.length || 1;
  const getPercent = (count) => ((count / total) * 100).toFixed(1);

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }} className="license-compliance-timeline">
      <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>License Compliance Intelligence</h2>
      </div>

      {/* Expiry timeline bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Expired */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
            <span style={{ color: '#dc2626' }}>Document Expired</span>
            <span style={{ color: '#0f172a' }}>{expiredCount} ({getPercent(expiredCount)}%)</span>
          </div>
          <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${getPercent(expiredCount)}%`, height: '100%', background: '#dc2626' }}></div>
          </div>
        </div>

        {/* Expiring in 7 days */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
            <span style={{ color: '#ea580c' }}>Expiring within 7 Days</span>
            <span style={{ color: '#0f172a' }}>{expiring7Count} ({getPercent(expiring7Count)}%)</span>
          </div>
          <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${getPercent(expiring7Count)}%`, height: '100%', background: '#ea580c' }}></div>
          </div>
        </div>

        {/* Expiring in 30 days */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
            <span style={{ color: '#ca8a04' }}>Expiring within 30 Days</span>
            <span style={{ color: '#0f172a' }}>{expiring30Count} ({getPercent(expiring30Count)}%)</span>
          </div>
          <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${getPercent(expiring30Count)}%`, height: '100%', background: '#ca8a04' }}></div>
          </div>
        </div>

        {/* Valid */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
            <span style={{ color: '#16a34a' }}>Valid beyond 30 Days</span>
            <span style={{ color: '#0f172a' }}>{validCount} ({getPercent(validCount)}%)</span>
          </div>
          <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${getPercent(validCount)}%`, height: '100%', background: '#16a34a' }}></div>
          </div>
        </div>
      </div>

      {/* Critical Inconsistencies Alert Box */}
      {inconsistencies.length > 0 && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#b91c1c', fontWeight: 700, fontSize: '0.85rem' }}>
            <AlertCircle size={16} /> CRITICAL COMPLIANCE INCONSISTENCIES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {inconsistencies.map((inc) => (
              <div key={inc.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#fff',
                padding: '10px 14px',
                borderRadius: 6,
                border: '1px solid #fecaca',
                fontSize: '0.75rem'
              }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{inc.name}</span>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>License ({inc.licenseNumber}) expired {inc.daysOverdue} days ago, but remains operationally AVAILABLE.</span>
                </div>
                <button
                  onClick={() => onReviewDriver(inc.id)}
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.7rem'
                  }}
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
