import React, { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, AlertTriangle, Play, CheckCircle2, Shield, Calendar, Clock, Award } from 'lucide-react';
import { tripService } from '../../services/tripService';
import StatusChip from '../../components/ui/StatusChip';

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [draftTrips, setDraftTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [assignError, setAssignError] = useState('');

  const fetchDriversData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch live trips
      const tripsData = await tripService.getTrips();
      // Keep only draft trips for assigning
      setDraftTrips(tripsData.filter(t => t.status === 'draft'));

      // 2. Fetch dashboard overview to get available drivers
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const overviewRes = await fetch(`${API_URL}/api/dashboard/overview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const overviewData = await overviewRes.json();
      const liveAvailable = (overviewRes.ok && overviewData.success) ? (overviewData.data.availableDrivers || []) : [];

      // 3. Define seeded base list
      const baseDrivers = [
        { id: 'd1', fullName: 'Rajesh Kumar', licenseNumber: 'DL-1420180098765', licenseCategory: 'HMV', licenseExpiry: '2032-12-31', contact: '+919876543210', status: 'available', safetyScore: 94.5, rollingDutyHours: 4.5 },
        { id: 'd2', fullName: 'Amit Patel', licenseNumber: 'GJ-0120150045612', licenseCategory: 'LMV', licenseExpiry: '2030-05-15', contact: '+919988776655', status: 'available', safetyScore: 88.0, rollingDutyHours: 12.0 },
        { id: 'd3', fullName: 'Sanjay Singh', licenseNumber: 'MH-1220100012345', licenseCategory: 'HMV', licenseExpiry: '2024-01-01', contact: '+919123456789', status: 'available', safetyScore: 85.0, rollingDutyHours: 0.0 },
        { id: 'd4', fullName: 'Vikram Rathore', licenseNumber: 'KA-0520200054321', licenseCategory: 'HMV', licenseExpiry: '2035-08-20', contact: '+918877665544', status: 'suspended', safetyScore: 55.0, rollingDutyHours: 0.0 },
        { id: 'd5', fullName: 'Harish Verma', licenseNumber: 'UP-1620170088990', licenseCategory: 'HMV', licenseExpiry: '2031-10-10', contact: '+917766554433', status: 'available', safetyScore: 96.0, rollingDutyHours: 2.0 },
      ];

      // 4. Merge
      const driverMap = new Map();
      baseDrivers.forEach(d => driverMap.set(d.fullName, d));

      // Overwrite/merge with drivers from trips
      tripsData.forEach(t => {
        if (t.driver) {
          const existing = driverMap.get(t.driver.fullName) || {};
          const merged = {
            ...existing,
            ...t.driver,
            status: t.status === 'dispatched' ? 'on_trip' : (t.driver.status || existing.status || 'available')
          };
          if (t.driver.id) merged.id = t.driver.id;
          driverMap.set(t.driver.fullName, merged);
        }
      });

      // Overwrite/merge with availableDrivers from overview
      liveAvailable.forEach(d => {
        const existing = driverMap.get(d.fullName) || {};
        const merged = {
          ...existing,
          ...d,
          status: 'available'
        };
        if (d.id) merged.id = d.id;
        driverMap.set(d.fullName, merged);
      });

      setDrivers(Array.from(driverMap.values()));
    } catch (err) {
      setError(err.message || 'Failed to load drivers data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriversData();
  }, []);

  const handleOpenAssign = (driver) => {
    if (driver.status === 'suspended') {
      alert(`Driver ${driver.fullName} is suspended and cannot be assigned.`);
      return;
    }
    const isExpired = new Date(driver.licenseExpiry) < new Date();
    if (isExpired) {
      alert(`Driver ${driver.fullName} has an expired license and cannot be assigned.`);
      return;
    }
    setSelectedDriver(driver);
    setAssignError('');
    setShowAssignModal(true);
  };

  const handleAssignTrip = async (trip) => {
    setAssignError('');
    try {
      // Check duty hours fatigue limit
      if (selectedDriver.rollingDutyHours > 10) {
        if (!window.confirm(`Warning: Driver rolling duty hours (${selectedDriver.rollingDutyHours} hrs) exceed 10-hour limit. Do you want to proceed anyway?`)) {
          return;
        }
      }

      await tripService.updateTrip(trip.id, {
        source: trip.source,
        destination: trip.destination,
        cargoWeightKg: trip.cargoWeightKg,
        plannedDistanceKm: trip.plannedDistanceKm,
        vehicleId: trip.vehicle?.id || '',
        driverId: selectedDriver.id
      });

      alert(`Driver ${selectedDriver.fullName} assigned to Trip ${trip.source} → ${trip.destination}`);
      setShowAssignModal(false);
      fetchDriversData();
    } catch (err) {
      setAssignError(err.message || 'Failed to assign driver');
    }
  };

  // Filter and search
  const filteredDrivers = drivers.filter(d => {
    const searchStr = `${d.fullName} ${d.licenseNumber} ${d.contact}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusLabel = (status) => {
    switch (status) {
      case 'available': return 'Available';
      case 'on_trip': return 'On Trip';
      case 'suspended': return 'Suspended';
      default: return status;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Driver Profiles</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Monitor operator rosters, verify licenses, check rolling duty hours, review safety scores, and make dispatch assignments.
          </p>
        </div>
        <button 
          onClick={fetchDriversData} 
          className="btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Filter and Search Panel */}
      <div className="card-premium" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', background: '#fff' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="available">Available</option>
            <option value="on_trip">On Trip</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: 280 }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12 }} />
          <input
            type="text"
            placeholder="Search driver name or license..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Drivers List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(249, 115, 22, 0.2)', borderRadius: '50%', borderTopColor: '#f97316', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Loading drivers roster...</span>
        </div>
      ) : error ? (
        <div style={{ padding: '24px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, color: '#991b1b' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800 }}>Error</h3>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>{error}</p>
        </div>
      ) : filteredDrivers.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filteredDrivers.map(driver => {
            const isSuspended = driver.status === 'suspended';
            const isAvail = driver.status === 'available';
            
            const isExpired = new Date(driver.licenseExpiry) < new Date();
            const dutyHours = parseFloat(driver.rollingDutyHours) || 0;
            const isFatigued = dutyHours > 10;
            const score = parseFloat(driver.safetyScore) || 0;
            
            return (
              <div 
                key={driver.fullName} 
                className="card-premium"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  borderLeft: isSuspended ? '4px solid #ef4444' : isAvail ? '4px solid #10b981' : '4px solid #3b82f6'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{driver.fullName}</h3>
                    <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Roster Contact: {driver.contact}</span>
                  </div>
                  <StatusChip status={isSuspended ? 'Suspended' : driver.status === 'on_trip' ? 'On Trip' : getStatusLabel(driver.status)} />
                </div>

                {/* Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: '0.8rem', color: '#475569' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>License Category</span>
                    <strong style={{ color: '#0f172a' }}>{driver.licenseCategory}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>License Status</span>
                    <strong style={{ color: isExpired ? '#ef4444' : '#10b981' }}>
                      {isExpired ? 'Expired' : 'Valid'}
                    </strong>
                    {isExpired && (
                      <span style={{ display: 'block', fontSize: '0.65rem', color: '#ef4444', fontWeight: 600 }}>
                        (Exp: {new Date(driver.licenseExpiry).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Safety Score</span>
                    <strong style={{ color: score >= 90 ? '#166534' : score >= 80 ? '#b45309' : '#b91c1c' }}>
                      {score}%
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Duty Hours</span>
                    <strong style={{ color: isFatigued ? '#ef4444' : '#0f172a' }} className="mono">
                      {dutyHours} hrs
                    </strong>
                    {isFatigued && (
                      <span style={{ display: 'block', fontSize: '0.65rem', color: '#ef4444', fontWeight: 600 }}>
                        (Fatigued &gt; 10h)
                      </span>
                    )}
                  </div>
                </div>

                {/* License Number */}
                <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 8, fontSize: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 600 }}>License Number</span>
                  <span className="mono" style={{ fontWeight: 700, color: '#334155' }}>{driver.licenseNumber}</span>
                </div>

                {/* Actions */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    disabled={isSuspended || isExpired}
                    onClick={() => handleOpenAssign(driver)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: (isSuspended || isExpired) ? '#cbd5e1' : '#f97316',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: (isSuspended || isExpired) ? 'not-allowed' : 'pointer',
                      transition: 'background-color 150ms ease'
                    }}
                    onMouseOver={(e) => { if (!isSuspended && !isExpired) e.currentTarget.style.backgroundColor = '#ea580c'; }}
                    onMouseOut={(e) => { if (!isSuspended && !isExpired) e.currentTarget.style.backgroundColor = '#f97316'; }}
                  >
                    Assign Driver
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed #e2e8f0', borderRadius: 16 }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>No drivers found matching filters.</p>
        </div>
      )}

      {/* ASSIGN TRIP MODAL */}
      {showAssignModal && selectedDriver && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card-premium" style={{ width: '100%', maxWidth: 520, padding: 24, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Assign {selectedDriver.fullName}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Select a pending draft dispatch queue item to allocate this driver (Duty hours: <strong>{selectedDriver.rollingDutyHours} hrs</strong>).
                </p>
              </div>
              <button 
                onClick={() => setShowAssignModal(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            {assignError && (
              <div style={{ marginBottom: 16, padding: '10px 12px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: '0.75rem', fontWeight: 600, display: 'flex', gap: 6 }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{assignError}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1, paddingRight: 4 }}>
              {draftTrips.length > 0 ? (
                draftTrips.map(trip => {
                  return (
                    <div 
                      key={trip.id} 
                      style={{ 
                        padding: 12, 
                        border: '1px solid #e2e8f0', 
                        borderRadius: 8, 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        background: '#fff'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', display: 'block' }}>
                          {trip.source} &rarr; {trip.destination}
                        </span>
                        <span style={{ fontSize: '0.725rem', color: '#64748b', display: 'block', marginTop: 2 }}>
                          Cargo: {trip.cargoWeightKg.toLocaleString()} kg · Dist: {trip.plannedDistanceKm} km
                        </span>
                      </div>
                      <button
                        onClick={() => handleAssignTrip(trip)}
                        style={{
                          padding: '5px 10px',
                          background: '#ffedd5',
                          color: '#ea580c',
                          border: '1px solid #fed7aa',
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          cursor: 'pointer'
                        }}
                      >
                        Assign Here
                      </button>
                    </div>
                  );
                })
              ) : (
                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '20px 0' }}>
                  No pending draft trips currently available for assignment. Create a trip first.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
