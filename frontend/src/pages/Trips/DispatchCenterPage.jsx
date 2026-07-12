import React, { useState, useEffect } from 'react';
import { Zap, Clock, Play, CheckCircle2, AlertTriangle, Shield, Award, Calendar, ChevronRight, X, Info, RefreshCw } from 'lucide-react';
import { tripService } from '../../services/tripService';
import StatusChip from '../../components/ui/StatusChip';

export default function DispatchCenterPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Selected trips for bulk dispatch
  const [selectedTripIds, setSelectedTripIds] = useState([]);
  const [bulkDispatching, setBulkDispatching] = useState(false);

  // Recommendations Modal
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [selectedRecIndex, setSelectedRecIndex] = useState(0);
  const [dispatchError, setDispatchError] = useState('');

  // Resources from overview (used for warnings/checks)
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await tripService.getTrips();
      setTrips(data);

      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const overviewRes = await fetch(`${API_URL}/api/dashboard/overview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const overviewData = await overviewRes.json();
      if (overviewRes.ok && overviewData.success) {
        setVehicles(overviewData.data.availableVehicles || []);
        setDrivers(overviewData.data.availableDrivers || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch dispatch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Conflict Resolution checks
  const getConflicts = (trip) => {
    const conflicts = [];
    if (!trip.vehicle) {
      conflicts.push({ message: 'No vehicle assigned', severity: 'warning' });
    }
    if (!trip.driver) {
      conflicts.push({ message: 'No driver assigned', severity: 'warning' });
    }

    if (trip.vehicle && trip.cargoWeightKg && trip.vehicle.maxLoadCapacityKg) {
      if (trip.cargoWeightKg > trip.vehicle.maxLoadCapacityKg) {
        conflicts.push({
          message: `Cargo exceeds capacity (${trip.cargoWeightKg.toLocaleString()} kg > ${trip.vehicle.maxLoadCapacityKg.toLocaleString()} kg)`,
          severity: 'error'
        });
      }
    }

    if (trip.driver) {
      if (trip.driver.rollingDutyHours && parseFloat(trip.driver.rollingDutyHours) > 10) {
        conflicts.push({
          message: `Driver rolling duty hours (${trip.driver.rollingDutyHours} hrs) exceed 10-hour limit`,
          severity: 'error'
        });
      }
      if (trip.driver.licenseExpiry && new Date(trip.driver.licenseExpiry) < new Date()) {
        conflicts.push({
          message: `Driver license is expired`,
          severity: 'error'
        });
      }
      if (trip.driver.status === 'suspended') {
        conflicts.push({
          message: `Driver is suspended`,
          severity: 'error'
        });
      }
    }
    return conflicts;
  };

  const handleOpenDispatch = async (trip) => {
    setSelectedTrip(trip);
    setShowDispatchModal(true);
    setLoadingRecs(true);
    setDispatchError('');
    setSelectedRecIndex(0);
    try {
      const recs = await tripService.getRecommendations(trip.id);
      setRecommendations(recs);
    } catch (err) {
      setDispatchError(err.message || 'Failed to load recommendations');
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleConfirmDispatch = async () => {
    setDispatchError('');
    try {
      const selectedMatch = recommendations[selectedRecIndex];
      if (!selectedMatch) {
        throw new Error('Please select a driver-vehicle pairing');
      }

      await tripService.dispatchTrip(selectedTrip.id, {
        vehicleId: selectedMatch.vehicle.id,
        driverId: selectedMatch.driver.id,
      });

      setShowDispatchModal(false);
      fetchData();
    } catch (err) {
      setDispatchError(err.message || 'Dispatch failed');
    }
  };

  const handleSelectTrip = (id) => {
    setSelectedTripIds(prev => 
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const handleBulkDispatch = async () => {
    if (selectedTripIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to bulk dispatch ${selectedTripIds.length} trips?`)) return;

    setBulkDispatching(true);
    let successCount = 0;
    let failCount = 0;

    for (const tripId of selectedTripIds) {
      try {
        // Fetch recommendations to find best pairing
        const recs = await tripService.getRecommendations(tripId);
        if (recs && recs.length > 0) {
          const topRec = recs[0];
          await tripService.dispatchTrip(tripId, {
            vehicleId: topRec.vehicle.id,
            driverId: topRec.driver.id
          });
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    alert(`Bulk dispatch complete!\nSuccessful: ${successCount}\nFailed: ${failCount}`);
    setSelectedTripIds([]);
    setBulkDispatching(false);
    fetchData();
  };

  const pendingQueue = trips.filter(t => t.status === 'draft');
  const activeDispatches = trips.filter(t => t.status === 'dispatched');
  const completedHistory = trips.filter(t => t.status === 'completed');

  // Simple dispatch calendar mapping: group trips by date
  const dispatchesByDay = pendingQueue.slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Dispatch Center</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Verify cargo payloads, audit active rosters, resolve operational conflicts, and release fleet dispatches in bulk.
          </p>
        </div>
        <button 
          onClick={fetchData} 
          className="btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24, alignItems: 'start' }}>
        {/* Left: Dispatch Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div className="card-premium">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={18} color="#f97316" /> Dispatch Queue (Pending)
              </h3>
              {selectedTripIds.length > 0 && (
                <button
                  disabled={bulkDispatching}
                  onClick={handleBulkDispatch}
                  style={{
                    padding: '8px 14px',
                    background: '#f97316',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {bulkDispatching ? 'Releasing...' : `Bulk Release (${selectedTripIds.length})`}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ width: 28, height: 28, border: '3px solid rgba(249, 115, 22, 0.2)', borderRadius: '50%', borderTopColor: '#f97316', animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Refreshing queue...</span>
                </div>
              ) : pendingQueue.length > 0 ? (
                pendingQueue.map(trip => {
                  const conflicts = getConflicts(trip);
                  const hasErrors = conflicts.some(c => c.severity === 'error');
                  const hasWarnings = conflicts.some(c => c.severity === 'warning');
                  const isSelected = selectedTripIds.includes(trip.id);

                  return (
                    <div
                      key={trip.id}
                      style={{
                        padding: 16,
                        border: isSelected 
                          ? '2px solid #f97316' 
                          : hasErrors 
                            ? '1px solid #fee2e2' 
                            : hasWarnings 
                              ? '1px solid #fef3c7' 
                              : '1px solid #e2e8f0',
                        borderRadius: 12,
                        background: isSelected ? '#ffedd5' : '#fff',
                        transition: 'all 150ms ease',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-start'
                      }}
                    >
                      {/* Checkbox for Bulk Dispatch */}
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectTrip(trip.id)}
                        style={{ marginTop: 4, cursor: 'pointer', width: 16, height: 16, accentColor: '#f97316' }}
                      />

                      <div style={{ flex: 1 }}>
                        {/* Hub details */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                            {trip.source} &rarr; {trip.destination}
                          </span>
                          <button
                            onClick={() => handleOpenDispatch(trip)}
                            style={{
                              padding: '5px 12px',
                              background: '#f97316',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              cursor: 'pointer'
                            }}
                          >
                            Release Dispatch
                          </button>
                        </div>

                        {/* Specs */}
                        <div style={{ display: 'flex', gap: 12, fontSize: '0.725rem', color: '#64748b', marginTop: 4 }}>
                          <span>Weight: <strong>{parseFloat(trip.cargoWeightKg).toLocaleString()} kg</strong></span>
                          <span>·</span>
                          <span>Distance: <strong>{parseFloat(trip.plannedDistanceKm)} km</strong></span>
                        </div>

                        {/* Resources */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.78rem', color: '#475569', marginTop: 10 }}>
                          <div>
                            <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Vehicle</span>
                            <span style={{ fontWeight: 700, color: trip.vehicle ? '#334155' : '#94a3b8' }}>
                              {trip.vehicle ? trip.vehicle.registrationNumber : 'None Assigned'}
                            </span>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Driver</span>
                            <span style={{ fontWeight: 700, color: trip.driver ? '#334155' : '#94a3b8' }}>
                              {trip.driver ? trip.driver.fullName : 'None Assigned'}
                            </span>
                          </div>
                        </div>

                        {/* Validation Errors & Alerts */}
                        {conflicts.length > 0 && (
                          <div style={{
                            marginTop: 10,
                            padding: '8px 12px',
                            background: hasErrors ? '#fee2e2' : '#fffbeb',
                            borderRadius: 8,
                            borderLeft: hasErrors ? '3px solid #ef4444' : '3px solid #f59e0b',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}>
                            {conflicts.map((c, i) => (
                              <span key={i} style={{ fontSize: '0.7rem', color: hasErrors ? '#991b1b' : '#92400e', fontWeight: 600 }}>
                                &#9888; {c.message}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0', border: '1px dashed #cbd5e1', borderRadius: 12 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>No pending dispatches.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right: Dispatch Calendar & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Calendar Card */}
          <div className="card-premium">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={16} color="#f97316" /> Dispatch Calendar (Today)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dispatchesByDay.length > 0 ? dispatchesByDay.map((t, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, color: '#334155', display: 'block' }}>{t.source} &rarr; {t.destination}</span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Status: Draft Queue</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f97316', background: '#ffedd5', padding: '2px 8px', borderRadius: 12 }}>
                    Today
                  </span>
                </div>
              )) : (
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', margin: 0 }}>No dispatches scheduled for today.</p>
              )}
            </div>
          </div>

          {/* Dispatch History Timeline */}
          <div className="card-premium">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={16} color="#f97316" /> Active Dispatch Releases
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
              {activeDispatches.length > 0 ? activeDispatches.map((t, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 10, fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                    {idx < activeDispatches.length - 1 && <span style={{ width: 2, flex: 1, background: '#cbd5e1', margin: '4px 0' }} />}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{t.source} &rarr; {t.destination}</span>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                      Vehicle: {t.vehicle?.registrationNumber || 'Unassigned'} · Released: {t.dispatchedAt ? new Date(t.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                    </span>
                  </div>
                </div>
              )) : (
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', margin: 0 }}>No active dispatches released.</p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* DISPATCH RECOMMENDATIONS MODAL */}
      {showDispatchModal && selectedTrip && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card-premium" style={{ width: '100%', maxWidth: 680, padding: 24, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Award size={20} color="#f97316" /> Smart Dispatch Recommendations
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Trip: <strong>{selectedTrip.source} &rarr; {selectedTrip.destination}</strong> ({selectedTrip.cargoWeightKg} kg, {selectedTrip.plannedDistanceKm} km)
                </p>
              </div>
              <button onClick={() => setShowDispatchModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {dispatchError && (
              <div style={{ marginBottom: 16, padding: '10px 12px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: '0.75rem', fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{dispatchError}</span>
              </div>
            )}

            {loadingRecs ? (
              <div style={{ textAlign: 'center', padding: '60px 0', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, border: '3px solid rgba(249, 115, 22, 0.2)', borderRadius: '50%', borderTopColor: '#f97316', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Running recommendation algorithms...</span>
              </div>
            ) : recommendations.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflowY: 'auto', paddingRight: 4 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                  Ranked Match Options ({recommendations.length})
                </span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recommendations.map((rec, index) => {
                    const isSelected = selectedRecIndex === index;
                    const isBest = index === 0;

                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedRecIndex(index)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '40px 1fr 1fr 100px',
                          alignItems: 'center',
                          padding: 14,
                          borderRadius: 10,
                          border: isSelected ? '2px solid #f97316' : '1px solid #e2e8f0',
                          background: isSelected ? '#ffedd5' : '#fff',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 150ms ease'
                        }}
                      >
                        {/* Rank Badge */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <span style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: isBest ? '#f97316' : '#e2e8f0',
                            color: isBest ? '#fff' : '#475569',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 700
                          }}>
                            {index + 1}
                          </span>
                        </div>

                        {/* Vehicle */}
                        <div style={{ paddingLeft: 8 }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Vehicle</span>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8rem', display: 'block' }}>
                            {rec.vehicle.registrationNumber}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#475569' }}>
                            {rec.vehicle.model} ({rec.vehicle.type})
                          </span>
                        </div>

                        {/* Driver */}
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Driver</span>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8rem', display: 'block' }}>
                            {rec.driver.fullName}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#475569', display: 'block' }}>
                            Safety: <strong style={{ color: '#166534' }}>{rec.driver.safetyScore}%</strong> · Duty: <strong>{rec.driver.rollingDutyHours}h</strong>
                          </span>
                        </div>

                        {/* Score */}
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            fontSize: '1rem', fontWeight: 800,
                            color: isBest ? '#ea580c' : '#475569'
                          }}>
                            {rec.score}%
                          </span>
                          <span style={{ display: 'block', fontSize: '0.6rem', color: '#64748b', marginTop: 2 }}>Match Score</span>
                        </div>

                        {/* Recommendation Breakdown */}
                        {isSelected && (
                          <div style={{
                            gridColumn: '1 / -1',
                            marginTop: 10,
                            paddingTop: 10,
                            borderTop: '1px solid rgba(249, 115, 22, 0.15)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.65rem',
                            color: '#64748b'
                          }}>
                            <span>Safety Score: <strong style={{ color: '#0f172a' }}>{rec.breakdown.safetyScore}%</strong></span>
                            <span>Capacity Fit: <strong style={{ color: '#0f172a' }}>{rec.breakdown.capacityFit}%</strong></span>
                            <span>Fatigue Risk: <strong style={{ color: '#0f172a' }}>{rec.breakdown.fatigue}%</strong></span>
                            <span>Vehicle Wear: <strong style={{ color: '#0f172a' }}>{rec.breakdown.vehicleWear}%</strong></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={32} color="#f59e0b" style={{ marginBottom: 12 }} />
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>No available vehicles and drivers match compliance checks.</p>
              </div>
            )}

            <div style={{ display: 'flex', justifySelf: 'flex-end', gap: 10, marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              <button onClick={() => setShowDispatchModal(false)} className="btn-secondary" style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                Cancel
              </button>
              <button
                disabled={recommendations.length === 0}
                onClick={handleConfirmDispatch}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: recommendations.length === 0 ? '#cbd5e1' : '#f97316',
                  color: '#fff',
                  cursor: recommendations.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                Confirm Dispatch & Release
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
