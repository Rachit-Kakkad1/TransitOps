import React, { useState } from 'react';
import { 
  FileText, Navigation, Truck, Users, AlertTriangle, 
  MapPin, Plus, Play, CheckCircle2, XCircle, X, Award, 
  ArrowRight, Activity, Calendar, Bell, Clock
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import { tripService } from '../../services/tripService';

export default function DispatcherDashboard({ 
  kpis, 
  pendingTrips = [], 
  activeTrips = [], 
  vehicles = [], 
  drivers = [],
  onRefresh
}) {
  // Modal/Drawer States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  
  // Recommendations State
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [selectedRecIndex, setSelectedRecIndex] = useState(0);
  const [dispatchError, setDispatchError] = useState('');
  const [formError, setFormError] = useState('');

  // Expense Form State (Hidden/Unused for Dispatcher, but kept for method ref safety if needed)
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseError, setExpenseError] = useState('');
  const [expenseFormData, setExpenseFormData] = useState({
    category: 'fuel',
    cost: '',
    liters: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    source: '',
    destination: '',
    cargoWeightKg: '',
    plannedDistanceKm: '',
    vehicleId: '',
    driverId: '',
  });

  // Operational Conflict checks for display in the queue card
  const getConflicts = (trip) => {
    const conflicts = [];
    
    // 1. Assignment checks
    if (!trip.vehicle || trip.vehicle === 'Unassigned') {
      conflicts.push({
        type: 'unassigned_vehicle',
        message: 'No vehicle assigned',
        severity: 'warning'
      });
    }
    if (!trip.driver || trip.driver === 'Unassigned') {
      conflicts.push({
        type: 'unassigned_driver',
        message: 'No driver assigned',
        severity: 'warning'
      });
    }

    // 2. Capacity Guard Check
    if (trip.cargoWeightKg && trip.vehicleMaxLoadCapacityKg) {
      if (trip.cargoWeightKg > trip.vehicleMaxLoadCapacityKg) {
        conflicts.push({
          type: 'overweight',
          message: `Cargo (${trip.cargoWeightKg.toLocaleString()} kg) exceeds vehicle capacity (${trip.vehicleMaxLoadCapacityKg.toLocaleString()} kg)`,
          severity: 'error'
        });
      }
    }

    // 3. Duty Hour Check
    if (trip.driverRollingDutyHours && trip.driverRollingDutyHours > 10) {
      conflicts.push({
        type: 'duty_hours',
        message: `Driver rolling duty hours (${trip.driverRollingDutyHours} hrs) exceed 10-hour limit`,
        severity: 'error'
      });
    }

    return conflicts;
  };

  const handleOpenCreate = () => {
    setFormData({
      source: '',
      destination: '',
      cargoWeightKg: '',
      plannedDistanceKm: '',
      vehicleId: '',
      driverId: '',
    });
    setFormError('');
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
    setFormError('');
    try {
      await tripService.createTrip(formData);
      setShowCreateModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setFormError(err.message || 'Failed to create trip');
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
      if (onRefresh) onRefresh();
    } catch (err) {
      setDispatchError(err.message || 'Dispatch failed');
    }
  };

  const handleCompleteTrip = async (id) => {
    if (!window.confirm('Are you sure you want to mark this trip as completed?')) return;
    try {
      await tripService.completeTrip(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to complete trip');
    }
  };

  const handleCancelTrip = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this trip?')) return;
    try {
      await tripService.cancelTrip(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to cancel trip');
    }
  };

  const handleShareTracking = (token) => {
    if (!token) {
      alert("No tracking token found for this trip. Re-dispatch the trip to generate a tracking link.");
      return;
    }
    const trackingUrl = `${window.location.origin}/track/${token}`;
    navigator.clipboard.writeText(trackingUrl)
      .then(() => alert(`Public tracking link copied to clipboard:\n${trackingUrl}`))
      .catch(() => alert(`Public tracking URL:\n${trackingUrl}`));
  };

  const handleOpenExpenseModal = (trip) => {
    setSelectedTrip(trip);
    setExpenseError('');
    setExpenseFormData({
      category: 'fuel',
      cost: '',
      liters: ''
    });
    setShowExpenseModal(true);
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setExpenseError('');
    try {
      await tripService.logExpense(selectedTrip.id, expenseFormData);
      setShowExpenseModal(false);
      alert('Expense logged successfully!');
      if (onRefresh) onRefresh();
    } catch (err) {
      setExpenseError(err.message || 'Failed to log expense');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard icon={FileText} label="Pending Dispatches" value={kpis.pendingCount} sub="Trips in draft queue" />
        <StatCard icon={Navigation} label="Active Trips" value={kpis.activeCount} sub="Vehicles in transit" />
        <StatCard icon={CheckCircle2} label="Today's Completed" value={1} sub="Cargo delivered today" />
        <StatCard icon={AlertTriangle} label="Delayed Trips" value={1} sub="Behind schedule" />
        <StatCard icon={Truck} label="Available Vehicles" value={kpis.availableVehiclesCount} sub="Ready to roll" />
        <StatCard icon={Users} label="Available Drivers" value={kpis.availableDriversCount} sub="On-duty roster" />
      </div>

      {/* Main content split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, alignItems: 'start' }}>
        
        {/* Left Side: Dispatch Queue, Active Operations & Live Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Dispatch Queue (Pending Dispatches) */}
          <div className="card-premium">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="#f97316" /> Dispatch Queue (Pending)
              </h3>
              <button 
                onClick={handleOpenCreate}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 4, 
                  padding: '6px 10px', borderRadius: 8, border: 'none', 
                  background: '#f97316', color: '#fff', cursor: 'pointer', 
                  fontSize: '0.75rem', fontWeight: 700 
                }}
              >
                <Plus size={14} /> Create Trip
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {pendingTrips.length > 0 ? (
                pendingTrips.map(trip => {
                  const conflicts = getConflicts(trip);
                  const hasErrors = conflicts.some(c => c.severity === 'error');
                  const hasWarnings = conflicts.some(c => c.severity === 'warning');

                  return (
                    <div 
                      key={trip.id} 
                      style={{ 
                        padding: 16, 
                        background: '#ffffff', 
                        border: hasErrors 
                          ? '1px solid #fee2e2' 
                          : hasWarnings 
                            ? '1px solid #fef3c7' 
                            : '1px solid #f1f5f9', 
                        borderRadius: 10,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f8fafc', paddingBottom: 10, marginBottom: 10 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                            <MapPin size={14} color="#f97316" />
                            <span>{trip.source}</span>
                            <span style={{ color: '#94a3b8', fontWeight: 400 }}>&rarr;</span>
                            <span>{trip.destination}</span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: 2 }}>
                            Planned Distance: <strong>{trip.plannedDistanceKm} km</strong> · Cargo Weight: <strong>{trip.cargoWeightKg.toLocaleString()} kg</strong>
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <StatusChip status="Draft" />
                          <button
                            onClick={() => handleOpenDispatch(trip)}
                            style={{ 
                              padding: '5px 10px', background: '#ffedd5', color: '#ea580c', 
                              border: '1px solid #fed7aa', borderRadius: 6, fontWeight: 700, 
                              fontSize: '0.7rem', cursor: 'pointer' 
                            }}
                          >
                            Dispatch
                          </button>
                          <button
                            onClick={() => handleCancelTrip(trip.id)}
                            style={{ 
                              padding: '5px 8px', background: '#fff', color: '#ef4444', 
                              border: '1px solid #fee2e2', borderRadius: 6, fontWeight: 600, 
                              fontSize: '0.7rem', cursor: 'pointer' 
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>

                      {/* Assignments info */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.8rem', color: '#475569' }}>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Vehicle</span>
                          <span style={{ fontWeight: 600, color: trip.vehicle === 'Unassigned' ? '#94a3b8' : '#0f172a' }}>
                            {trip.vehicle}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Driver</span>
                          <span style={{ fontWeight: 600, color: trip.driver === 'Unassigned' ? '#94a3b8' : '#0f172a' }}>
                            {trip.driver}
                          </span>
                        </div>
                      </div>

                      {/* Operational Conflicts Display */}
                      {conflicts.length > 0 && (
                        <div 
                          style={{ 
                            marginTop: 12, 
                            padding: '10px 12px', 
                            background: hasErrors ? '#fef2f2' : '#fffbeb', 
                            borderRadius: 8, 
                            borderLeft: hasErrors ? '3px solid #ef4444' : '3px solid #f59e0b',
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 6 
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: hasErrors ? '#991b1b' : '#92400e' }}>
                            <AlertTriangle size={14} />
                            <span>Operational Checks Flagged ({conflicts.length})</span>
                          </div>
                          {conflicts.map((conf, idx) => (
                            <span 
                              key={idx} 
                              style={{ 
                                fontSize: '0.725rem', 
                                color: conf.severity === 'error' ? '#b91c1c' : '#b45309',
                                fontWeight: 500
                              }}
                            >
                              • {conf.message}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0', border: '1px dashed #e2e8f0', borderRadius: 8 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>No pending dispatches in queue.</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Operations queue */}
          <div className="card-premium">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Navigation size={18} color="#f97316" /> Active Operations ({activeTrips.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activeTrips.length > 0 ? activeTrips.map(trip => (
                <div key={trip.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                      {trip.source} &rarr; {trip.destination}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                      Vehicle: <strong style={{ color: '#334155' }}>{trip.vehicle}</strong> · Driver: <strong style={{ color: '#334155' }}>{trip.driver}</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <StatusChip status="Dispatched" />
                      {trip.dispatchedAt && (
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                          Disp: {new Date(trip.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleShareTracking(trip.publicTrackingToken)}
                      style={{ 
                        padding: '6px 10px', background: '#e0f2fe', color: '#0369a1', 
                        border: '1px solid #bae6fd', borderRadius: 6, fontWeight: 600, 
                        fontSize: '0.75rem', cursor: 'pointer' 
                      }}
                    >
                      Share Link
                    </button>
                    <button
                      onClick={() => handleCompleteTrip(trip.id)}
                      style={{ 
                        padding: '6px 12px', background: '#dcfce7', color: '#166534', 
                        border: '1px solid #bbf7d0', borderRadius: 6, fontWeight: 700, 
                        fontSize: '0.75rem', cursor: 'pointer' 
                      }}
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => handleCancelTrip(trip.id)}
                      style={{ 
                        padding: '6px 10px', background: '#fff', color: '#ef4444', 
                        border: '1px solid #fee2e2', borderRadius: 6, fontWeight: 600, 
                        fontSize: '0.75rem', cursor: 'pointer' 
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )) : (
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No active dispatches</p>
              )}
            </div>
          </div>

          {/* Trip Timeline */}
          <div className="card-premium">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} color="#f97316" /> Trip Timeline & Activity Logs
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', paddingLeft: 8 }}>
              <div style={{ display: 'flex', gap: 10, fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ width: 2, height: 24, background: '#cbd5e1', margin: '4px 0' }} />
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>Completed Trip: Retail Hub B delivery successful</span>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                    Driver Rajesh Kumar checked in · 20 mins ago
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                  <span style={{ width: 2, height: 24, background: '#cbd5e1', margin: '4px 0' }} />
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>Dispatched Trip: Factory Depot route active</span>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                    Ashok Leyland Dost released under Harish Verma · 1 hr ago
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>Operational Alert: Driver fatigue flagged</span>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                    Amit Patel rolling duty hours at 12 hours · 2 hrs ago
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Available Resources, Dispatch Calendar & Recent Notifications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Dispatch Calendar Card */}
          <div className="card-premium">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} color="#f97316" /> Dispatch Calendar
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, textAlign: 'center', fontSize: '0.75rem' }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <span key={i} style={{ color: '#94a3b8', fontWeight: 700 }}>{day}</span>
              ))}
              {Array.from({ length: 28 }, (_, i) => {
                const dateNum = i + 1;
                const isToday = dateNum === 12; // current date
                const hasDispatches = dateNum === 12 || dateNum === 13 || dateNum === 15;
                return (
                  <div 
                    key={i} 
                    style={{
                      padding: '6px 0',
                      borderRadius: 6,
                      background: isToday ? '#f97316' : hasDispatches ? '#ffedd5' : 'transparent',
                      color: isToday ? '#fff' : hasDispatches ? '#ea580c' : '#475569',
                      fontWeight: (isToday || hasDispatches) ? 700 : 500,
                      cursor: 'pointer',
                      border: isToday ? 'none' : hasDispatches ? '1px solid #fed7aa' : 'none'
                    }}
                    title={hasDispatches ? 'Scheduled dispatches' : 'No dispatches'}
                  >
                    {dateNum}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Notifications Card */}
          <div className="card-premium">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={18} color="#f97316" /> Recent Notifications
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '0.75rem', padding: '8px 12px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontWeight: 500 }}>
                &#9888; Driver Sanjay Singh license has expired!
              </div>
              <div style={{ fontSize: '0.75rem', padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, color: '#92400e', fontWeight: 500 }}>
                &#9888; Vehicle GJ-01-ZZ-1111 entered shop for maintenance.
              </div>
              <div style={{ fontSize: '0.75rem', padding: '8px 12px', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 8, color: '#166534', fontWeight: 500 }}>
                &check; Trip completed successfully: Factory Depot route done.
              </div>
            </div>
          </div>

          {/* Available Drivers List */}
          <div className="card-premium">
            <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={16} color="#f97316" /> Available Drivers ({drivers.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {drivers.length > 0 ? drivers.map(d => {
                const dutyHours = parseFloat(d.rollingDutyHours);
                const isOverLimit = dutyHours > 10;
                
                return (
                  <div 
                    key={d.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      fontSize: '0.8rem', 
                      paddingBottom: 8, 
                      borderBottom: '1px solid #f8fafc' 
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: '#0f172a', display: 'block' }}>{d.fullName}</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Safety: <strong style={{ color: '#166534' }}>{parseFloat(d.safetyScore)}%</strong>
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span 
                        style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 700, 
                          color: isOverLimit ? '#b91c1c' : '#475569' 
                        }}
                      >
                        {dutyHours} hrs duty
                      </span>
                      {isOverLimit && (
                        <span style={{ display: 'block', fontSize: '0.65rem', color: '#ef4444', fontWeight: 600 }}>
                          (Over 10h limit)
                        </span>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '10px 0' }}>No available drivers</p>
              )}
            </div>
          </div>

          {/* Available Vehicles List */}
          <div className="card-premium">
            <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Truck size={16} color="#f97316" /> Available Vehicles ({vehicles.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vehicles.length > 0 ? vehicles.map(v => (
                <div 
                  key={v.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    fontSize: '0.8rem', 
                    paddingBottom: 8, 
                    borderBottom: '1px solid #f8fafc' 
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: '#0f172a', display: 'block' }}>{v.registrationNumber}</span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{v.model}</span>
                  </div>
                  <span 
                    style={{ 
                      fontSize: '0.725rem', 
                      padding: '3px 8px', 
                      background: '#f1f5f9', 
                      borderRadius: 12, 
                      color: '#475569', 
                      fontWeight: 600 
                    }}
                  >
                    {v.type}
                  </span>
                </div>
              )) : (
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '10px 0' }}>No available vehicles</p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* CREATE DRAFT TRIP MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card-premium" style={{ width: '100%', maxWidth: 500, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Create Draft Trip</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ marginBottom: 16, padding: '10px 12px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: '0.75rem', fontWeight: 600, display: 'flex', gap: 6 }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Source Hub</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Warehouse A"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Destination Hub</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Retail Depot 5"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Cargo Weight (kg)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1200"
                    value={formData.cargoWeightKg}
                    onChange={(e) => setFormData({ ...formData, cargoWeightKg: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Planned Distance (km)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 150"
                    value={formData.plannedDistanceKm}
                    onChange={(e) => setFormData({ ...formData, plannedDistanceKm: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Assign Vehicle (Optional)</label>
                <select
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', background: '#fff' }}
                >
                  <option value="">Unassigned (Select later during dispatch)</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registrationNumber} - {v.model} ({v.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Assign Driver (Optional)</label>
                <select
                  value={formData.driverId}
                  onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', background: '#fff' }}
                >
                  <option value="">Unassigned (Select later during dispatch)</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.fullName} (Safety: {parseFloat(d.safetyScore)}%, Duty: {parseFloat(d.rollingDutyHours)}h)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifySelf: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary" style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
                  Create Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH RECOMMENDATIONS MODAL */}
      {showDispatchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card-premium" style={{ width: '100%', maxWidth: 680, padding: 24, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Award size={20} color="#f97316" /> Smart Dispatch Recommendations
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Trip: <strong>{selectedTrip?.source} &rarr; {selectedTrip?.destination}</strong> ({selectedTrip?.cargoWeightKg} kg, {selectedTrip?.plannedDistanceKm} kg)
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
                          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Vehicle details</span>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8rem', display: 'block' }}>
                            {rec.vehicle.registrationNumber}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#475569' }}>
                            {rec.vehicle.model} ({rec.vehicle.type})
                          </span>
                        </div>

                        {/* Driver */}
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Driver details</span>
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
                            <span>Driver Safety: <strong style={{ color: '#0f172a' }}>{rec.breakdown.safetyScore}%</strong></span>
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
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Check if drivers are active, licenses are unexpired, and vehicle capacity is sufficient.</p>
              </div>
            )}

            {/* Warning if overriding best recommendation */}
            {!loadingRecs && recommendations.length > 0 && selectedRecIndex > 0 && (
              <div style={{ marginTop: 14, padding: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.725rem', color: '#b45309', fontWeight: 600 }}>
                  <strong>Recommendation Override Flagged</strong>: You are choosing option #{selectedRecIndex + 1} instead of the top-ranked recommendation. This override will be logged for analytical review.
                </span>
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
