import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Builds a small colored pin marker as a Leaflet divIcon so we avoid the
 * broken default marker-image resolution that bundlers introduce.
 */
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

const START_ICON = pinIcon('#1e293b');
const END_ICON = pinIcon('#f97316');

/**
 * Imperatively fits the map viewport to the route bounds whenever the
 * polyline changes. Rendered as a child so it has access to the map instance.
 */
function FitBounds({ points }) {
  const map = useMap();

  React.useEffect(() => {
    if (!points || points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [60, 60], animate: true, duration: 1.2 });
  }, [map, points]);

  return null;
}

export default function RouteMap({ startCoords, endCoords, polylinePoints, startLabel, endLabel }) {
  const path = useMemo(
    () => (polylinePoints || []).map(p => [p[0], p[1]]),
    [polylinePoints]
  );

  if (!startCoords || !endCoords || path.length === 0) {
    return null;
  }

  return (
    <MapContainer
      center={startCoords}
      zoom={7}
      zoomControl={true}
      scrollWheelZoom={true}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '12px',
        border: '1px solid #cbd5e1',
        boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        zIndex: 10
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Polyline
        positions={path}
        pathOptions={{ color: '#f97316', weight: 5, opacity: 0.9 }}
      />

      <Marker position={startCoords} icon={START_ICON}>
        <Popup>
          <div style={{ padding: '2px 4px', fontWeight: 800, fontSize: 12, color: '#1e293b', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            {startLabel}
          </div>
        </Popup>
      </Marker>

      <Marker position={endCoords} icon={END_ICON}>
        <Popup>
          <div style={{ padding: '2px 4px', fontWeight: 800, fontSize: 12, color: '#f97316', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            {endLabel}
          </div>
        </Popup>
      </Marker>

      <FitBounds points={path} />
    </MapContainer>
  );
}
