import { useState, useEffect } from 'react';
import { Users, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import StatusChip from '../../components/ui/StatusChip';

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const token = authService.getToken();
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/drivers`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        
        if (result.success) {
          setDrivers(result.data);
        } else {
          setError(result.message || 'Failed to load drivers');
        }
      } catch (err) {
        setError('An error occurred while fetching drivers.');
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  if (loading) {
    return <div style={{ padding: 24, color: '#64748b' }}>Loading drivers...</div>;
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
        <Users size={28} color="#0f172a" />
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Driver Registry</h1>
      </div>

      <div className="card-premium">
        <div style={{ overflowX: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>License No.</th>
                <th>Category</th>
                <th>Safety Score</th>
                <th>Duty Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600, color: '#0f172a' }}>{d.fullName}</td>
                  <td>{d.licenseNumber}</td>
                  <td>{d.licenseCategory}</td>
                  <td style={{ color: Number(d.safetyScore) >= 90 ? '#10b981' : Number(d.safetyScore) >= 70 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
                    {Number(d.safetyScore).toFixed(1)} / 100
                  </td>
                  <td>{Number(d.rollingDutyHours).toFixed(1)} hrs</td>
                  <td>
                    <StatusChip status={d.status === 'available' ? 'Available' : d.status === 'on_trip' ? 'On Trip' : d.status === 'off_duty' ? 'Off Duty' : 'Suspended'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {drivers.length === 0 && (
            <p style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>No drivers found in the dataset.</p>
          )}
        </div>
      </div>
    </div>
  );
}
