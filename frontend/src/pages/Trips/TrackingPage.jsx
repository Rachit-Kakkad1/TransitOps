import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  MapPin, Clock, Truck, ArrowRight, ShieldCheck, 
  RefreshCw, AlertTriangle, CheckCircle2, ChevronRight, XCircle
} from 'lucide-react';
import { tripService } from '../../services/tripService';
import { mappls, mappls_plugin } from 'mappls-web-maps';

export default function TrackingPage() {
  const { token } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // MapmyIndia Integration States
  const [mapReady, setMapReady] = useState(false);
  const [mapInitError, setMapInitError] = useState('');

  const mapInstanceRef = useRef(null);
  const mapplsLibRef = useRef(null);
  const markerTruckRef = useRef(null);
  const directionRef = useRef(null);

  const fetchTracking = async () => {
    try {
      const data = await tripService.getPublicTracking(token);
      setTrip(data);
    } catch (err) {
      setError(err.message || 'Tracking link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 30000); // refresh tracking every 30s
    return () => clearInterval(interval);
  }, [token]);

  // Initialize MapmyIndia Map and Directions plugin when trip is loaded
  useEffect(() => {
    if (!trip) return;
    let active = true;

    try {
      const mmiToken = import.meta.env.VITE_MAPPLS_API_KEY;
      if (!mmiToken) {
        setMapInitError('VITE_MAPPLS_API_KEY is not defined.');
        return;
      }

      const mapplsLib = new mappls();
      mapplsLibRef.current = mapplsLib;

      // Load SDK with directions plugin library
      mapplsLib.initialize(mmiToken, { map: true, plugins: ['direction'] }, () => {
        if (!active) return;
        try {
          const map = mapplsLib.Map({
            id: 'mappls-tracking-map',
            properties: {
              center: { lat: trip.simulatedLocation.lat, lng: trip.simulatedLocation.lng },
              zoom: 6,
              zoomControl: true
            }
          });
          mapInstanceRef.current = map;

          map.addListener('load', () => {
            if (!active) return;
            setMapReady(true);
          });
        } catch (err) {
          console.error("Mappls container load failed:", err);
          setMapInitError('Failed to mount MapmyIndia map canvas.');
        }
      });
    } catch (err) {
      console.error("Mappls script load failed:", err);
      setMapInitError('MapmyIndia SDK library failed to load.');
    }

    return () => {
      active = false;
    };
  }, [trip]);

  // Update Mappls Layers with Live position and Perfect Road Directions
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !mapplsLibRef.current || !trip) return;

    const map = mapInstanceRef.current;
    const mapplsLib = mapplsLibRef.current;

    // Clear old layers
    try {
      if (markerTruckRef.current) mapplsLib.removeLayer({ map, layer: markerTruckRef.current });
    } catch (e) {}
    
    if (directionRef.current) {
      try {
        directionRef.current.remove();
      } catch (e) {
        try { mapplsLib.removeLayer({ map, layer: directionRef.current }); } catch (err) {}
      }
      directionRef.current = null;
    }

    // Draw route and markers
    try {
      // 1. Draw PERFECT ROAD ROUTE directions using Mappls Direction Plugin
      const mapplsPlugin = new mappls_plugin();
      const routeObj = mapplsPlugin.direction({
        map: map,
        start: `${trip.startLocation.lat},${trip.startLocation.lng}`,
        end: `${trip.endLocation.lat},${trip.endLocation.lng}`,
        strokeColor: '#f97316',
        strokeWeight: 6,
        fitbounds: true
      });
      directionRef.current = routeObj;

      // 2. Draw live truck position marker on route
      if (trip.status === 'dispatched') {
        markerTruckRef.current = mapplsLib.Marker({
          map: map,
          position: { lat: trip.simulatedLocation.lat, lng: trip.simulatedLocation.lng },
          title: `Truck Position (Progress: ${trip.progress}%)`
        });
      }
    } catch (err) {
      console.error("Error drawing perfect directions on tracking map: ", err);
      
      // Fallback straight line polyline if directions plugin fails
      try {
        mapplsLib.Polyline({
          map: map,
          path: [
            { lat: trip.startLocation.lat, lng: trip.startLocation.lng },
            { lat: trip.endLocation.lat, lng: trip.endLocation.lng }
          ],
          strokeColor: '#f97316',
          strokeWeight: 4,
          fitbounds: true
        });
      } catch (e) {}
    }

  }, [trip, mapReady]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16, background: '#f8fafc' }}>
        <div style={{ width: 44, height: 44, border: '4px solid rgba(249, 115, 22, 0.1)', borderRadius: '50%', borderTopColor: '#f97316', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 600 }}>Locating your shipment...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
        <div className="card-premium" style={{ maxWidth: 440, padding: 32, textAlign: 'center', border: '1px solid #fee2e2', background: '#fff' }}>
          <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>Tracking Unavailable</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 24px 0' }}>{error}</p>
          <button 
            onClick={fetchTracking} 
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!trip) return null;

  // Determine active step index
  const statusSteps = [
    { label: 'Planned', key: 'draft', desc: 'Shipment created' },
    { label: 'Dispatched', key: 'dispatched', desc: 'Driver assigned' },
    { label: 'In Transit', key: 'dispatched', desc: 'On route to destination' },
    { label: 'Arrived', key: 'completed', desc: 'Delivered successfully' }
  ];

  let currentStepIdx = 0;
  if (trip.status === 'completed') {
    currentStepIdx = 3;
  } else if (trip.status === 'dispatched') {
    currentStepIdx = trip.progress > 10 ? 2 : 1;
  } else if (trip.status === 'cancelled') {
    currentStepIdx = -1;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Brand Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.2rem' }}>T</div>
            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a' }}>Transit<span style={{ color: '#f97316' }}>Ops</span> tracking</span>
          </div>
          <button 
            onClick={fetchTracking} 
            style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #cbd5e1', background: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Primary Status Card */}
        <div className="card-premium" style={{ background: '#fff', padding: 28, border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 4px 20px -2px rgba(15,23,42,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 16, marginBottom: 20 }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Tracking ID</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }} className="mono">{trip.id}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Status</span>
              <StatusChip status={trip.status} />
            </div>
          </div>

          {/* Visual Route Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff3eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316' }}>
                <MapPin size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Origin</span>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{trip.source}</span>
              </div>
            </div>
            <ChevronRight size={20} color="#cbd5e1" style={{ margin: '0 auto' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <MapPin size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Destination</span>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{trip.destination}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map Panel */}
        {trip.status !== 'cancelled' && (
          <div className="card-premium" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', padding: 0 }}>
            {mapInitError && (
              <div style={{ padding: 24, textAlign: 'center', color: '#ef4444' }}>
                <AlertTriangle size={32} style={{ marginBottom: 12 }} />
                <p style={{ margin: 0, fontWeight: 700 }}>Map Initialization Error</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>{mapInitError}</p>
              </div>
            )}
            
            {!mapReady && !mapInitError && (
              <div style={{ padding: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
                <div style={{ width: 30, height: 30, border: '3px solid rgba(249, 115, 22, 0.1)', borderRadius: '50%', borderTopColor: '#f97316', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Loading MapmyIndia Live Map...</span>
              </div>
            )}

            {/* MapmyIndia Container */}
            <div 
              id="mappls-tracking-map" 
              style={{ 
                width: '100%', 
                height: 320, 
                display: mapReady ? 'block' : 'none' 
              }} 
            />
          </div>
        )}

        {/* Progress Timeline */}
        {trip.status !== 'cancelled' ? (
          <div className="card-premium" style={{ background: '#fff', padding: 28, border: '1px solid #e2e8f0', borderRadius: 16 }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', margin: '0 0 24px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivery Progress</h4>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', width: '100%', padding: '0 10px' }}>
              {/* Connecting line */}
              <div style={{ position: 'absolute', top: 12, left: 24, right: 24, height: 4, background: '#e2e8f0', zIndex: 1 }}>
                <div style={{ height: '100%', width: `${(currentStepIdx / 3) * 100}%`, background: '#f97316', transition: 'width 0.4s ease' }} />
              </div>

              {statusSteps.map((step, idx) => {
                const isPassed = idx <= currentStepIdx;
                const isActive = idx === currentStepIdx;

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, position: 'relative', width: 64 }}>
                    <div style={{ 
                      width: 28, height: 28, borderRadius: '50%', 
                      background: isPassed ? '#f97316' : '#fff',
                      border: isPassed ? 'none' : '3px solid #cbd5e1',
                      color: isPassed ? '#fff' : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.75rem',
                      boxShadow: isActive ? '0 0 0 4px rgba(249, 115, 22, 0.2)' : 'none',
                      transition: 'all 0.3s ease'
                    }}>
                      {isPassed ? <CheckCircle2 size={16} /> : idx + 1}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isPassed ? '#0f172a' : '#64748b', marginTop: 8, textAlign: 'center', whiteSpace: 'nowrap' }}>{step.label}</span>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 2, textAlign: 'center', lineHeight: 1.2 }}>{step.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="card-premium" style={{ background: '#fff', padding: 32, border: '1px solid #fee2e2', borderRadius: 16, textAlign: 'center', color: '#b91c1c' }}>
            <XCircle size={40} style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>This shipment has been cancelled</h4>
            <p style={{ fontSize: '0.8rem', color: '#ef4444', margin: '4px 0 0 0' }}>The delivery has been aborted. Please contact support.</p>
          </div>
        )}

        {/* Public Metadata (No PII) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card-premium" style={{ background: '#fff', padding: 18, border: '1px solid #e2e8f0', borderRadius: 12 }}>
            <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Carrier & Vehicle</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
              <Truck size={14} color="#f97316" />
              {trip.vehicle?.model ? `${trip.vehicle.model} (${trip.vehicle.type})` : 'Standard Transit vehicle'}
            </span>
          </div>

          <div className="card-premium" style={{ background: '#fff', padding: 18, border: '1px solid #e2e8f0', borderRadius: 12 }}>
            <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Driver</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
              <ShieldCheck size={14} color="#10b981" />
              {trip.driver?.fullName || 'Transit operations pilot'}
            </span>
          </div>
        </div>

      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
