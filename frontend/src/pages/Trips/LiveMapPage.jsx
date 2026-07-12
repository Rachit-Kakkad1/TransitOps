import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, RefreshCw, AlertTriangle, Clock, 
  Truck, Users, MapPin, Eye, Activity
} from 'lucide-react';
import { tripService } from '../../services/tripService';
import { mappls, mappls_plugin } from 'mappls-web-maps';

export default function LiveMapPage() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTripId, setSelectedTripId] = useState(null);

  // MapmyIndia Mappls Integration States
  const [mapReady, setMapReady] = useState(false);
  const [mapInitError, setMapInitError] = useState('');
  
  const mapInstanceRef = useRef(null);
  const mapplsLibRef = useRef(null);
  const markersRef = useRef({});
  const polylinesRef = useRef({});
  const directionRef = useRef(null);

  // Fetch telemetry feed
  const fetchPositions = async () => {
    try {
      const data = await tripService.getActivePositions();
      setPositions(data);
      if (data.length > 0 && !selectedTripId) {
        setSelectedTripId(data[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch active fleet positions');
    } finally {
      setLoading(false);
    }
  };

  // Initialize MapmyIndia SDK with Map and Directions plugin
  useEffect(() => {
    let active = true;
    
    try {
      const mmiToken = import.meta.env.VITE_MAPPLS_API_KEY;
      if (!mmiToken) {
        setMapInitError('VITE_MAPPLS_API_KEY is not defined in environment config.');
        return;
      }
      
      console.log('Initializing MapmyIndia SDK with key:', mmiToken);
      const mapplsLib = new mappls();
      mapplsLibRef.current = mapplsLib;

      // Load directions library dynamically
      mapplsLib.initialize(mmiToken, { map: true, plugins: ['direction'] }, () => {
        if (!active) return;
        
        try {
          console.log('Mappls SDK & Directions script loaded successfully. Creating map container...');
          // Initialize map element
          const map = mapplsLib.Map({
            id: 'mappls-live-map',
            properties: {
              center: { lat: 22.5937, lng: 78.9629 }, // Center of India using coordinate object format
              zoom: 5,
              zoomControl: true,
              hybrid: false
            }
          });
          mapInstanceRef.current = map;
          
          map.addListener('load', () => {
            if (!active) return;
            console.log('Mappls map container fully loaded.');
            setMapReady(true);
          });
        } catch (err) {
          console.error("Mappls container load failed:", err);
          setMapInitError('Failed to mount MapmyIndia map canvas container.');
        }
      });
    } catch (err) {
      console.error("Mappls initialization script failed to load:", err);
      setMapInitError('MapmyIndia SDK library failed to load.');
    }

    fetchPositions();
    const interval = setInterval(fetchPositions, 15000); // refresh telemetry feed every 15s

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Update Mappls Map Layers (Markers, Polylines and Driving Directions)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !mapplsLibRef.current) return;
    
    const map = mapInstanceRef.current;
    const mapplsLib = mapplsLibRef.current;

    // 1. Clear previous standard layers (markers, polylines)
    Object.values(markersRef.current).forEach(marker => {
      try { mapplsLib.removeLayer({ map, layer: marker }); } catch (e) {}
    });
    Object.values(polylinesRef.current).forEach(poly => {
      try { mapplsLib.removeLayer({ map, layer: poly }); } catch (e) {}
    });
    markersRef.current = {};
    polylinesRef.current = {};

    // 2. Clear previous Direction Plugin Route
    if (directionRef.current) {
      try {
        directionRef.current.remove();
      } catch (e) {
        try { mapplsLib.removeLayer({ map, layer: directionRef.current }); } catch (err) {}
      }
      directionRef.current = null;
    }

    if (positions.length === 0) return;

    // Draw active trips
    positions.forEach(trip => {
      const isSelected = trip.id === selectedTripId;
      
      if (isSelected) {
        // 3. Draw PERFECT ROAD ROUTE directions using Mappls Direction Plugin
        try {
          console.log(`Routing road directions for selected trip: ${trip.source} -> ${trip.destination}`);
          const mapplsPlugin = new mappls_plugin();
          const routeObj = mapplsPlugin.direction({
            map: map,
            start: `${trip.startLocation.lat},${trip.startLocation.lng}`,
            end: `${trip.endLocation.lat},${trip.endLocation.lng}`,
            strokeColor: '#ea580c',
            strokeWeight: 6,
            fitbounds: true
          });
          directionRef.current = routeObj;
        } catch (err) {
          console.error("Error generating Mappls road directions: ", err);
          
          // Fallback to straight polyline if directions API fails/throttles
          try {
            const poly = mapplsLib.Polyline({
              map: map,
              path: [
                { lat: trip.startLocation.lat, lng: trip.startLocation.lng },
                { lat: trip.endLocation.lat, lng: trip.endLocation.lng }
              ],
              strokeColor: '#ea580c',
              strokeOpacity: 0.95,
              strokeWeight: 5,
              fitbounds: true
            });
            polylinesRef.current[trip.id] = poly;
          } catch (e) {}
        }
      } else {
        // 4. Draw standard straight polyline for other active trips
        try {
          const poly = mapplsLib.Polyline({
            map: map,
            path: [
              { lat: trip.startLocation.lat, lng: trip.startLocation.lng },
              { lat: trip.endLocation.lat, lng: trip.endLocation.lng }
            ],
            strokeColor: '#94a3b8',
            strokeOpacity: 0.4,
            strokeWeight: 2
          });
          polylinesRef.current[trip.id] = poly;
        } catch (err) {
          console.error("Error drawing inactive polyline: ", err);
        }
      }

      // 5. Draw Live Vehicle Position Marker
      try {
        const marker = mapplsLib.Marker({
          map: map,
          position: { lat: trip.currentLocation.lat, lng: trip.currentLocation.lng },
          title: `Vehicle: ${trip.vehicle} · Driver: ${trip.driver}`
        });

        // Click handler to select trip
        marker.addListener('click', () => {
          setSelectedTripId(trip.id);
        });

        markersRef.current[trip.id] = marker;
      } catch (err) {
        console.error("Error drawing Mappls Marker: ", err);
      }
    });

  }, [positions, selectedTripId, mapReady]);

  const selectedTrip = positions.find(p => p.id === selectedTripId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Live Fleet Operations Map</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Powered by <strong>MapmyIndia Mappls</strong> telemetry SDK. Showing live positions, active route tracks, and driver fatigue indicators.
          </p>
        </div>
        <button 
          onClick={fetchPositions} 
          className="btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
        >
          <RefreshCw size={16} /> Update Feed
        </button>
      </div>

      {/* Main split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 20, alignItems: 'start' }}>
        
        {/* Map Panel */}
        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', minHeight: 520, background: '#1e293b', border: '1px solid #334155', position: 'relative', overflow: 'hidden', padding: 0 }}>
          
          {mapInitError && (
            <div style={{ padding: 24, textAlign: 'center', margin: 'auto', color: '#ef4444' }}>
              <AlertTriangle size={32} style={{ marginBottom: 12 }} />
              <p style={{ margin: 0, fontWeight: 700 }}>Map Initialization Error</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>{mapInitError}</p>
            </div>
          )}

          {!mapReady && !mapInitError && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, flexDirection: 'column', gap: 12 }}>
              <div style={{ width: 36, height: 36, border: '3px solid rgba(56, 189, 248, 0.2)', borderRadius: '50%', borderTopColor: '#38bdf8', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Loading MapmyIndia Vector Engine...</span>
            </div>
          )}

          {/* MapmyIndia Container */}
          <div 
            id="mappls-live-map" 
            style={{ 
              width: '100%', 
              height: 520, 
              display: mapReady ? 'block' : 'none' 
            }} 
          />

          {/* Details Card on Map Bottom */}
          {selectedTrip && mapReady && (
            <div style={{ 
              position: 'absolute', bottom: 16, left: 16, right: 16, 
              background: 'rgba(30, 41, 59, 0.95)', border: '1px solid #334155',
              padding: 16, borderRadius: 12, display: 'flex', justifySelf: 'space-between',
              alignItems: 'center', flexWrap: 'wrap', gap: 12, zIndex: 10
            }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase' }}>Selected vehicle feed</span>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', margin: '4px 0 0 0' }}>
                  {selectedTrip.vehicle} · {selectedTrip.vehicleModel}
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                  Route: <strong>{selectedTrip.source} → {selectedTrip.destination}</strong> ({selectedTrip.plannedDistanceKm} km)
                </p>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8' }}>Progress</span>
                  <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{selectedTrip.progress}% done</strong>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8' }}>Driver & Safety</span>
                  <strong style={{ fontSize: '0.9rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={12} color="#f97316" /> {selectedTrip.driver}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Active List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card-premium">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Navigation size={18} color="#f97316" /> Active Dispatches ({positions.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 440, overflowY: 'auto' }}>
              {positions.length > 0 ? positions.map(p => {
                const isSelected = p.id === selectedTripId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedTripId(p.id)}
                    style={{
                      padding: 12,
                      background: isSelected ? '#ffedd5' : '#f8fafc',
                      border: isSelected ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'all 150ms ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>{p.source} → {p.destination}</strong>
                      <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f97316' }}>{p.progress}%</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: '0.75rem', color: '#64748b' }}>
                      <span>Truck: <strong>{p.vehicle}</strong></span>
                      <span>Driver: <strong>{p.driver}</strong></span>
                    </div>

                    {p.isFatigued && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, color: '#ef4444', fontSize: '0.7rem', fontWeight: 700 }}>
                        <AlertTriangle size={12} />
                        <span>Fatigue Warning! (Rolling hours close to limit)</span>
                      </div>
                    )}
                  </div>
                );
              }) : (
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', padding: '20px 0' }}>No active vehicles on map.</p>
              )}
            </div>
          </div>
        </div>

      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
