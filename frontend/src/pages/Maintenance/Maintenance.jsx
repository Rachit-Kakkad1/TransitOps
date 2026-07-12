import { useState, useEffect } from 'react';
import { Wrench, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import StatusChip from '../../components/ui/StatusChip';

export default function Maintenance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMaintenance = async () => {
      try {
        const token = authService.getToken();
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/maintenance`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        
        if (result.success) {
          setRecords(result.data);
        } else {
          setError(result.message || 'Failed to load maintenance records');
        }
      } catch (err) {
        setError('An error occurred while fetching maintenance records.');
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenance();
  }, []);

  if (loading) {
    return <div style={{ padding: 24, color: '#64748b' }}>Loading maintenance records...</div>;
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
        <Wrench size={28} color="#0f172a" />
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Maintenance Logs</h1>
      </div>

      <div className="card-premium">
        <div style={{ overflowX: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Description</th>
                <th>Cost</th>
                <th>Opened At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600, color: '#0f172a' }}>{m.vehicle ? m.vehicle.registrationNumber : 'Unknown'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{m.type}</td>
                  <td>{m.description}</td>
                  <td>${Number(m.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>{new Date(m.openedAt).toLocaleDateString()}</td>
                  <td>
                    <StatusChip status={m.status === 'open' ? 'In Shop' : 'Completed'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 && (
            <p style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>No maintenance records found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
