import React, { useState, useEffect } from 'react';
import { X, MapPin, Clock, Navigation, AlertCircle, Compass } from 'lucide-react';
import { geocodeCity, fetchRoadRoute } from '../services/routeService';
import RouteMap from './RouteMap';

export default function RouteIntelligenceDrawer({ trip, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Route geometry & meta
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [polylinePoints, setPolylinePoints] = useState([]);
  const [distanceKm, setDistanceKm] = useState('');
  const [durationHrs, setDurationHrs] = useState('');

  useEffect(() => {
    if (!isOpen || !trip) return;

    const loadRouteData = async () => {
      setLoading(true);
      setErrorMsg('');
      setStartCoords(null);
      setEndCoords(null);
      setPolylinePoints([]);
      setDistanceKm('');
      setDurationHrs('');

      try {
        const cacheKey = `${trip.source.toLowerCase()}-${trip.destination.toLowerCase()}`;
        
        // 1. Resolve source and destination coordinates (cached within service)
        const start = await geocodeCity(trip.source);
        const end = await geocodeCity(trip.destination);

        if (!start || !end) {
          throw new Error('Coordinates could not be resolved for one or both locations.');
        }

        setStartCoords(start);
        setEndCoords(end);

        // 2. Fetch OSRM actual road route geometry
        const routeData = await fetchRoadRoute(start, end, cacheKey);

        if (!routeData) {
          throw new Error('No driving route found between specified points.');
        }

        setPolylinePoints(routeData.polylinePoints);
        setDistanceKm(routeData.distanceKm);
        setDurationHrs(routeData.durationHrs);

      } catch (err) {
        console.error('Route retrieval failed:', err);
        setErrorMsg('Route visualization is temporarily unavailable. Trip safety information remains accessible.');
      } finally {
        setLoading(false);
      }
    };

    loadRouteData();
  }, [isOpen, trip]);

  if (!trip) return null;

  // Compute stats
  const failedChecks = trip.checks.filter(c => !c.passed).length;
  const passedChecks = trip.checks.filter(c => c.passed).length;
  
  // Capacity utilization calculation
  const maxCapacity = trip.vehicle.maxLoadCapacityKg || 0;
  const cargoWeight = trip.cargoWeightKg || 0;
  const capacityUtilization = maxCapacity > 0 
    ? ((cargoWeight / maxCapacity) * 100).toFixed(1) 
    : '0';

  return (
    <>
      {/* Overlay Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.15)',
          backdropFilter: 'blur(3px)',
          zIndex: 9998,
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          transition: 'all 0.25s ease'
        }}
      />

      {/* Drawer Body Container */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        maxWidth: 680,
        background: '#fff',
        boxShadow: '-4px 0 24px rgba(15, 23, 42, 0.08)',
        zIndex: 9999,
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Route Intelligence Map</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>{trip.source} → {trip.destination}</h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Trip ID: {trip.id}</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                fontSize: '0.65rem',
                fontWeight: 700,
                color: trip.riskLevel === 'CRITICAL' || trip.riskLevel === 'HIGH' ? '#dc2626' : '#16a34a',
                textTransform: 'uppercase'
              }}>
                {trip.riskLevel} RISK
              </span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 6 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Route Summary Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Actual Distance</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
              {loading ? '...' : distanceKm ? `${distanceKm} km` : `${trip.plannedDistanceKm} km`}
            </span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Est. Duration</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
              {loading ? '...' : durationHrs ? `${durationHrs} hrs` : 'N/A'}
            </span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Cargo Weight</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{trip.cargoWeightKg.toLocaleString()} kg</span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Utilization</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{capacityUtilization}%</span>
          </div>
        </div>

        {/* Map Section */}
        <div style={{ position: 'relative', height: 320, width: '100%', borderRadius: 12, background: '#f1f5f9', overflow: 'hidden' }}>
          {loading ? (
            // Skeleton Loader
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#64748b' }}>
              <Compass className="animate-spin-slow" size={32} color="#f97316" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Calculating road route details...</span>
              <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin-slow { animation: spin 2s linear infinite; }
              `}</style>
            </div>
          ) : errorMsg ? (
            // Error Fallback Banner
            <div style={{ height: '100%', padding: '0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#991b1b', background: '#fef2f2', textAlign: 'center' }}>
              <AlertCircle size={28} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{errorMsg}</span>
            </div>
          ) : startCoords && endCoords && polylinePoints.length > 0 ? (
            // Interactive Mappls Map
            <RouteMap
              startCoords={startCoords}
              endCoords={endCoords}
              polylinePoints={polylinePoints}
              startLabel={trip.source}
              endLabel={trip.destination}
            />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.8rem' }}>
              No route parameters loaded.
            </div>
          )}
        </div>

        {/* Dispatch Entities Info Block */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Driver Details Card */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Driver Details</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Name</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{trip.driver.fullName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Safety Score</span>
                <span style={{ fontWeight: 700, color: trip.driver.safetyScore >= 75 ? '#16a34a' : '#dc2626' }}>{trip.driver.safetyScore}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Status</span>
                <span style={{ fontWeight: 700, textTransform: 'capitalize', color: trip.driver.status === 'suspended' ? '#dc2626' : '#1e293b' }}>{trip.driver.status}</span>
              </div>
            </div>
          </div>

          {/* Vehicle Details Card */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Vehicle Details</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Reg Number</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{trip.vehicle.registrationNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Model</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{trip.vehicle.model}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Status</span>
                <span style={{ fontWeight: 700, textTransform: 'capitalize', color: trip.vehicle.status === 'in_shop' ? '#dc2626' : '#1e293b' }}>{trip.vehicle.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Safety verdict summary */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Safety Verdict</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#334155' }}>
              <strong>{passedChecks}</strong> checks passed | <strong style={{ color: failedChecks > 0 ? '#dc2626' : '#64748b' }}>{failedChecks}</strong> checks failed
            </div>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: 4,
              background: trip.eligible ? '#dcfce7' : '#fee2e2',
              color: trip.eligible ? '#15803d' : '#b91c1c'
            }}>
              {trip.eligible ? 'VERIFIED ELIGIBLE' : 'DISPATCH BLOCKED'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
