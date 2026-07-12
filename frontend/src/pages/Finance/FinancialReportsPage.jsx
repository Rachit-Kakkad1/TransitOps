import { useState, useEffect } from 'react';
import { 
  FileText, Download, Printer, AlertTriangle, ShieldCheck, 
  TrendingUp, Table, HelpCircle, FileSpreadsheet, AlertOctagon 
} from 'lucide-react';
import { financeService } from '../../services/financeService';

export default function FinancialReportsPage() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [anomData, vehData] = await Promise.all([
          financeService.getAnomalies(),
          financeService.getVehicles()
        ]);
        setAnomalies(anomData);
        setVehicles(vehData);
      } catch (err) {
        setError(err.message || 'Failed to load report parameters.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  // CSV Exporters
  const downloadVehiclesCSV = () => {
    if (vehicles.length === 0) return;
    const headers = [
      'Registration Number', 'Model', 'Type', 'Acquisition Cost', 
      'Odometer Km', 'Completed Trips', 'Total Distance (Km)', 
      'Revenue', 'Fuel Cost', 'Maintenance Cost', 'Toll Cost', 
      'Other Cost', 'Total OpEx', 'Net Profit', 'ROI (%)', 'Cost/Km'
    ];
    const rows = vehicles.map(v => [
      v.registrationNumber, v.model, v.type, v.acquisitionCost,
      v.odometerKm, v.tripCount, v.totalKm,
      v.revenue, v.fuelCost, v.maintenanceCost, v.tollCost,
      v.otherCost, v.totalOpex, v.profit, v.roiPct, v.costPerKm || 0
    ]);
    exportToCSV('TransitOps_Fleet_ROI_Performance_Report', headers, rows);
  };

  const downloadExpensesCSV = async () => {
    try {
      const data = await financeService.getExpenses();
      const headers = [
        'Logged Date', 'Vehicle Registration', 'Vehicle Model', 'Route', 
        'Category', 'Volume (Liters)', 'Cost (INR)', 'Anomaly Status'
      ];
      const rows = data.expenses.map(e => [
        new Date(e.loggedOn).toLocaleDateString(),
        e.vehicleReg,
        e.vehicleModel,
        e.tripRoute || 'Fleet General',
        e.category.toUpperCase(),
        e.liters || '',
        e.cost,
        e.anomalyFlag ? 'FLAGGED_ABNORMAL' : 'AUDITED_NORMAL'
      ]);
      exportToCSV('TransitOps_Full_Expense_Ledger', headers, rows);
    } catch (err) {
      alert('Failed to generate expense ledger: ' + err.message);
    }
  };

  const downloadAnomaliesCSV = () => {
    if (anomalies.length === 0) return;
    const headers = [
      'Logged Date', 'Vehicle Registration', 'Vehicle Model', 'Trip Route', 
      'Category', 'Volume (Liters)', 'Abnormal Cost (INR)'
    ];
    const rows = anomalies.map(e => [
      new Date(e.loggedOn).toLocaleDateString(),
      e.vehicleReg,
      e.vehicleModel,
      e.tripRoute || 'Fleet Standalone Log',
      e.category.toUpperCase(),
      e.liters || '',
      e.cost
    ]);
    exportToCSV('TransitOps_Abnormal_Spend_Audit_Report', headers, rows);
  };

  const exportToCSV = (filename, headers, rows) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(row => row.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }} className="no-print">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Reports & Intelligence Audit</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>Generate print-ready PDFs and download operational spreadsheets for auditing.</p>
        </div>
        <button 
          className="btn-export" 
          onClick={handlePrint}
          style={{ background: '#0b1f3a', color: '#ffffff', borderColor: '#0b1f3a' }}
        >
          <Printer size={16} /> Print / Export PDF
        </button>
      </div>

      {/* Main Download Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }} className="no-print">
        
        {/* Report Card 1 */}
        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', marginBottom: 16 }}>
              <TrendingUp size={22} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Fleet ROI Performance</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
              Comprehensive table showing acquisition costs, total odometer km, completed trips, accumulated revenue, and margins per vehicle.
            </p>
          </div>
          <button 
            className="btn-export" 
            onClick={downloadVehiclesCSV}
            style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}
          >
            <Download size={14} /> Download CSV Spreadsheet
          </button>
        </div>

        {/* Report Card 2 */}
        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', marginBottom: 16 }}>
              <Table size={22} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Full Expense Ledger</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
              Granular log of every single transaction (fuel purchases, transit tolls, repairs, other fees) with timestamp, driver logs, and values.
            </p>
          </div>
          <button 
            className="btn-export" 
            onClick={downloadExpensesCSV}
            style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}
          >
            <Download size={14} /> Download CSV Spreadsheet
          </button>
        </div>

        {/* Report Card 3 */}
        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '4px solid #ef4444' }}>
          <div>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: 16 }}>
              <AlertTriangle size={22} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#991b1b' }}>Spend Anomalies Audit</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
              Isolated list of flagged anomalous fuel logs and other high-cost out-of-bounds spend slips requiring investigation.
            </p>
          </div>
          <button 
            className="btn-export" 
            onClick={downloadAnomaliesCSV}
            style={{ width: '100%', justifyContent: 'center', marginTop: 20, borderColor: '#fca5a5', color: '#b91c1c', background: '#fff5f5' }}
            disabled={anomalies.length === 0}
          >
            <Download size={14} /> Download CSV Ledger
          </button>
        </div>

      </div>

      {/* Investigation Section (Print-friendly format) */}
      <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertOctagon size={20} color="#dc2626" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Audit Room: Fleet Anomalies Investigation Ledger
            </h2>
          </div>
          <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#b91c1c', fontWeight: 700, padding: '3px 10px', borderRadius: 12 }}>
            CONFIDENTIAL REPORT · {anomalies.length} PENDING AUDITS
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', flexDirection: 'column', gap: 12 }}>
            <div style={{
              width: 24, height: 24, border: '3px solid rgba(249, 115, 22, 0.2)',
              borderRadius: '50%', borderTopColor: '#f97316',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Refreshing audit room...</span>
          </div>
        ) : error ? (
          <div style={{ padding: '16px', color: '#991b1b', background: '#fee2e2', borderRadius: 8 }}>{error}</div>
        ) : anomalies.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <ShieldCheck size={18} />
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Perfect Audit Score: No spend anomalies detected in the ledger.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'none' }} className="print-only-title">
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: 10 }}>TransitOps Audit Report</h1>
              <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: 20 }}>Generated on: {new Date().toLocaleString()}</p>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table className="premium-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Date Logged</th>
                    <th>Vehicle Asset</th>
                    <th>Audit Details</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Anomalous Cost</th>
                    <th>Audit Status</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 500, color: '#475569' }}>
                        {new Date(e.loggedOn).toLocaleDateString()}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
                        {e.vehicleReg}
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>{e.vehicleModel}</span>
                      </td>
                      <td>
                        {e.tripRoute ? `Trip Route: ${e.tripRoute}` : 'Standalone Depot Log'}
                        {e.liters && ` (${e.liters} Liters)`}
                      </td>
                      <td>
                        <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700, color: '#7f1d1d', background: '#fee2e2', padding: '3px 8px', borderRadius: 4 }}>
                          {e.category}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: '#991b1b', textAlign: 'right' }}>
                        ₹{e.cost.toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className="anomaly-badge">PENDING INVESTIGATION</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Print helpers styling */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only-title {
            display: block !important;
          }
          .card-premium {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            background: #ffffff !important;
          }
          aside, header, nav, button {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
          }
          div[style*="marginLeft"] {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
