import { useState, useEffect } from 'react';
import { Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import StatusChip from '../../components/ui/StatusChip';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const token = authService.getToken();
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/vehicles`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        
        if (result.success) {
          setVehicles(result.data);
        } else {
          setError(result.message || 'Failed to load vehicles');
        }
      } catch (err) {
        setError('An error occurred while fetching vehicles.');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  if (loading) {
    return <div style={{ padding: 24, color: '#64748b' }}>Loading vehicles...</div>;
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
        <Truck size={28} color="#0f172a" />
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Fleet Vehicles</h1>
      </div>

      <div className="card-premium">
        <div style={{ overflowX: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Model</th>
                <th>Type</th>
                <th>Capacity (kg)</th>
                <th>Odometer (km)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600, color: '#0f172a' }}>{v.registrationNumber}</td>
                  <td>{v.model}</td>
                  <td>{v.type}</td>
                  <td>{Number(v.maxLoadCapacityKg).toLocaleString()}</td>
                  <td>{Number(v.odometerKm).toLocaleString()}</td>
                  <td>
                    <StatusChip status={v.status === 'on_trip' ? 'On Trip' : v.status === 'in_shop' ? 'In Shop' : v.status === 'available' ? 'Available' : 'Retired'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {vehicles.length === 0 && (
            <p style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>No vehicles found in the dataset.</p>
          )}
        </div>
      </div>
    </div>
  );
}
