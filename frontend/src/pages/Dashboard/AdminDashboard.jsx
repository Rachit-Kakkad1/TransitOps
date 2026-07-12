import { Link } from 'react-router-dom';
import { 
  Users, Truck, ShieldAlert, Navigation, Clock, ShieldCheck, UserX, AlertTriangle, Shield 
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';

export default function AdminDashboard({ kpis, recentUsers, systemActivity }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Dashboard Header with navigation to Control Center */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>System Admin Dashboard</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>Global KPIs, Active Lockouts, and Unified Audit Streams.</p>
        </div>
        <Link 
          to="/admin/users" 
          style={{ 
            textDecoration: 'none', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 8, 
            padding: '10px 20px', 
            backgroundColor: '#f97316', 
            color: '#fff', 
            fontWeight: 700, 
            borderRadius: 8, 
            fontSize: '0.85rem',
            boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.2)'
          }}
        >
          <ShieldCheck size={16} /> Open Control Center
        </Link>
      </div>
      {/* Overview Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <StatCard icon={Users} label="Total User Accounts" value={kpis.totalUsers} sub="All registered system roles" />
        <StatCard icon={Truck} label="Fleet Vehicles" value={kpis.totalVehicles} sub="Total fleet assets in DB" />
        <StatCard icon={ShieldCheck} label="Active Drivers" value={kpis.totalDrivers} sub="Registered transit operators" />
        <StatCard icon={Navigation} label="Total Trips Logged" value={kpis.totalTrips} sub="All trips across operations" />
        <StatCard icon={ShieldAlert} label="Locked Accounts" value={kpis.lockedUsers} sub="Failed login block status" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, flexWrap: 'wrap' }}>
        {/* User Accounts Management panel */}
        <div className="card-premium" style={{ flex: 1.2 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>System User Accounts</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Failed Logins</th>
                  <th>Lock Status</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>
                      {u.name}
                      <br />
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{u.email}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                      {u.role.replace('_', ' ')}
                    </td>
                    <td>
                      <StatusChip status={u.isActive ? 'Active' : 'Suspended'} />
                    </td>
                    <td style={{ textAlign: 'center', color: u.failedAttempts > 0 ? '#b91c1c' : '#64748b', fontWeight: 600 }}>
                      {u.failedAttempts}
                    </td>
                    <td>
                      {u.lockedUntil && new Date(u.lockedUntil) > new Date() ? (
                        <span style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <UserX size={14} /> Locked Out
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Shield size={14} /> Unlocked
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Activity Feed / Audit panel */}
        <div className="card-premium" style={{ flex: 0.8 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={18} color="#f97316" /> Recent Operations Audit Feed
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {systemActivity && systemActivity.length > 0 ? (
              systemActivity.map(act => (
                <div key={act.id} style={{ display: 'flex', gap: 12, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ 
                    width: 32, height: 32, borderRadius: '50%', 
                    background: act.type === 'TRIP' ? '#eff6ff' : '#fff7ed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    {act.type === 'TRIP' ? (
                      <Navigation size={16} color="#2563eb" />
                    ) : (
                      <Clock size={16} color="#ea580c" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 2px 0', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{act.description}</p>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#64748b' }}>{act.details}</p>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(act.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No recent system activities logged.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
