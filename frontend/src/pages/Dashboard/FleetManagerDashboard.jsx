import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  Truck, Wrench, CheckCircle2, Zap, Clock
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';

export default function FleetManagerDashboard({ kpis, fleetStatus, recentTrips, maintenance }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overview stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <StatCard icon={Truck} label="Total Vehicles" value={kpis.totalVehicles} sub="Active non-retired fleet" />
        <StatCard icon={CheckCircle2} label="Available" value={kpis.availableVehicles} sub="Ready for assignments" />
        <StatCard icon={Zap} label="On Trip" value={kpis.onTripVehicles} sub="Currently in transit" />
        <StatCard icon={Wrench} label="In Shop" value={kpis.maintenanceVehicles} sub="Undergoing maintenance" />
        <StatCard icon={Clock} label="Fleet Utilization" value={`${kpis.utilizationRate}%`} sub="Vehicles in transit ratio" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flexWrap: 'wrap' }}>
        {/* Fleet status breakdown bar chart */}
        <div className="card-premium" style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Fleet Status Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={fleetStatus} layout="vertical" margin={{ left: 10, right: 20, top: 10 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.8rem' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                {fleetStatus.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Active Open Maintenance List */}
        <div className="card-premium" style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Active Maintenance Logs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {maintenance.length > 0 ? maintenance.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <p style={{ margin: '0 0 2px 0', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{m.vehicle} · {m.type}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{m.description}</p>
                </div>
                <StatusChip status="In Shop" />
              </div>
            )) : (
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No active maintenance tickets</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Trips Table */}
      <div className="card-premium">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Recent Trips Activity</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Dispatched</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTrips.map(trip => (
                <tr key={trip.id}>
                  <td style={{ fontWeight: 600, color: '#0f172a' }}>{trip.route}</td>
                  <td>{trip.vehicle}</td>
                  <td>{trip.driver}</td>
                  <td style={{ color: '#64748b' }}>{new Date(trip.timestamp).toLocaleDateString()}</td>
                  <td><StatusChip status={trip.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
