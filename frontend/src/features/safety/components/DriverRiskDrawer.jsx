import React, { useState } from 'react';
import { X, ShieldAlert, Award, Calendar, Phone, FileText, Ban, UserCheck, ShieldCheck } from 'lucide-react';
import { getSafetyScoreCategory, getRiskLevelMeta, THRESHOLDS } from '../constants/safetyThresholds';

export default function DriverRiskDrawer({
  driver,
  isOpen,
  onClose,
  onToggleStatus
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [validationFailures, setValidationFailures] = useState([]);

  if (!driver) return null;

  const scoreCategory = getSafetyScoreCategory(driver.safetyScore);
  const riskMeta = getRiskLevelMeta(driver.riskLevel);
  const now = new Date();
  const expiryDate = new Date(driver.licenseExpiry);
  const daysDiff = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

  // Pre-validate reactivation criteria on frontend for instant feedback
  const isLicenseExpired = daysDiff < 0;
  const isScoreInvalid = driver.safetyScore < THRESHOLDS.HARD_ELIGIBILITY;
  const canReactivate = !isLicenseExpired && !isScoreInvalid;

  const handleAction = async (targetStatus) => {
    setSubmitting(true);
    setErrorMsg('');
    setValidationFailures([]);
    try {
      await onToggleStatus(driver.id, targetStatus, reason);
      setReason('');
      onClose();
    } catch (err) {
      // Catch custom backend API validation failures
      if (err.errors) {
        setValidationFailures(err.errors);
      } else {
        setErrorMsg(err.message || 'Action failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Drawer Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.15)',
          backdropFilter: 'blur(2px)',
          zIndex: 9998,
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          transition: 'all 0.25s ease'
        }}
      />

      {/* Sliding Drawer Container */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        maxWidth: 500,
        background: '#fff',
        boxShadow: '-4px 0 24px rgba(15, 23, 42, 0.08)',
        zIndex: 9999,
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Driver Risk Profile</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>{driver.fullName}</h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>System ID: {driver.id}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Status Highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Operational Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {driver.status === 'suspended' ? <Ban size={16} color="#dc2626" /> : <UserCheck size={16} color="#16a34a" />}
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: driver.status === 'suspended' ? '#dc2626' : '#0f172a', textTransform: 'capitalize' }}>
                {driver.status}
              </span>
            </div>
          </div>

          <div style={{ background: scoreCategory.bg, padding: 16, borderRadius: 8, border: `1px solid ${scoreCategory.color}20` }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Safety Score</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: '1.2rem', color: scoreCategory.color }}>{driver.safetyScore}%</span>
              <span style={{ fontWeight: 700, fontSize: '0.7rem', color: scoreCategory.color, textTransform: 'uppercase' }}>{scoreCategory.label}</span>
            </div>
          </div>
        </div>

        {/* Central Risk Level */}
        <div style={{ background: riskMeta.bg, border: `1px solid ${riskMeta.border}`, padding: 16, borderRadius: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <ShieldAlert size={20} color={riskMeta.color} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Risk Classification: {riskMeta.label}</div>
            <div style={{ fontSize: '0.75rem', color: '#334155', marginTop: 2 }}> 중앙 위험성 평가 모델 점수: <strong>{driver.riskScore} / 100</strong></div>
          </div>
        </div>

        {/* License Timeline widget */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>License Verification Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: '#64748b' }}>License Number</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{driver.licenseNumber} (Class {driver.licenseCategory})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: '#64748b' }}>Expiry Date</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{expiryDate.toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: '#64748b' }}>Days Remaining</span>
              <span style={{
                fontWeight: 700,
                color: daysDiff < 0 ? '#dc2626' : daysDiff <= 7 ? '#ea580c' : '#16a34a'
              }}>
                {daysDiff < 0 ? `Expired (${Math.abs(daysDiff)} days overdue)` : `${daysDiff} days`}
              </span>
            </div>
          </div>
        </div>

        {/* Explainable Concerns List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Active Compliance Concerns ({driver.reasons?.length || 0})</div>
          {(!driver.reasons || driver.reasons.length === 0) ? (
            <div style={{ fontSize: '0.75rem', color: '#16a34a', background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0', display: 'flex', gap: 8, alignItems: 'center' }}>
              <ShieldCheck size={16} /> Driver meets all security check standards. No issues logged.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {driver.reasons.map((concern, idx) => (
                <div key={idx} style={{
                  background: concern.severity === 'CRITICAL' ? '#fef2f2' : '#fff7ed',
                  borderLeft: `3px solid ${concern.severity === 'CRITICAL' ? '#dc2626' : '#ea580c'}`,
                  padding: 12,
                  borderRadius: '0 8px 8px 0',
                  fontSize: '0.75rem'
                }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{concern.code}</span>
                    <span style={{ color: concern.severity === 'CRITICAL' ? '#dc2626' : '#ea580c', fontWeight: 800 }}>{concern.severity}</span>
                  </div>
                  <div style={{ color: '#475569', marginTop: 4 }}>{concern.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Form */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
          {errorMsg && (
            <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: 10, borderRadius: 6, fontSize: '0.75rem', marginBottom: 12 }}>
              <strong>Error:</strong> {errorMsg}
            </div>
          )}

          {validationFailures.length > 0 && (
            <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: 12, borderRadius: 8, fontSize: '0.75rem', marginBottom: 12 }}>
              <strong style={{ display: 'block', marginBottom: 6 }}>ACTIVATION BLOCKED</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {validationFailures.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            </div>
          )}

          {driver.status === 'suspended' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: '0.75rem', color: '#475569', background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <strong>Reactivation Policy Check:</strong> Reactivating a driver requires that their driver license is fully valid and their safety score meets the hard eligibility line {"(>= 75%)"}.
              </div>

              {!canReactivate && (
                <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: 12, borderRadius: 8, fontSize: '0.75rem' }}>
                  <strong style={{ display: 'block', marginBottom: 6 }}>ACTIVATION INELIGIBLE</strong>
                  <div>The driver fails compliance metrics. You cannot reactivate them until compliance is updated in database:</div>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: 16 }}>
                    {isLicenseExpired && <li>License is expired.</li>}
                    {isScoreInvalid && <li>Safety score ({driver.safetyScore}%) is below 75%.</li>}
                  </ul>
                </div>
              )}

              <button
                disabled={!canReactivate || submitting}
                onClick={() => handleAction('available')}
                style={{
                  background: canReactivate ? '#16a34a' : '#cbd5e1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: 12,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: canReactivate ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <UserCheck size={16} /> Request Activation
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  Suspension Justification Reason <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  placeholder="Specify why this driver is being suspended from operation..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 60,
                    padding: 8,
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ fontSize: '0.7rem', color: '#b91c1c', fontStyle: 'italic' }}>
                ⚠️ Warning: Suspending this driver will immediately flag all of their assigned pending trips as unsafe and block them from new assignments.
              </div>

              <button
                disabled={!reason.trim() || submitting}
                onClick={() => handleAction('suspended')}
                style={{
                  background: reason.trim() ? '#dc2626' : '#cbd5e1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: 12,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: reason.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <Ban size={16} /> Suspend from Operations
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
