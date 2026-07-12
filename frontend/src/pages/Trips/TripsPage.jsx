import React, { useState, useEffect } from 'react';
import { 
  Navigation, FileText, CheckCircle2, XCircle, Search, 
  Plus, Edit2, Calendar, MapPin, Truck, Users, AlertTriangle, 
  ArrowRight, Shield, RefreshCw, X, Award, Info, Copy, Clock, Activity
} from 'lucide-react';
import { tripService } from '../../services/tripService';
import StatusChip from '../../components/ui/StatusChip';

export default function TripsPage() {
  const [trips, setTrips] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  // Modal/Drawer States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  
  // Recommendations State
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [selectedRecIndex, setSelectedRecIndex] = useState(0);
  const [dispatchError, setDispatchError] = useState('');

  // Form State
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    source: '',
    destination: '',
    cargoWeightKg: '',
    plannedDistanceKm: '',
    vehicleId: '',
    driverId: '',
  });

  // Filter States
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [driverFilter, setDriverFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [routeFilter, setRouteFilter] = useState('ALL');

  const fetchTripsData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await tripService.getTrips();
      setTrips(data);
      
      // Fetch available resources for forms
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const overviewRes = await fetch(`${API_URL}/api/dashboard/overview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const overviewData = await overviewRes.json();
      if (overviewRes.ok && overviewData.success) {
        setAvailableVehicles(overviewData.data.availableVehicles || []);
        setAvailableDrivers(overviewData.data.availableDrivers || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripsData();
  }, []);

  // Form Actions
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

  const handleOpenEdit = (trip) => {
    setSelectedTrip(trip);
    setFormData({
      source: trip.source,
      destination: trip.destination,
      cargoWeightKg: parseFloat(trip.cargoWeightKg) || '',
      plannedDistanceKm: parseFloat(trip.plannedDistanceKm) || '',
      vehicleId: trip.vehicle?.id || '',
      driverId: trip.driver?.id || '',
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleDuplicateTrip = (trip) => {
    setFormData({
      source: trip.source,
      destination: trip.destination,
      cargoWeightKg: parseFloat(trip.cargoWeightKg) || '',
      plannedDistanceKm: parseFloat(trip.plannedDistanceKm) || '',
      vehicleId: trip.vehicle?.id || '',
      driverId: trip.driver?.id || '',
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

  const handleOpenTimeline = (trip) => {
    setSelectedTrip(trip);
    setShowTimelineModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await tripService.createTrip(formData);
      setShowCreateModal(false);
      fetchTripsData();
    } catch (err) {
      setFormError(err.message || 'Failed to create trip');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await tripService.updateTrip(selectedTrip.id, formData);
      setShowEditModal(false);
      fetchTripsData();
    } catch (err) {
      setFormError(err.message || 'Failed to update trip');
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
      fetchTripsData();
    } catch (err) {
      setDispatchError(err.message || 'Dispatch failed');
    }
  };

  const handleCompleteTrip = async (id) => {
    if (!window.confirm('Are you sure you want to mark this trip as completed?')) return;
    try {
      await tripService.completeTrip(id);
      fetchTripsData();
    } catch (err) {
      alert(err.message || 'Failed to complete trip');
    }
  };

  const handleCancelTrip = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this trip?')) return;
    try {
      await tripService.cancelTrip(id);
      fetchTripsData();
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

  // Derive transient attributes & search/filter
  const enrichedTrips = trips.map(t => {
    const weight = parseFloat(t.cargoWeightKg) || 0;
    const priority = weight > 10000 ? 'High' : weight > 1500 ? 'Medium' : 'Low';
    
    // Deterministic demo customer based on source string
    const customers = ["Tata Steel", "Amazon Logistics", "Reliance Retail", "Flipkart Wholesale", "Apollo Tyres"];
    const charSum = t.source.charCodeAt(0) + t.destination.charCodeAt(0);
    const customer = customers[charSum % customers.length];

    return {
      ...t,
      priority,
      customer
    };
  });

  const filteredTrips = enrichedTrips.filter(t => {
    const matchesTab = activeTab === 'ALL' || t.status.toUpperCase() === activeTab;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    const matchesVehicle = vehicleFilter === 'ALL' || t.vehicle?.registrationNumber === vehicleFilter;
    const matchesDriver = driverFilter === 'ALL' || t.driver?.fullName === driverFilter;
    
    // Date filter
    let matchesDate = true;
    if (dateFilter === 'TODAY') {
      matchesDate = new Date(t.createdAt).toDateString() === new Date().toDateString();
    } else if (dateFilter === 'LAST_7') {
      const diff = Math.abs(new Date() - new Date(t.createdAt));
      matchesDate = Math.ceil(diff / (1000 * 60 * 60 * 24)) <= 7;
    }

    // Route filter
    const matchesRoute = routeFilter === 'ALL' || 
      `${t.source} ${t.destination}`.toLowerCase().includes(routeFilter.toLowerCase());

    // Search query matching
    const searchString = `${t.id} ${t.source} ${t.destination} ${t.vehicle?.registrationNumber || ''} ${t.driver?.fullName || ''} ${t.customer} ${t.status} ${t.priority}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());

    return matchesTab && matchesPriority && matchesVehicle && matchesDriver && matchesDate && matchesRoute && matchesSearch;
  });

  // Extract unique vehicles and drivers for filters
  const uniqueVehicles = Array.from(new Set(trips.map(t => t.vehicle?.registrationNumber).filter(Boolean)));
  const uniqueDrivers = Array.from(new Set(trips.map(t => t.driver?.fullName).filter(Boolean)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Trip & Dispatch Planner</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>Plan routes, assign resources, review intelligence recommendations, and duplicate dispatches.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={fetchTripsData} 
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button 
            onClick={handleOpenCreate} 
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
          >
            <Plus size={16} /> Create Draft Trip
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['ALL', 'DRAFT', 'DISPATCHED', 'COMPLETED', 'CANCELLED'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: activeTab === tab ? '#ffedd5' : 'transparent',
                  color: activeTab === tab ? '#ea580c' : '#475569',
                  fontWeight: activeTab === tab ? 700 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 150ms ease'
                }}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: 280 }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12 }} />
            <input
              type="text"
              placeholder="Search ID, route, driver, vehicle, client..."
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

        {/* Dropdown Filters row */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
          {/* Priority */}
          <select 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.75rem', background: '#fff', outline: 'none' }}
          >
            <option value="ALL">Priority: All</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Vehicle */}
          <select 
            value={vehicleFilter} 
            onChange={(e) => setVehicleFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.75rem', background: '#fff', outline: 'none' }}
          >
            <option value="ALL">Vehicle: All</option>
            {uniqueVehicles.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          {/* Driver */}
          <select 
            value={driverFilter} 
            onChange={(e) => setDriverFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.75rem', background: '#fff', outline: 'none' }}
          >
            <option value="ALL">Driver: All</option>
            {uniqueDrivers.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Date */}
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.75rem', background: '#fff', outline: 'none' }}
          >
            <option value="ALL">Date: All Time</option>
            <option value="TODAY">Created Today</option>
            <option value="LAST_7">Last 7 Days</option>
          </select>

          {/* Route filter input */}
          <input 
            type="text" 
            placeholder="Filter Route Hubs..." 
            value={routeFilter === 'ALL' ? '' : routeFilter}
            onChange={(e) => setRouteFilter(e.target.value || 'ALL')}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.75rem', background: '#fff', outline: 'none', minWidth: 160 }}
          />
        </div>
      </div>

      {/* Trips list */}
      <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(249, 115, 22, 0.2)', borderRadius: '50%', borderTopColor: '#f97316', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Loading trips...</span>
          </div>
        ) : filteredTrips.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '16px 20px', color: '#475569', fontWeight: 700 }}>Trip Details</th>
                  <th style={{ padding: '16px 20px', color: '#475569', fontWeight: 700 }}>Route & Client</th>
                  <th style={{ padding: '16px 20px', color: '#475569', fontWeight: 700 }}>Assignments</th>
                  <th style={{ padding: '16px 20px', color: '#475569', fontWeight: 700 }}>Priority & Status</th>
                  <th style={{ padding: '16px 20px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map(trip => (
                  <tr key={trip.id} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                    {/* Details */}
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a', display: 'block' }}>
                        ID: <span className="mono" style={{ fontSize: '0.75rem', color: '#64748b' }}>{trip.id.slice(0, 8)}</span>
                      </span>
                      <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.75rem', color: '#64748b' }}>
                        <span>Weight: <strong>{parseFloat(trip.cargoWeightKg).toLocaleString()} kg</strong></span>
                        <span>·</span>
                        <span>Dist: <strong>{parseFloat(trip.plannedDistanceKm)} km</strong></span>
                      </div>
                    </td>

                    {/* Route & Customer */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#0f172a' }}>
                        <MapPin size={14} color="#f97316" />
                        <span>{trip.source}</span>
                        <ArrowRight size={14} color="#94a3b8" />
                        <span>{trip.destination}</span>
                      </div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                        Customer: <strong>{trip.customer}</strong>
                      </span>
                    </td>

                    {/* Assignments */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: trip.vehicle ? '#334155' : '#94a3b8' }}>
                          <Truck size={14} color="#64748b" />
                          {trip.vehicle ? (
                            <strong>{trip.vehicle.registrationNumber} <span style={{ fontWeight: 500, color: '#64748b' }}>({trip.vehicle.model})</span></strong>
                          ) : 'No Vehicle Assigned'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: trip.driver ? '#334155' : '#94a3b8' }}>
                          <Users size={14} color="#64748b" />
                          {trip.driver ? (
                            <strong>{trip.driver.fullName}</strong>
                          ) : 'No Driver Assigned'}
                        </span>
                      </div>
                    </td>

                    {/* Status & Priority */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <StatusChip status={trip.status} />
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 12,
                          background: trip.priority === 'High' ? '#fee2e2' : trip.priority === 'Medium' ? '#fffbeb' : '#f1f5f9',
                          color: trip.priority === 'High' ? '#991b1b' : trip.priority === 'Medium' ? '#92400e' : '#475569'
                        }}>
                          {trip.priority}
                        </span>
                      </div>
                      {trip.status === 'dispatched' && trip.dispatchedAt && (
                        <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', marginTop: 4 }}>
                          Released: {new Date(trip.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {/* Timeline for everyone */}
                        <button
                          onClick={() => handleOpenTimeline(trip)}
                          style={{ padding: '6px 10px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          Timeline
                        </button>
                        
                        {/* Duplicate for everyone */}
                        <button
                          onClick={() => handleDuplicateTrip(trip)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          <Copy size={12} /> Duplicate
                        </button>

                        {trip.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleOpenDispatch(trip)}
                              style={{ padding: '6px 12px', background: '#ffedd5', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                            >
                              Dispatch
                            </button>
                            <button
                              onClick={() => handleOpenEdit(trip)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleCancelTrip(trip.id)}
                              style={{ padding: '6px 10px', background: '#fff', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: 6, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {trip.status === 'dispatched' && (
                          <>
                            <button
                              onClick={() => handleShareTracking(trip.publicTrackingToken)}
                              style={{ padding: '6px 10px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 6, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
                            >
                              Share Link
                            </button>
                            <button
                              onClick={() => handleCompleteTrip(trip.id)}
                              style={{ padding: '6px 12px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleCancelTrip(trip.id)}
                              style={{ padding: '6px 10px', background: '#fff', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: 6, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {/* SVG Illustration */}
            <div style={{ width: 80, height: 80, background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
              <Navigation size={40} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>No pending dispatches.</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Create a draft trip to begin scheduling and releasing fleet assignments.</p>
            </div>
            <button
              onClick={handleOpenCreate}
              style={{
                padding: '10px 18px',
                background: '#f97316',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.2)'
              }}
            >
              Create Trip
            </button>
          </div>
        )}
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
                  {availableVehicles.map(v => (
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
                  {availableDrivers.map(d => (
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

      {/* EDIT DRAFT TRIP MODAL */}
      {showEditModal && selectedTrip && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card-premium" style={{ width: '100%', maxWidth: 500, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Edit Draft Trip</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ marginBottom: 16, padding: '10px 12px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: '0.75rem', fontWeight: 600, display: 'flex', gap: 6 }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Source Hub</label>
                  <input
                    type="text"
                    required
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
                    value={formData.plannedDistanceKm}
                    onChange={(e) => setFormData({ ...formData, plannedDistanceKm: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Assign Vehicle</label>
                <select
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', background: '#fff' }}
                >
                  <option value="">Unassigned</option>
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registrationNumber} - {v.model} ({v.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Assign Driver</label>
                <select
                  value={formData.driverId}
                  onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', background: '#fff' }}
                >
                  <option value="">Unassigned</option>
                  {availableDrivers.map(d => (
                    <option key={d.id} value={d.id}>{d.fullName} (Safety: {parseFloat(d.safetyScore)}%, Duty: {parseFloat(d.rollingDutyHours)}h)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifySelf: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary" style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                          <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', marginTop: 2 }}>Match Score</span>
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

      {/* TRIP TIMELINE MODAL */}
      {showTimelineModal && selectedTrip && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card-premium" style={{ width: '100%', maxWidth: 440, padding: 24 }}>
            <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Trip Lifecycle Timeline</h3>
              <button onClick={() => setShowTimelineModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.5rem', fontWeight: 600 }}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Step 1: Created */}
              <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ width: 2, height: 32, background: (tripService && selectedTrip.status !== 'draft') ? '#10b981' : '#e2e8f0', margin: '4px 0' }} />
                </div>
                <div>
                  <strong style={{ color: '#0f172a', display: 'block' }}>Draft Trip Created</strong>
                  <span style={{ color: '#64748b', fontSize: '0.725rem' }}>Source & Destination hub coordinates validated.</span>
                </div>
              </div>

              {/* Step 2: Dispatched */}
              <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: (selectedTrip.status === 'dispatched' || selectedTrip.status === 'completed') ? '#3b82f6' : '#e2e8f0' }} />
                  <span style={{ width: 2, height: 32, background: selectedTrip.status === 'completed' ? '#10b981' : '#e2e8f0', margin: '4px 0' }} />
                </div>
                <div>
                  <strong style={{ color: (selectedTrip.status === 'dispatched' || selectedTrip.status === 'completed') ? '#0f172a' : '#94a3b8', display: 'block' }}>
                    Dispatched & Released
                  </strong>
                  <span style={{ color: '#64748b', fontSize: '0.725rem' }}>
                    {selectedTrip.dispatchedAt ? `Released on ${new Date(selectedTrip.dispatchedAt).toLocaleString()}` : 'Awaiting resource assignment & validation releasing.'}
                  </span>
                </div>
              </div>

              {/* Step 3: Completed/Cancelled */}
              <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: selectedTrip.status === 'completed' ? '#10b981' : selectedTrip.status === 'cancelled' ? '#ef4444' : '#e2e8f0' }} />
                </div>
                <div>
                  <strong style={{ color: (selectedTrip.status === 'completed' || selectedTrip.status === 'cancelled') ? '#0f172a' : '#94a3b8', display: 'block' }}>
                    {selectedTrip.status === 'cancelled' ? 'Trip Cancelled' : 'Delivery Completed'}
                  </strong>
                  <span style={{ color: '#64748b', fontSize: '0.725rem' }}>
                    {selectedTrip.completedAt ? `Completed on ${new Date(selectedTrip.completedAt).toLocaleString()}` : 'Awaiting transit completion status check.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
