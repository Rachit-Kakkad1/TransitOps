import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Truck, Wrench, Navigation, DollarSign, Users, AlertTriangle, 
  CheckCircle2, Clock, Calendar, BarChart3, Zap, Shield, FileText
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import AdminDashboard from './AdminDashboard';
import SafetyOfficerDashboard from './SafetyOfficerDashboard';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/dashboard/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Failed to fetch dashboard data.');
      }

      setData(resData.data);
    } catch (err) {
      setError(err.message || 'An unexpected network error occurred.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
        <div style={{
          width: 40, height: 40, border: '3px solid rgba(249, 115, 22, 0.2)',
          borderRadius: '50%', borderTopColor: '#f97316',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Loading dashboard analytics...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, color: '#991b1b' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800 }}>Failed to Load Dashboard</h3>
        <p style={{ margin: 0, fontSize: '0.85rem' }}>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  // Dispatch layout view depending on the user's role
  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard kpis={data.kpis} recentUsers={data.recentUsers} systemActivity={data.systemActivity} />;
    case 'FLEET_MANAGER':
      return <FleetManagerDashboard kpis={data.kpis} fleetStatus={data.fleetStatusData} recentTrips={data.recentTrips} maintenance={data.activeMaintenance} />;
    case 'DISPATCHER':
      return <DispatcherDashboard kpis={data.kpis} pendingTrips={data.pendingTrips} activeTrips={data.activeTrips} vehicles={data.availableVehicles} drivers={data.availableDrivers} />;
    case 'DRIVER':
      return <DriverDashboard driver={data.driver} activeTrip={data.activeTrip} upcomingTrips={data.upcomingTrips} errorMsg={data.error} />;
    case 'SAFETY_OFFICER': {
      let tab = 'overview';
      if (location.pathname === '/drivers') {
        tab = 'drivers';
      } else if (location.pathname === '/trips') {
        tab = 'trips';
      }
      return (
        <SafetyOfficerDashboard 
          kpis={data.kpis} 
          distribution={data.safetyDistribution} 
          alertingDrivers={data.alertingDrivers} 
          onRefresh={() => fetchDashboardData(false)} 
          initialTab={tab} 
        />
      );
    }
    case 'FINANCIAL_ANALYST':
      return <FinancialAnalystDashboard kpis={data.kpis} breakdown={data.expenseBreakdown} roiData={data.vehicleROI} />;
    default:
      return (
        <div style={{ padding: 24 }}>
          <h3>Unknown user role: {user.role}</h3>
        </div>
      );
  }
}

/**
 * 1. FLEET MANAGER DASHBOARD VIEW
 */
function FleetManagerDashboard({ kpis, fleetStatus, recentTrips, maintenance }) {
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

/**
 * 2. DISPATCHER DASHBOARD VIEW
 */
function DispatcherDashboard({ kpis, pendingTrips, activeTrips, vehicles, drivers }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <StatCard icon={FileText} label="Pending Dispatches" value={kpis.pendingCount} sub="Trips in draft queue" />
        <StatCard icon={Navigation} label="Active Trips" value={kpis.activeCount} sub="Vehicles in transit" />
        <StatCard icon={Truck} label="Available Vehicles" value={kpis.availableVehiclesCount} sub="Ready to roll" />
        <StatCard icon={Users} label="Available Drivers" value={kpis.availableDriversCount} sub="On-duty & available" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
        {/* Active Trips queue */}
        <div className="card-premium">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Active Operations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeTrips.length > 0 ? activeTrips.map(trip => (
              <div key={trip.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <p style={{ margin: '0 0 2px 0', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{trip.source} → {trip.destination}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                    Vehicle: <strong>{trip.vehicle}</strong> · Driver: <strong>{trip.driver}</strong>
                  </p>
                </div>
                <StatusChip status="Dispatched" />
              </div>
            )) : (
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No active dispatches</p>
            )}
          </div>
        </div>

        {/* Resources Available */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card-premium" style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Available Drivers</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {drivers.length > 0 ? drivers.slice(0, 4).map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingBottom: 6, borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ fontWeight: 600 }}>{d.fullName}</span>
                  <span style={{ color: '#64748b' }}>Safety: {parseFloat(d.safetyScore)}%</span>
                </div>
              )) : (
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>None available</p>
              )}
            </div>
          </div>

          <div className="card-premium" style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Available Vehicles</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vehicles.length > 0 ? vehicles.slice(0, 4).map(v => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingBottom: 6, borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ fontWeight: 600 }}>{v.registrationNumber}</span>
                  <span style={{ color: '#64748b' }}>{v.model}</span>
                </div>
              )) : (
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>None available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 3. DRIVER DASHBOARD VIEW
 */
function DriverDashboard({ driver, activeTrip, upcomingTrips, errorMsg }) {
  if (errorMsg) {
    return (
      <div style={{ padding: '24px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 12, color: '#b45309' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800 }}>Profile Config Gap</h3>
        <p style={{ margin: 0, fontSize: '0.85rem' }}>{errorMsg}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Driver metadata card */}
      <div className="card-premium" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Welcome, {driver.name}</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>License: <strong>{driver.licenseNumber}</strong> · Status: <StatusChip status={driver.status} /></p>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Safety Score</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#166534' }}>{driver.safetyScore}%</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Duty Hours</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{driver.rollingDutyHours} hrs</span>
          </div>
        </div>
      </div>

      {/* Active trip section */}
      <div className="card-premium">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Current Assigned Route</h3>
        {activeTrip ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 12, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{activeTrip.source} → {activeTrip.destination}</span>
                <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>Vehicle: <strong>{activeTrip.vehicle}</strong></span>
              </div>
              <StatusChip status="Dispatched" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Cargo Weight</span>
                <span style={{ display: 'block', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{activeTrip.cargoWeightKg.toLocaleString()} kg</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Planned Distance</span>
                <span style={{ display: 'block', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{activeTrip.plannedDistanceKm} km</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Dispatched On</span>
                <span style={{ display: 'block', fontSize: '1.0rem', fontWeight: 700, color: '#0f172a' }}>{new Date(activeTrip.dispatchedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ textAlign: 'center', padding: '30px 0', fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>You are not currently assigned to any active route.</p>
        )}
      </div>

      {/* Upcoming Trips list */}
      <div className="card-premium">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Upcoming Assignments</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {upcomingTrips.length > 0 ? upcomingTrips.map(trip => (
            <div key={trip.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{trip.source} → {trip.destination}</span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Vehicle: {trip.vehicle} · Distance: {trip.plannedDistanceKm} km</span>
              </div>
              <StatusChip status="Draft" />
            </div>
          )) : (
            <p style={{ textAlign: 'center', padding: '10px 0', fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>No upcoming assignments found.</p>
          )}
        </div>
      </div>
    </div>
  );
}


/**
 * 5. FINANCIAL ANALYST DASHBOARD VIEW
 */
function FinancialAnalystDashboard({ kpis, breakdown, roiData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Financial KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <StatCard icon={DollarSign} label="Total Cost" value={`₹${kpis.totalCost.toLocaleString('en-IN')}`} sub="Aggregate fleet operational spend" />
        <StatCard icon={Zap} label="Fuel Costs" value={`₹${kpis.fuelCost.toLocaleString('en-IN')}`} sub="Fuel expenses total" />
        <StatCard icon={Wrench} label="Maintenance Spend" value={`₹${kpis.maintenanceCost.toLocaleString('en-IN')}`} sub="Maintenance record costs" />
        <StatCard icon={DollarSign} label="Other Costs" value={`₹${kpis.otherCost.toLocaleString('en-IN')}`} sub="Toll & administrative fees" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 20 }}>
        {/* Cost Breakdown Donut Chart */}
        <div className="card-premium">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Expense Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={breakdown} dataKey="value" cx="50%" cy="50%"
                  innerRadius={45} outerRadius={65} paddingAngle={2}
                >
                  {breakdown.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => `₹${val.toLocaleString('en-IN')}`} />
              </PieChart>
            </ResponsiveContainer>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              {breakdown.map((entry, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color }} />
                    <span style={{ color: '#475569' }}>{entry.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{entry.value.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROI Table */}
        <div className="card-premium">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Vehicle ROI Snapshot</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Revenue</th>
                  <th>Costs</th>
                  <th>Profit</th>
                  <th>ROI</th>
                </tr>
              </thead>
              <tbody>
                {roiData.slice(0, 5).map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{v.registrationNumber}<br /><span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>{v.model}</span></td>
                    <td>₹{v.revenue.toLocaleString('en-IN')}</td>
                    <td>₹{v.costs.toLocaleString('en-IN')}</td>
                    <td>₹{v.profit.toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: 700, color: v.roiPercent >= 0 ? '#166534' : '#991b1b' }}>{v.roiPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
