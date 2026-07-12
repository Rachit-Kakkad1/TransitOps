import { useState, useEffect } from 'react';
import { Map, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import StatusChip from '../../components/ui/StatusChip';

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const token = authService.getToken();
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/trips`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        
        if (result.success) {
          setTrips(result.data);
        } else {
          setError(result.message || 'Failed to load trips');
        }
      } catch (err) {
        setError('An error occurred while fetching trips.');
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

  if (loading) {
    return <div style={{ padding: 24, color: '#64748b' }}>Loading trips...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertCircle size={20} />
        {error}
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Map size={28} color="#0f172a" />
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Active & Past Trips</h1>
      </div>

      <div className="card-premium">
        <div style={{ overflowX: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Distance (km)</th>
                <th>Weight (kg)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {trips.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, color: '#0f172a' }}>{t.source} → {t.destination}</td>
                  <td>{t.vehicle ? t.vehicle.registrationNumber : 'Unassigned'}</td>
                  <td>{t.driver ? t.driver.fullName : 'Unassigned'}</td>
                  <td>{Number(t.actualDistanceKm || t.plannedDistanceKm).toLocaleString()}</td>
                  <td>{Number(t.cargoWeightKg).toLocaleString()}</td>
                  <td>
                    <StatusChip status={t.status.charAt(0).toUpperCase() + t.status.slice(1)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {trips.length === 0 && (
            <p style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>No trips found in the dataset.</p>
          )}
        </div>
      </div>
    </div>
  );
}
