import { useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, Legend, BarChart, Bar
} from 'recharts';
import { 
  DollarSign, TrendingUp, TrendingDown, Percent, Wrench, 
  AlertTriangle, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 
} from 'lucide-react';
import { financeService } from '../../services/financeService';
import StatCard from '../../components/ui/StatCard';

export default function FinancialDashboard() {
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [ovData, trendData, vehData, anomData] = await Promise.all([
          financeService.getOverview(),
          financeService.getTrends(),
          financeService.getVehicles(),
          financeService.getAnomalies()
        ]);
        setOverview(ovData);
        setTrends(trendData);
        setVehicles(vehData);
        setAnomalies(anomData);
      } catch (err) {
        setError(err.message || 'Failed to load financial intelligence metrics.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
        <div style={{
          width: 40, height: 40, border: '3px solid rgba(249, 115, 22, 0.2)',
          borderRadius: '50%', borderTopColor: '#f97316',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Loading financial data engine...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, color: '#991b1b' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800 }}>Engine Load Failure</h3>
        <p style={{ margin: 0, fontSize: '0.85rem' }}>{error}</p>
      </div>
    );
  }

  const { kpis, expenseBreakdown } = overview;
  const topVehicles = vehicles.slice(0, 3);
  const bottomVehicles = [...vehicles].filter(v => v.roiPct < 0 || v.profit < 0).reverse().slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Finance Hero Area */}
      <div className="finance-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>
              Fleet ROI Command Center
            </span>
            <span style={{ fontSize: '0.7rem', background: '#1e293b', border: '1px solid #475569', color: '#38bdf8', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
              Live Financial Auditing
            </span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>Fleet Financial Performance</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 4 }}>True operational margin and expenditure tracking.</p>
        </div>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ borderRight: '1px solid #334155', paddingRight: 32 }}>
            <span style={{ display: 'block', fontSize: '0.725rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total Revenue</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>₹{kpis.totalRevenue.toLocaleString('en-IN')}</span>
          </div>
          <div style={{ borderRight: '1px solid #334155', paddingRight: 32 }}>
            <span style={{ display: 'block', fontSize: '0.725rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Operating Cost</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444' }}>₹{kpis.totalOpex.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.725rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Net Profit</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: kpis.fleetProfit >= 0 ? '#38bdf8' : '#ef4444' }}>
              ₹{kpis.fleetProfit.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <StatCard icon={Percent} label="Profit Margin" value={`${kpis.profitMarginPct}%`} sub="Net operational margin" />
        <StatCard icon={DollarSign} label="Cost Per KM" value={`₹${kpis.avgCostPerKm}`} sub="Aggregate actual cost/km" />
        <StatCard icon={TrendingUp} label="Fuel Cost Share" value={`${kpis.fuelSharePct}%`} sub="Fuel expenditure ratio" />
        <StatCard icon={Wrench} label="Maint. Cost Share" value={`${kpis.maintenanceSharePct}%`} sub="Maintenance record ratio" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {/* Cost Breakdown Donut */}
        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Expense Allocation Breakdown</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flex: 1, flexWrap: 'wrap' }}>
            <div style={{ width: 140, height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseBreakdown} dataKey="value" cx="50%" cy="50%"
                    innerRadius={42} outerRadius={60} paddingAngle={2}
                  >
                    {expenseBreakdown.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `₹${val.toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {expenseBreakdown.map((entry, idx) => {
                const pct = kpis.totalOpex > 0 ? ((entry.value / kpis.totalOpex) * 100).toFixed(1) : 0;
                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
                      <span style={{ color: '#475569', fontWeight: 500 }}>{entry.name}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 700, color: '#0f172a', marginRight: 6 }}>₹{entry.value.toLocaleString('en-IN')}</span>
                      <span style={{ color: '#64748b', fontSize: '0.725rem' }}>({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 12-Month Revenue vs OpEx Trend */}
        <div className="card-premium">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>12-Month Profit & Spend Trend</h3>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tickFormatter={(v) => `${v/1000}k`} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip formatter={(val) => `₹${val.toLocaleString('en-IN')}`} />
                <Legend wrapperStyle={{ fontSize: '0.75rem', marginTop: 10 }} />
                <Area type="monotone" name="Revenue" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                <Area type="monotone" name="Total Cost" dataKey="totalCost" stroke="#ef4444" fillOpacity={1} fill="url(#colorCost)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Profitability Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {/* Top Performers */}
        <div className="card-premium">
          <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={16} /> Top 3 Profitable Vehicles
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Total Cost</th>
                  <th>Net Profit</th>
                  <th>ROI</th>
                </tr>
              </thead>
              <tbody>
                {topVehicles.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>
                      {v.registrationNumber}
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>{v.model}</span>
                    </td>
                    <td>₹{v.totalOpex.toLocaleString('en-IN')}</td>
                    <td className="profit-positive">₹{v.profit.toLocaleString('en-IN')}</td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem' }}>
                        +{v.roiPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Capital Drain Warnings */}
        <div className="card-premium">
          <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 800, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldAlert size={16} /> Bottom Margin-Destroying Vehicles
          </h3>
          <div style={{ overflowX: 'auto' }}>
            {bottomVehicles.length > 0 ? (
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Total Cost</th>
                    <th>Net Margin</th>
                    <th>ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {bottomVehicles.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
                        {v.registrationNumber}
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>{v.model}</span>
                      </td>
                      <td>₹{v.totalOpex.toLocaleString('en-IN')}</td>
                      <td className="profit-negative">₹{v.profit.toLocaleString('en-IN')}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: '#991b1b', background: '#fee2e2', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem' }}>
                          {v.roiPct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '32px 0', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>All vehicles operational with positive ROI margins.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Anomalies and alerts feed */}
      <div className="card-premium">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={18} color="#ef4444" /> Flagged Operational Anomalies
          </h3>
          <span style={{ fontSize: '0.725rem', background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
            {anomalies.length} Flagged
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {anomalies.length > 0 ? (
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Logged Date</th>
                  <th>Category</th>
                  <th>Details</th>
                  <th>Audit Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.slice(0, 4).map(anom => (
                  <tr key={anom.id}>
                    <td style={{ fontWeight: 700 }}>{anom.vehicleReg}<br /><span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>{anom.vehicleModel}</span></td>
                    <td style={{ color: '#64748b' }}>{new Date(anom.loggedOn).toLocaleDateString()}</td>
                    <td>
                      <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700, color: '#475569', background: '#e2e8f0', padding: '3px 8px', borderRadius: 4 }}>
                        {anom.category}
                      </span>
                    </td>
                    <td style={{ color: '#475569' }}>
                      {anom.tripRoute ? `Trip: ${anom.tripRoute}` : 'Fleet Standalone Log'}
                      {anom.liters && ` (${anom.liters} L)`}
                    </td>
                    <td style={{ fontWeight: 700, color: '#991b1b' }}>₹{anom.cost.toLocaleString('en-IN')}</td>
                    <td>
                      <span className="anomaly-badge">ABNORMAL SPEND</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>No spend anomalies detected in the current audit window.</p>
          )}
        </div>
      </div>
    </div>
  );
}
