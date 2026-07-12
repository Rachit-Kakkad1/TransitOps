import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, Clock, Truck, User, Navigation, CheckCircle2, 
  FileCheck2, LogOut, Compass, AlertCircle, ArrowRight, Search, 
  RefreshCw, Package, ShieldCheck, HelpCircle
} from 'lucide-react';
import { geocodeCity, fetchRoadRoute } from '../../features/safety/services/routeService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Custom Map Markers
function pinIcon(color) {
  return L.divIcon({
    className: 'routemap-pin',
    html: `<div style="
      width:18px;height:18px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      border:2px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,0.35);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    popupAnchor: [0, -18]
  });
}

function vehicleIcon() {
  return L.divIcon({
    className: 'tracking-vehicle-pin',
    html: `<div style="
      width: 24px; height: 24px; border-radius: 50%;
      background: #f97316; display: flex; align-items: center; justify-content: center;
      border: 2px solid #fff; box-shadow: 0 2px 8px rgba(249,115,22,0.4);
      animation: pulse 1.5s infinite alternate;
    ">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
        <path d="M19 18h2a1 1 0 0 0 1-1v-5.05a1 1 0 0 0-.293-.707l-3.07-3.07a1 1 0 0 0-.707-.293H14"/>
        <circle cx="7" cy="18" r="2"/>
        <circle cx="17" cy="18" r="2"/>
      </svg>
    </div>
    <style>
      @keyframes pulse {
        from { transform: scale(1); box-shadow: 0 0 0 0 rgba(249,115,22,0.7); }
        to { transform: scale(1.1); box-shadow: 0 0 12px 6px rgba(249,115,22,0); }
      }
    </style>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

const START_ICON = pinIcon('#1e293b'); // Navy Start
const END_ICON = pinIcon('#dc2626');  // Red End
const VEHICLE_ICON = vehicleIcon();    // Orange Truck

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1 });
  }, [map, points]);
  return null;
}

export default function PublicTrackingPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [inputToken, setInputToken] = useState('');
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  // Map route geometry
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [polylinePoints, setPolylinePoints] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);

  // Poll intervals
  const fetchTrackingDetails = async (showLoader = true) => {
    if (!token) return;
    if (showLoader) setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch(`${API_URL}/api/public/tracking/${token}`);
      const res = await response.json();

      if (!response.ok) {
        throw new Error(res.message || 'Tracking link is invalid or expired.');
      }

      setTrip(res.data);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      // Load Map Coordinates
      if (!startCoords || !endCoords) {
        setMapLoading(true);
        const start = await geocodeCity(res.data.source);
        const end = await geocodeCity(res.data.destination);

        if (start && end) {
          setStartCoords(start);
          setEndCoords(end);
          const cacheKey = `${res.data.source.toLowerCase()}-${res.data.destination.toLowerCase()}`;
          const routeData = await fetchRoadRoute(start, end, cacheKey);
          if (routeData) {
            setPolylinePoints(routeData.polylinePoints);
          }
        }
        setMapLoading(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Tracking server is currently unreachable.');
      setTrip(null);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTrackingDetails(true);
    }
  }, [token]);

  // Controlled 30-seconds polling interval when tab is active and trip is not completed
  useEffect(() => {
    if (!token || !trip || trip.status === 'completed' || trip.status === 'cancelled') return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchTrackingDetails(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [token, trip]);

  // Calculate current simulated vehicle coordinate on polyline based on progress percentage
  const vehiclePosition = useMemo(() => {
    if (polylinePoints.length === 0 || !trip || trip.status !== 'dispatched') return null;
    const progress = trip.journey?.progressPercent || 0;
    const idx = Math.min(
      polylinePoints.length - 1,
      Math.max(0, Math.floor((progress / 100) * polylinePoints.length))
    );
    return polylinePoints[idx];
  }, [polylinePoints, trip]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (inputToken.trim()) {
      navigate(`/track/${inputToken.trim()}`);
    }
  };

  // 1. Landing View / Search Portal
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: 440, width: '100%', background: '#fff', padding: 36, borderRadius: 16, border: '1px solid #e7e5e0', boxShadow: '0 4px 20px rgba(15,23,42,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f97316', display: 'flex', alignItems: 'center', justifyText: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>T</div>
            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a' }}>Transit<span style={{ color: '#f97316' }}>Ops</span> Journey</span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>Track Shipment</h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 24px 0', lineHeight: 1.5 }}>
            Enter your secure 48-character public tracking token to view the real-time status of your transport dispatch.
          </p>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Enter secure tracking token..."
                value={inputToken}
                onChange={e => setInputToken(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', paddingLeft: 42, fontSize: '0.85rem', border: '1px solid #d1cfc9', borderRadius: 8, background: '#fafaf9', outline: 'none', transition: 'border 0.2s', fontFamily: 'monospace' }}
              />
              <Search size={16} style={{ position: 'absolute', left: 16, top: 15, color: '#94a3b8' }} />
            </div>
            <button type="submit" style={{ width: '100%', padding: '12px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}>
              Track Shipment <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading && !trip) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Compass className="animate-spin-slow" size={42} color="#f97316" />
        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Retrieving secure tracking metrics...</span>
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .animate-spin-slow { animation: spin 2.5s linear infinite; }
        `}</style>
      </div>
    );
  }

  // 3. Error / Link Not Found View
  if (errorMsg || !trip) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: 440, width: '100%', background: '#fff', padding: 36, borderRadius: 16, border: '1px solid #e7e5e0', textAlign: 'center', boxShadow: '0 4px 20px rgba(15,23,42,0.02)' }}>
          <AlertCircle size={44} color="#dc2626" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>Tracking Link Unavailable</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 24px 0', lineHeight: 1.5 }}>
            {errorMsg || 'The requested shipment token is invalid, expired, or has been revoked by the logistics controller.'}
          </p>
          <button onClick={() => navigate('/track')} style={{ padding: '10px 20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
            Return to Search
          </button>
        </div>
      </div>
    );
  }

  // 4. Main Journey Dashboard
  const { source, destination, plannedDistanceKm, cargoWeightKg, status, vehicle, driver, journey, milestones } = trip;

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f6', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: 60 }}>
      {/* Header bar */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e7e5e0', position: 'sticky', top: 0, zIndex: 1000, padding: '16px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/track')}>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>T</div>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>Transit<span style={{ color: '#f97316' }}>Ops</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
            <span>Last updated: {lastUpdated}</span>
            <button onClick={() => fetchTrackingDetails(true)} style={{ background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
              <RefreshCw size={12} /> Sync
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '32px auto 0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
        
        {/* Left Side: Hero Section & Map */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Journey Hero Panel */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e5e0', padding: 28, boxShadow: '0 4px 20px rgba(15,23,42,0.01)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: status === 'completed' ? '#16a34a' : (status === 'dispatched' ? '#f97316' : '#64748b'),
                background: status === 'completed' ? '#f0fdf4' : (status === 'dispatched' ? '#ffedd5' : '#f1f5f9'),
                padding: '4px 10px',
                borderRadius: 20,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {status === 'completed' ? 'DELIVERED' : (status === 'dispatched' ? 'IN TRANSIT' : status.toUpperCase())}
              </span>
              {status === 'dispatched' && journey.estimatedArrival && (
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  Est. Arrival: <strong style={{ color: '#0f172a' }}>{new Date(journey.estimatedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(journey.estimatedArrival).toLocaleDateString()}</strong>
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Origin</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>{source}</span>
              </div>
              <ArrowRight size={24} style={{ color: '#cbd5e1', marginTop: 14 }} />
              <div style={{ flex: 1, textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Destination</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>{destination}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                <span>Route Progress</span>
                <span>{journey.progressPercent}%</span>
              </div>
              <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${journey.progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #f97316, #ea580c)', borderRadius: 4, transition: 'width 1s ease' }} />
              </div>
            </div>

            {/* Minor Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 24, borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Remaining Distance</span>
                <span style={{ fontSize: '1rem', fontWeight: 800 }}>{journey.distanceRemainingKm} km</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Cargo Load</span>
                <span style={{ fontSize: '1rem', fontWeight: 800 }}>{cargoWeightKg.toLocaleString()} kg</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Planned Route</span>
                <span style={{ fontSize: '1rem', fontWeight: 800 }}>{plannedDistanceKm} km</span>
              </div>
            </div>
          </div>

          {/* Interactive Map */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e5e0', padding: 10, height: 420, boxShadow: '0 4px 20px rgba(15,23,42,0.01)', position: 'relative' }}>
            {mapLoading ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                Loading journey geometry...
              </div>
            ) : startCoords && endCoords && polylinePoints.length > 0 ? (
              <MapContainer
                center={startCoords}
                zoom={7}
                style={{ width: '100%', height: '100%', borderRadius: 12 }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <Polyline
                  positions={polylinePoints}
                  pathOptions={{ color: '#94a3b8', weight: 4, opacity: 0.6, dashArray: '5, 10' }}
                />
                
                {/* Highlight completed path in active orange */}
                {status === 'completed' ? (
                  <Polyline
                    positions={polylinePoints}
                    pathOptions={{ color: '#f97316', weight: 5, opacity: 0.9 }}
                  />
                ) : (
                  vehiclePosition && (
                    <Polyline
                      positions={polylinePoints.slice(0, Math.floor((journey.progressPercent / 100) * polylinePoints.length))}
                      pathOptions={{ color: '#f97316', weight: 5, opacity: 0.9 }}
                    />
                  )
                )}

                <Marker position={startCoords} icon={START_ICON}>
                  <Popup>{source} (Departure point)</Popup>
                </Marker>

                <Marker position={endCoords} icon={END_ICON}>
                  <Popup>{destination} (Destination point)</Popup>
                </Marker>

                {status === 'dispatched' && vehiclePosition && (
                  <Marker position={vehiclePosition} icon={VEHICLE_ICON}>
                    <Popup>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'sans-serif' }}>
                        Estimated Position<br />
                        <span style={{ color: '#f97316', fontWeight: 800 }}>In Transit</span>
                      </div>
                    </Popup>
                  </Marker>
                )}

                <FitBounds points={polylinePoints} />
              </MapContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#dc2626', background: '#fef2f2', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                <AlertCircle size={28} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Map visualization is currently unavailable. Status metrics remain fully active.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Timeline & Vehicle Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Journey Timeline card */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e5e0', padding: 28, boxShadow: '0 4px 20px rgba(15,23,42,0.01)' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Journey Milestones</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {milestones.map((m, idx) => {
                const isCompleted = m.status === 'completed';
                const isCurrent = m.status === 'current';
                const isSkipped = m.status === 'skipped';
                
                return (
                  <div key={m.id} style={{ display: 'flex', gap: 16, position: 'relative', pb: 24 }}>
                    {/* Line connection */}
                    {idx < milestones.length - 1 && (
                      <div style={{
                        position: 'absolute',
                        left: 12,
                        top: 24,
                        bottom: -16,
                        width: 2,
                        background: isCompleted ? '#f97316' : '#cbd5e1',
                        zIndex: 1
                      }} />
                    )}

                    {/* Milestone Dot/Icon */}
                    <div style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: isCompleted ? '#ffedd5' : (isCurrent ? '#f97316' : '#f1f5f9'),
                      border: `2px solid ${isCompleted ? '#f97316' : (isCurrent ? '#f97316' : '#cbd5e1')}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                      flexShrink: 0
                    }}>
                      <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: isCompleted || isCurrent ? '#ea580c' : '#94a3b8'
                      }} />
                    </div>

                    {/* Milestone content */}
                    <div style={{ paddingBottom: 28 }}>
                      <h4 style={{ margin: '0 0 3px 0', fontSize: '0.85rem', fontWeight: 800, color: isCompleted || isCurrent ? '#0f172a' : '#94a3b8' }}>
                        {m.title}
                      </h4>
                      <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: isCompleted || isCurrent ? '#64748b' : '#94a3b8', lineHeight: 1.4 }}>
                        {m.description}
                      </p>
                      {m.timestamp && (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(m.timestamp).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Secure shipment info card */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e5e0', padding: 28, boxShadow: '0 4px 20px rgba(15,23,42,0.01)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shipment Details</h3>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>Code: {token.slice(0, 24)}...</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: 16, fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', pb: 10 }}>
                <span style={{ color: '#64748b' }}>Assigned Vehicle</span>
                <span style={{ fontWeight: 700 }}>{vehicle.model} ({vehicle.type})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', pb: 10 }}>
                <span style={{ color: '#64748b' }}>Registration Number</span>
                <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{vehicle.registrationNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', pb: 10 }}>
                <span style={{ color: '#64748b' }}>Dispatch Driver</span>
                <span style={{ fontWeight: 700 }}>{driver.fullName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Security Certificate</span>
                <span style={{ fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ShieldCheck size={14} /> Verified Secure
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
