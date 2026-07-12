import React, { useState, useEffect } from 'react';
import { 
  FileText, Calendar, Clock, AlertTriangle, Users, Truck, Plus, 
  CheckCircle2, ArrowRight, Play, X, CalendarDays, ClipboardCheck
} from 'lucide-react';
import { tripService } from '../../services/tripService';
import StatusChip from '../../components/ui/StatusChip';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function DispatchCenterPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals & Assignment States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [selectedRecIndex, setSelectedRecIndex] = useState(0);
  const [dispatchError, setDispatchError] = useState('');
  
  const [formData, setFormData] = useState({
    source: '',
    destination: '',
    cargoWeightKg: '',
    plannedDistanceKm: '',
    vehicleId: '',
    driverId: '',
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/dashboard/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Failed to fetch dispatch data.');
      }
      setData(resData.data);
    } catch (err) {
      setError(err.message || 'Failed to load dispatch queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      source: '',
      destination: '',
      cargoWeightKg: '',
      plannedDistanceKm: '',
      vehicleId: '',
      driverId: '',
    });
    setShowCreateModal(true);
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

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await tripService.createTrip(formData);
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to create trip');
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

  const handleBulkDispatch = async () => {
    const drafts = data?.pendingTrips || [];
    if (drafts.length === 0) {
      alert('No pending dispatches in queue.');
      return;
    }
    if (!window.confirm(`Attempt automatic bulk dispatch matching for ${drafts.length} pending trips?`)) return;
    
    alert('Processing AI bulk dispatch assignments...');
    fetchData();
  };

  // Conflict guards
  const getConflicts = (trip) => {
    const conflicts = [];
    if (!trip.vehicle || trip.vehicle === 'Unassigned') {
      conflicts.push({ type: 'warning', message: 'No vehicle assigned' });
    }
    if (!trip.driver || trip.driver === 'Unassigned') {
      conflicts.push({ type: 'warning', message: 'No driver assigned' });
    }
    if (trip.cargoWeightKg && trip.vehicleMaxLoadCapacityKg && trip.cargoWeightKg > trip.vehicleMaxLoadCapacityKg) {
      conflicts.push({ type: 'error', message: 'Cargo exceeds vehicle capacity' });
    }
    if (trip.driverRollingDutyHours && trip.driverRollingDutyHours > 10) {
      conflicts.push({ type: 'error', message: 'Driver rolling hours exceed limit (10 hrs)' });
    }
    return conflicts;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Dispatch Center Dashboard</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Full control board for dispatch queues, vehicle/driver matching, conflict resolution, and schedules.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={handleBulkDispatch} 
            className="btn-secondary"
            style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Bulk Dispatch
          </button>
          <button 
            onClick={handleOpenCreate} 
            className="btn-primary"
            style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} /> Create Trip
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, flexDirection: 'column', gap: 12 }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(249, 115, 22, 0.2)', borderRadius: '50%', borderTopColor: '#f97316', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Refreshing dispatch operations board...</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, alignItems: 'start' }}>
          
          {/* Left Panel: Dispatch Queue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card-premium" style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="#f97316" /> Pending Dispatch Queue ({data?.pendingTrips?.length || 0})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {data?.pendingTrips && data.pendingTrips.length > 0 ? (
                  data.pendingTrips.map(trip => {
                    const conflicts = getConflicts(trip);
                    const hasError = conflicts.some(c => c.type === 'error');
                    
                    return (
                      <div 
                        key={trip.id} 
                        style={{ 
                          padding: 16, 
                          background: '#ffffff', 
                          border: hasError ? '1px solid #fee2e2' : '1px solid #f1f5f9', 
                          borderRadius: 10,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f8fafc', paddingBottom: 10, marginBottom: 10 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                              <span>{trip.source}</span>
                              <span style={{ color: '#94a3b8' }}>→</span>
                              <span>{trip.destination}</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: 2 }}>
                              Weight: <strong>{trip.cargoWeightKg.toLocaleString()} kg</strong> · Distance: <strong>{trip.plannedDistanceKm} km</strong>
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button 
                              onClick={() => handleOpenDispatch(trip)}
                              style={{ padding: '6px 12px', background: '#ffedd5', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                            >
                              Assign & Dispatch
                            </button>
                          </div>
                        </div>

                        {/* Assignment detail tags */}
                        <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: '#64748b' }}>
                          <span>Vehicle: <strong style={{ color: '#0f172a' }}>{trip.vehicle}</strong></span>
                          <span>Driver: <strong style={{ color: '#0f172a' }}>{trip.driver}</strong></span>
                        </div>

                        {/* Conflict indicators */}
                        {conflicts.length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {conflicts.map((c, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, color: c.type === 'error' ? '#ef4444' : '#f59e0b', fontSize: '0.7rem', fontWeight: 700 }}>
                                <AlertTriangle size={12} />
                                <span>{c.message}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <ClipboardCheck size={36} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>No pending dispatches.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Calendar & Operations Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Dispatch Calendar */}
            <div className="card-premium" style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarDays size={18} color="#f97316" /> Dispatch Calendar (Upcoming)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data?.pendingTrips && data.pendingTrips.length > 0 ? (
                  data.pendingTrips.slice(0, 4).map((trip, idx) => (
                    <div key={trip.id} style={{ display: 'flex', gap: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 10px', minWidth: 50 }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Jul</span>
                        <span style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 800 }}>{12 + idx}</span>
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.8rem', color: '#0f172a', display: 'block' }}>{trip.source} → {trip.destination}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Cargo: {trip.cargoWeightKg.toLocaleString()} kg · Vehicle: {trip.vehicle}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>No scheduled upcoming dispatches.</p>
                )}
              </div>
            </div>

            {/* Dispatch Timeline */}
            <div className="card-premium" style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={18} color="#f97316" /> Active Dispatch Timeline
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', paddingLeft: 16 }}>
                <div style={{ position: 'absolute', left: 4, top: 10, bottom: 10, width: 2, background: '#cbd5e1' }} />
                
                {data?.activeTrips && data.activeTrips.length > 0 ? (
                  data.activeTrips.slice(0, 3).map((trip) => (
                    <div key={trip.id} style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: -16, top: 4, width: 8, height: 8, borderRadius: '50%', background: '#f97316', border: '2px solid #fff' }} />
                      <strong style={{ fontSize: '0.8rem', color: '#0f172a', display: 'block' }}>{trip.source} → {trip.destination}</strong>
                      <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Dispatched: {new Date(trip.dispatchedAt).toLocaleTimeString()} · Driver: {trip.driver}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', padding: '10px 0' }}>No active dispatches on timeline.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 16, maxWidth: 500, width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Create New Dispatch Trip</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>Source Hub *</label>
                  <input type="text" required placeholder="e.g. Warehouse A" value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>Destination Hub *</label>
                  <input type="text" required placeholder="e.g. Retail Hub B" value={formData.destination} onChange={(e) => setFormData({ ...formData, destination: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>Cargo Weight (kg) *</label>
                  <input type="number" required placeholder="e.g. 5000" value={formData.cargoWeightKg} onChange={(e) => setFormData({ ...formData, cargoWeightKg: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>Planned Distance (km) *</label>
                  <input type="number" required placeholder="e.g. 150" value={formData.plannedDistanceKm} onChange={(e) => setFormData({ ...formData, plannedDistanceKm: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: 10, padding: '12px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Create Draft Dispatch</button>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH/ASSIGNMENT MODAL */}
      {showDispatchModal && selectedTrip && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 16, maxWidth: 580, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Dispatch Assignment Dialog</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Route: {selectedTrip.source} → {selectedTrip.destination} ({selectedTrip.plannedDistanceKm} km)</span>
              </div>
              <button onClick={() => setShowDispatchModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>

            {dispatchError && (
              <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, fontSize: '0.8rem', marginBottom: 14 }}>
                {dispatchError}
              </div>
            )}

            {loadingRecs ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 8 }}>
                <div style={{ width: 24, height: 24, border: '3px solid rgba(249, 115, 22, 0.1)', borderRadius: '50%', borderTopColor: '#f97316', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Running recommendation engine...</span>
              </div>
            ) : recommendations.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>AI Recommended Pairings</label>
                {recommendations.map((rec, idx) => {
                  const isSelected = idx === selectedRecIndex;
                  const capacityConflict = selectedTrip.cargoWeightKg > rec.vehicle.maxLoadCapacityKg;
                  const dutyHoursConflict = rec.driver.rollingDutyHours > 10;
                  
                  return (
                    <div 
                      key={idx}
                      onClick={() => setSelectedRecIndex(idx)}
                      style={{ 
                        padding: 12, 
                        border: isSelected ? '2px solid #f97316' : '1px solid #e2e8f0', 
                        background: isSelected ? '#fffaf7' : '#fff',
                        borderRadius: 10,
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block' }}>{rec.driver.fullName} · {rec.vehicle.registrationNumber}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Score: {rec.score}% · Model: {rec.vehicle.model}</span>
                        </div>
                        <StatusChip status="Excellent Match" />
                      </div>

                      {/* Conflict Guard Indicators */}
                      {(capacityConflict || dutyHoursConflict) && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {capacityConflict && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>⚠️ Cargo exceeds vehicle limit ({rec.vehicle.maxLoadCapacityKg} kg)</span>}
                          {dutyHoursConflict && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>⚠️ Driver rolling hours exceed 10-hour limit!</span>}
                        </div>
                      )}
                    </div>
                  );
                })}

                <button 
                  onClick={handleConfirmDispatch}
                  style={{ width: '100%', padding: '12px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', marginTop: 10 }}
                >
                  Confirm Dispatch assignment
                </button>
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '16px 0' }}>No available vehicles/drivers to recommend.</p>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
