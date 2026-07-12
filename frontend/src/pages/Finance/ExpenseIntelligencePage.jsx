import { useState, useEffect } from 'react';
import { 
  DollarSign, Calendar, Filter, Download, Search, 
  AlertTriangle, Check, RefreshCw 
} from 'lucide-react';
import { financeService } from '../../services/financeService';

export default function ExpenseIntelligencePage() {
  const [expenses, setExpenses] = useState([]);
  const [totals, setTotals] = useState({ fuel: 0, toll: 0, other: 0, total: 0, count: 0, anomalies: 0 });
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [category, setCategory] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch vehicles for filter dropdown
  useEffect(() => {
    async function loadVehicles() {
      try {
        const data = await financeService.getVehicles();
        setVehicles(data);
      } catch (err) {
        console.error('Failed to load filter vehicles:', err);
      }
    }
    loadVehicles();
  }, []);

  // Fetch expenses with filters
  const fetchExpenses = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await financeService.getExpenses({
        category,
        vehicleId,
        startDate,
        endDate
      });
      setExpenses(data.expenses);
      setTotals(data.totals);
    } catch (err) {
      setError(err.message || 'Failed to fetch operational expenses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [category, vehicleId, startDate, endDate]);

  const handleResetFilters = () => {
    setCategory('');
    setVehicleId('');
    setStartDate('');
    setEndDate('');
  };

  const handleCSVExport = () => {
    if (expenses.length === 0) return;

    const headers = [
      'Logged On', 'Vehicle Registration', 'Vehicle Model', 'Trip Route', 
      'Category', 'Volume (Liters)', 'Cost (INR)', 'Anomaly Status'
    ];

    const rows = expenses.map(e => [
      new Date(e.loggedOn).toLocaleDateString(),
      e.vehicleReg,
      e.vehicleModel,
      e.tripRoute || 'Fleet Log',
      e.category.toUpperCase(),
      e.liters || '',
      e.cost,
      e.anomalyFlag ? 'ABNORMAL' : 'NORMAL'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(row => row.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TransitOps_Expense_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Operational Expense Ledger</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>Audit fuel slips, highway toll cards, and miscellaneous operational costs.</p>
        </div>
        <button className="btn-export" onClick={handleCSVExport} disabled={expenses.length === 0}>
          <Download size={16} /> Export Expense Ledger
        </button>
      </div>

      {/* Filter strip */}
      <div className="filter-bar">
        {/* Category Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Category</span>
          <select 
            className="filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="fuel">Fuel Logs</option>
            <option value="toll">Toll Charges</option>
            <option value="other">Other / Misc</option>
          </select>
        </div>

        {/* Vehicle Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Vehicle Asset</span>
          <select 
            className="filter-select"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            style={{ minWidth: 180 }}
          >
            <option value="">All Vehicles</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.registrationNumber} ({v.model})</option>
            ))}
          </select>
        </div>

        {/* Date Start */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Start Date</span>
          <input
            type="date"
            className="filter-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '6px 12px' }}
          />
        </div>

        {/* Date End */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>End Date</span>
          <input
            type="date"
            className="filter-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: '6px 12px' }}
          />
        </div>

        <button 
          onClick={handleResetFilters}
          style={{
            marginTop: 18,
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            fontSize: '0.8rem',
            color: '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <RefreshCw size={14} /> Clear Filters
        </button>
      </div>

      {/* Summary KPI Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div className="card-premium" style={{ padding: '16px 20px', minHeight: 'auto' }}>
          <span style={{ fontSize: '0.675rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Filtered Cost</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', display: 'block', marginTop: 4 }}>₹{totals.total.toLocaleString('en-IN')}</span>
        </div>
        <div className="card-premium" style={{ padding: '16px 20px', minHeight: 'auto' }}>
          <span style={{ fontSize: '0.675rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Fuel Share</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', display: 'block', marginTop: 4 }}>₹{totals.fuel.toLocaleString('en-IN')}</span>
        </div>
        <div className="card-premium" style={{ padding: '16px 20px', minHeight: 'auto' }}>
          <span style={{ fontSize: '0.675rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Toll Fees</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6', display: 'block', marginTop: 4 }}>₹{totals.toll.toLocaleString('en-IN')}</span>
        </div>
        <div className="card-premium" style={{ padding: '16px 20px', minHeight: 'auto' }}>
          <span style={{ fontSize: '0.675rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Other Ops</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6', display: 'block', marginTop: 4 }}>₹{totals.other.toLocaleString('en-IN')}</span>
        </div>
        <div className="card-premium" style={{ padding: '16px 20px', minHeight: 'auto', borderLeft: totals.anomalies > 0 ? '4px solid #ef4444' : '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.675rem', fontWeight: 700, color: totals.anomalies > 0 ? '#991b1b' : '#64748b', textTransform: 'uppercase' }}>Anomalies</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: totals.anomalies > 0 ? '#ef4444' : '#10b981', display: 'block', marginTop: 4 }}>
            {totals.anomalies} Flagged
          </span>
        </div>
      </div>

      {/* Expense ledger table */}
      <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', flexDirection: 'column', gap: 12 }}>
            <div style={{
              width: 32, height: 32, border: '3px solid rgba(249, 115, 22, 0.2)',
              borderRadius: '50%', borderTopColor: '#f97316',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Refreshing ledger...</span>
          </div>
        ) : error ? (
          <div style={{ padding: '24px', color: '#991b1b', background: '#fee2e2', textAlign: 'center' }}>
            {error}
          </div>
        ) : expenses.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            No expenses found for the selected query.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="premium-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Logged Date</th>
                  <th>Vehicle</th>
                  <th>Route / Assignment</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Fuel Vol (L)</th>
                  <th style={{ textAlign: 'right' }}>Cost</th>
                  <th style={{ textAlign: 'center' }}>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td style={{ color: '#475569', fontWeight: 500 }}>
                      {new Date(e.loggedOn).toLocaleDateString()}
                      <span style={{ display: 'block', fontSize: '0.675rem', color: '#94a3b8' }}>
                        {new Date(e.loggedOn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>
                      {e.vehicleReg}
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                        {e.vehicleModel}
                      </span>
                    </td>
                    <td style={{ color: '#475569' }}>
                      {e.tripRoute ? e.tripRoute : (
                        <span style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.8rem' }}>Fleet General Expense</span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        textTransform: 'uppercase',
                        background: e.category === 'fuel' ? '#fef3c7' : e.category === 'toll' ? '#dbeafe' : '#f3e8ff',
                        color: e.category === 'fuel' ? '#d97706' : e.category === 'toll' ? '#2563eb' : '#7c3aed'
                      }}>
                        {e.category}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#475569' }}>
                      {e.liters !== null ? `${e.liters} L` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                      ₹{e.cost.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {e.anomalyFlag ? (
                        <span className="anomaly-badge">ABNORMAL SPEND</span>
                      ) : (
                        <span style={{ color: '#166534', background: '#dcfce7', padding: '3px 8px', borderRadius: 12, fontSize: '0.725rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Check size={12} /> Audited
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
