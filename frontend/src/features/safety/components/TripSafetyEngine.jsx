import React from 'react';
import { Route, AlertTriangle, CheckCircle, XCircle, ShieldAlert, Navigation } from 'lucide-react';
import { getRiskLevelMeta } from '../constants/safetyThresholds';

export default function TripSafetyEngine({ trips, loading, onViewRoute }) {
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        Loading Trip Safety Engine checkpoints...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="trip-safety-engine">
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Trip Safety Engine Queue</h2>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 12 }}>
            {trips.length} active dispatches
          </span>
        </div>

        {trips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '0.85rem' }}>
            No active or pending trips found in queue.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {trips.map((trip) => {
              const riskMeta = getRiskLevelMeta(trip.riskLevel);
              const failedChecksCount = trip.checks.filter(c => !c.passed).length;
              const passedChecksCount = trip.checks.filter(c => c.passed).length;

              return (
                <div key={trip.id} style={{
                  border: `1px solid ${trip.eligible ? '#e2e8f0' : '#fecaca'}`,
                  borderRadius: 10,
                  padding: 20,
                  background: trip.eligible ? '#fff' : '#fffafb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'default'
                }} className="trip-card">
                  {/* Trip Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Navigation size={16} color="#475569" />
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{trip.source} → {trip.destination}</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Trip ID: {trip.id.substring(0, 8)} | Distance: {trip.plannedDistanceKm} km</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: trip.eligible ? '#16a34a' : '#dc2626',
                        background: trip.eligible ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${trip.eligible ? '#bbf7d0' : '#fecaca'}`,
                        padding: '2px 8px',
                        borderRadius: 4,
                        textTransform: 'uppercase'
                      }}>
                        {trip.eligible ? 'VERIFIED ELIGIBLE' : 'DISPATCH BLOCKED'}
                      </span>
                      <span style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        color: riskMeta.color,
                        background: riskMeta.bg,
                        padding: '1px 6px',
                        borderRadius: 10,
                        textTransform: 'uppercase'
                      }}>
                        {riskMeta.label}
                      </span>
                    </div>
                  </div>

                  {/* Driver and Vehicle Meta */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#f8fafc', padding: 12, borderRadius: 6, fontSize: '0.75rem' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Assigned Driver</span>
                      <span style={{ fontWeight: 700, color: '#334155' }}>{trip.driver.fullName}</span>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Score: {trip.driver.safetyScore}% | {trip.driver.status}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Assigned Vehicle</span>
                      <span style={{ fontWeight: 700, color: '#334155' }}>{trip.vehicle.registrationNumber}</span>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Model: {trip.vehicle.model} | {trip.vehicle.status}</span>
                    </div>
                  </div>

                  {/* Engine Checkpoints Checklist */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Eligibility Checks Checklist</span>
                      <span style={{ color: failedChecksCount > 0 ? '#dc2626' : '#16a34a' }}>
                        {passedChecksCount} passed, {failedChecksCount} failed
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {trip.checks.map((chk, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          fontSize: '0.75rem',
                          background: chk.passed ? 'transparent' : '#fef2f2',
                          padding: chk.passed ? '2px 0' : '8px 12px',
                          borderRadius: chk.passed ? 0 : 6,
                          borderLeft: chk.passed ? 'none' : '3px solid #dc2626'
                        }}>
                          {chk.passed ? (
                            <CheckCircle size={14} color="#16a34a" style={{ marginTop: 1, flexShrink: 0 }} />
                          ) : (
                            <XCircle size={14} color="#dc2626" style={{ marginTop: 1, flexShrink: 0 }} />
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, color: '#334155' }}>{chk.code.replace(/_/g, ' ')}</span>
                              {!chk.passed && (
                                <span style={{ fontSize: '0.6rem', fontWeight: 800, background: '#fecaca', color: '#b91c1c', padding: '1px 4px', borderRadius: 3 }}>
                                  {chk.severity}
                                </span>
                              )}
                            </div>
                            <span style={{ color: chk.passed ? '#475569' : '#334155' }}>{chk.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommended Action */}
                  {!trip.eligible && (
                    <div style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 6,
                      padding: 12,
                      fontSize: '0.75rem',
                      color: '#991b1b',
                      marginTop: 'auto',
                      marginBottom: 8
                    }}>
                      <strong>Recommended Compliance Intervention:</strong> Cancel or re-assign this trip. Immediately suspend driver or vehicle from operational duty to resolve blocks.
                    </div>
                  )}

                  {/* View Route Action Trigger */}
                  <button
                    onClick={() => onViewRoute(trip)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#475569',
                      cursor: 'pointer',
                      marginTop: 'auto',
                      alignSelf: 'flex-start',
                      transition: 'all 150ms ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  >
                    <Route size={14} />
                    View Route
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
