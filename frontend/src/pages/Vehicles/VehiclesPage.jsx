import React, { useState, useEffect } from 'react';
import { Truck, Search, RefreshCw, AlertTriangle, Play, CheckCircle2, Wrench, Shield } from 'lucide-react';
import { tripService } from '../../services/tripService';
import StatusChip from '../../components/ui/StatusChip';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [draftTrips, setDraftTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [assignError, setAssignError] = useState('');

  const fetchVehiclesData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch live trips
      const tripsData = await tripService.getTrips();
      // Keep only draft trips for assigning
      setDraftTrips(tripsData.filter(t => t.status === 'draft'));

      // 2. Fetch dashboard overview to get available vehicles
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const overviewRes = await fetch(`${API_URL}/api/dashboard/overview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const overviewData = await overviewRes.json();
      const liveAvailable = (overviewRes.ok && overviewData.success) ? (overviewData.data.availableVehicles || []) : [];

      // 3. Define seeded base list
      const baseVehicles = [
        { id: 'v1', registrationNumber: 'MH-12-PQ-1234', model: 'Tata Intra V30', type: 'Van', maxLoadCapacityKg: 1300, odometerKm: 14200, status: 'available', acquisitionCost: 850000 },
        { id: 'v2', registrationNumber: 'DL-01-XY-5678', model: 'Ashok Leyland Dost', type: 'Mini Truck', maxLoadCapacityKg: 2500, odometerKm: 34500, status: 'available', acquisitionCost: 1200000 },
        { id: 'v3', registrationNumber: 'KA-03-AB-9999', model: 'BharatBenz 2823R', type: 'Heavy Truck', maxLoadCapacityKg: 18000, odometerKm: 98000, status: 'available', acquisitionCost: 3800000 },
        { id: 'v4', registrationNumber: 'GJ-01-ZZ-1111', model: 'Mahindra Bolero Pik-up', type: 'Pickup', maxLoadCapacityKg: 1700, odometerKm: 45000, status: 'in_shop', acquisitionCost: 950000 },
        { id: 'v5', registrationNumber: 'HR-55-CC-4444', model: 'Eicher Pro 2049', type: 'Box Truck', maxLoadCapacityKg: 3500, odometerKm: 185000, status: 'retired', acquisitionCost: 1600000 },
      ];

      // 4. Merge
      const vehicleMap = new Map();
      baseVehicles.forEach(v => vehicleMap.set(v.registrationNumber, v));

      // Overwrite/merge with vehicles from trips
      tripsData.forEach(t => {
        if (t.vehicle) {
          const existing = vehicleMap.get(t.vehicle.registrationNumber) || {};
          const merged = {
            ...existing,
            ...t.vehicle,
            status: t.status === 'dispatched' ? 'on_trip' : (existing.status || 'available')
          };
          if (t.vehicle.id) merged.id = t.vehicle.id;
          vehicleMap.set(t.vehicle.registrationNumber, merged);
        }
      });

      // Overwrite/merge with availableVehicles from overview
      liveAvailable.forEach(v => {
        const existing = vehicleMap.get(v.registrationNumber) || {};
        const merged = {
          ...existing,
          ...v,
          status: 'available'
        };
        if (v.id) merged.id = v.id;
        vehicleMap.set(v.registrationNumber, merged);
      });

      setVehicles(Array.from(vehicleMap.values()));
    } catch (err) {
      setError(err.message || 'Failed to load vehicles data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiclesData();
  }, []);

  const handleOpenAssign = (vehicle) => {
    if (vehicle.status !== 'available') {
      alert(`Vehicle ${vehicle.registrationNumber} is not currently available (Status: ${vehicle.status}).`);
      return;
    }
    setSelectedVehicle(vehicle);
    setAssignError('');
    setShowAssignModal(true);
  };

  const handleAssignTrip = async (trip) => {
    setAssignError('');
    try {
      // Check capacity conflict
      if (trip.cargoWeightKg > selectedVehicle.maxLoadCapacityKg) {
        if (!window.confirm(`Warning: Cargo weight (${trip.cargoWeightKg.toLocaleString()} kg) exceeds vehicle capacity (${selectedVehicle.maxLoadCapacityKg.toLocaleString()} kg). Do you want to proceed anyway?`)) {
          return;
        }
      }

      await tripService.updateTrip(trip.id, {
        source: trip.source,
        destination: trip.destination,
        cargoWeightKg: trip.cargoWeightKg,
        plannedDistanceKm: trip.plannedDistanceKm,
        vehicleId: selectedVehicle.id,
        driverId: trip.driver?.id || ''
      });

      alert(`Vehicle ${selectedVehicle.registrationNumber} assigned to Trip ${trip.source} → ${trip.destination}`);
      setShowAssignModal(false);
      fetchVehiclesData();
    } catch (err) {
      setAssignError(err.message || 'Failed to assign vehicle');
    }
  };

  // Filter and search
  const filteredVehicles = vehicles.filter(v => {
    const searchStr = `${v.registrationNumber} ${v.model} ${v.type}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || v.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusLabel = (status) => {
    switch (status) {
      case 'available': return 'Available';
      case 'on_trip': return 'On Trip';
      case 'in_shop': return 'In Shop';
      case 'retired': return 'Retired';
      default: return status;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Vehicle Registry</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Check fleet availability, view vehicle capacities, monitor maintenance status, and assign active trucks.
          </p>
        </div>
        <button 
          onClick={fetchVehiclesData} 
          className="btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Filter and Search Panel */}
      <div className="card-premium" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Status Filter */}
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', background: '#fff' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="available">Available</option>
            <option value="on_trip">On Trip</option>
            <option value="in_shop">In Shop (Maintenance)</option>
            <option value="retired">Retired</option>
          </select>

          {/* Type Filter */}
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', background: '#fff' }}
          >
            <option value="ALL">All Vehicle Types</option>
            <option value="Van">Van</option>
            <option value="Mini Truck">Mini Truck</option>
            <option value="Heavy Truck">Heavy Truck</option>
            <option value="Pickup">Pickup</option>
            <option value="Box Truck">Box Truck</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: 280 }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12 }} />
          <input
            type="text"
            placeholder="Search registration or model..."
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

      {/* Vehicles Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(249, 115, 22, 0.2)', borderRadius: '50%', borderTopColor: '#f97316', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Loading fleet registry...</span>
        </div>
      ) : error ? (
        <div style={{ padding: '24px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, color: '#991b1b' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800 }}>Error</h3>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>{error}</p>
        </div>
      ) : filteredVehicles.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {filteredVehicles.map(vehicle => {
            const isAvail = vehicle.status === 'available';
            const isInShop = vehicle.status === 'in_shop';
            const isRetired = vehicle.status === 'retired';
            
            return (
              <div 
                key={vehicle.registrationNumber} 
                className="card-premium" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 16,
                  borderLeft: isRetired ? '4px solid #ef4444' : isInShop ? '4px solid #f59e0b' : isAvail ? '4px solid #10b981' : '4px solid #3b82f6'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{vehicle.registrationNumber}</h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{vehicle.model}</span>
                  </div>
                  <StatusChip status={vehicle.status === 'in_shop' ? 'In Shop' : vehicle.status === 'on_trip' ? 'On Trip' : getStatusLabel(vehicle.status)} />
                </div>

                {/* Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.8rem', color: '#475569' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Type</span>
                    <strong style={{ color: '#0f172a' }}>{vehicle.type}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Max Capacity</span>
                    <strong style={{ color: '#0f172a' }}>{parseFloat(vehicle.maxLoadCapacityKg).toLocaleString()} kg</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Odometer</span>
                    <strong style={{ color: '#0f172a' }} className="mono">{parseFloat(vehicle.odometerKm).toLocaleString()} km</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Maintenance</span>
                    <strong style={{ color: isInShop ? '#b45309' : '#1e293b' }}>
                      {isInShop ? 'In Maintenance' : 'Operational'}
                    </strong>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    disabled={!isAvail}
                    onClick={() => handleOpenAssign(vehicle)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: isAvail ? '#f97316' : '#cbd5e1',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: isAvail ? 'pointer' : 'not-allowed',
                      transition: 'background-color 150ms ease'
                    }}
                    onMouseOver={(e) => { if (isAvail) e.currentTarget.style.backgroundColor = '#ea580c'; }}
                    onMouseOut={(e) => { if (isAvail) e.currentTarget.style.backgroundColor = '#f97316'; }}
                  >
                    Assign Vehicle
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed #e2e8f0', borderRadius: 16 }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>No vehicles found matching filters.</p>
        </div>
      )}

      {/* ASSIGN TRIP MODAL */}
      {showAssignModal && selectedVehicle && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card-premium" style={{ width: '100%', maxWidth: 520, padding: 24, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Assign {selectedVehicle.registrationNumber}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Select a pending draft dispatch queue item to allocate this vehicle (Max capacity: <strong>{selectedVehicle.maxLoadCapacityKg.toLocaleString()} kg</strong>).
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
                  const isOverCapacity = trip.cargoWeightKg > selectedVehicle.maxLoadCapacityKg;
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
                          Cargo: <strong style={{ color: isOverCapacity ? '#ef4444' : '#0f172a' }}>{trip.cargoWeightKg.toLocaleString()} kg</strong> · Dist: {trip.plannedDistanceKm} km
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
