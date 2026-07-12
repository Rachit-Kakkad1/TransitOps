import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Search, Filter, Download, ArrowUpDown, 
  TrendingUp, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp 
} from 'lucide-react';
import { financeService } from '../../services/financeService';

export default function VehicleProfitabilityPage() {
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortField, setSortField] = useState('roiPct');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    async function loadVehicles() {
      setLoading(true);
      setError('');
      try {
        const data = await financeService.getVehicles();
        setVehicles(data);
        setFilteredVehicles(data);
      } catch (err) {
        setError(err.message || 'Failed to load vehicle ROI analysis.');
      } finally {
        setLoading(false);
      }
    }
    loadVehicles();
  }, []);

  // Filter and search
  useEffect(() => {
    let result = [...vehicles];

    if (search.trim() !== '') {
      const q = search.toLowerCase();
      result = result.filter(v => 
        v.registrationNumber.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== 'All') {
      result = result.filter(v => v.type === typeFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle nulls
      if (aVal === null || aVal === undefined) return sortOrder === 'desc' ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortOrder === 'desc' ? -1 : 1;

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      } else {
        return sortOrder === 'asc' 
          ? aVal - bVal 
          : bVal - aVal;
      }
    });

    setFilteredVehicles(result);
  }, [search, typeFilter, sortField, sortOrder, vehicles]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default to descending
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleCSVExport = () => {
    if (filteredVehicles.length === 0) return;

    const headers = [
      'Registration Number', 'Model', 'Type', 'Acquisition Cost (INR)', 
      'Total Km Run', 'Trips Completed', 'Revenue (INR)', 'Fuel Cost (INR)', 
      'Maintenance Cost (INR)', 'Toll Cost (INR)', 'Other Cost (INR)', 
      'Total OpEx (INR)', 'Net Profit (INR)', 'ROI (%)', 'Cost Per KM (INR)', 'Anomalies'
    ];

    const rows = filteredVehicles.map(v => [
      v.registrationNumber, v.model, v.type, v.acquisitionCost,
      v.totalKm, v.tripCount, v.revenue, v.fuelCost,
      v.maintenanceCost, v.tollCost, v.otherCost,
      v.totalOpex, v.profit, v.roiPct, v.costPerKm || 0, v.anomalyCount
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TransitOps_Vehicle_Profitability_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get distinct types for dropdown
  const vehicleTypes = ['All', ...new Set(vehicles.map(v => v.type))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Title block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Fleet ROI & Vehicle Profitability</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>Compare asset acquisition costs, operational expenditures, and revenue margins.</p>
        </div>
        <button className="btn-export" onClick={handleCSVExport} disabled={filteredVehicles.length === 0}>
          <Download size={16} /> Export CSV Report
        </button>
      </div>

      {/* Filter strip */}
      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search by reg number, model..."
            className="filter-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 38 }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} color="#64748b" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Type:</span>
          <select 
            className="filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ minWidth: 120 }}
          >
            {vehicleTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: 'auto', fontWeight: 500 }}>
          Showing {filteredVehicles.length} of {vehicles.length} assets
        </div>
      </div>

      {/* Main Analysis table */}
      <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', flexDirection: 'column', gap: 12 }}>
            <div style={{
              width: 32, height: 32, border: '3px solid rgba(249, 115, 22, 0.2)',
              borderRadius: '50%', borderTopColor: '#f97316',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Analyzing fleet metrics...</span>
          </div>
        ) : error ? (
          <div style={{ padding: '24px', color: '#991b1b', background: '#fee2e2', textAlign: 'center' }}>
            {error}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            No vehicles match the selected filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="premium-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th onClick={() => handleSort('registrationNumber')} style={{ cursor: 'pointer' }}>
                    Vehicle <ArrowUpDown size={12} style={{ marginLeft: 4, display: 'inline' }} />
                  </th>
                  <th onClick={() => handleSort('acquisitionCost')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                    Capital Cost <ArrowUpDown size={12} style={{ marginLeft: 4, display: 'inline' }} />
                  </th>
                  <th onClick={() => handleSort('revenue')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                    Revenue <ArrowUpDown size={12} style={{ marginLeft: 4, display: 'inline' }} />
                  </th>
                  <th onClick={() => handleSort('totalOpex')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                    Total OpEx <ArrowUpDown size={12} style={{ marginLeft: 4, display: 'inline' }} />
                  </th>
                  <th onClick={() => handleSort('profit')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                    Net Profit <ArrowUpDown size={12} style={{ marginLeft: 4, display: 'inline' }} />
                  </th>
                  <th onClick={() => handleSort('roiPct')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    ROI (%) <ArrowUpDown size={12} style={{ marginLeft: 4, display: 'inline' }} />
                  </th>
                  <th onClick={() => handleSort('costPerKm')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                    Cost/KM <ArrowUpDown size={12} style={{ marginLeft: 4, display: 'inline' }} />
                  </th>
                  <th style={{ textAlign: 'center' }}>Trips</th>
                  <th style={{ textAlign: 'center' }}>Alerts</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map(v => {
                  const isExpanded = expandedId === v.id;
                  const isRoiPos = v.roiPct >= 0;

                  return (
                    <React.Fragment key={v.id}>
                      <tr 
                        style={{ cursor: 'pointer', background: isExpanded ? '#f8fafc' : 'transparent' }}
                        onClick={() => toggleExpand(v.id)}
                      >
                        <td style={{ textAlign: 'center', padding: '14px 4px' }}>
                          {isExpanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                        </td>
                        <td style={{ fontWeight: 700, color: '#0b1f3a' }}>
                          {v.registrationNumber}
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                            {v.model} · {v.type}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>₹{v.acquisitionCost.toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>₹{v.revenue.toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right' }}>₹{v.totalOpex.toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right' }} className={v.profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                          ₹{v.profit.toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            fontWeight: 800, fontSize: '0.75rem', padding: '4px 10px', borderRadius: 8,
                            background: isRoiPos ? '#dcfce7' : '#fee2e2',
                            color: isRoiPos ? '#15803d' : '#b91c1c'
                          }}>
                            {isRoiPos ? `+${v.roiPct}%` : `${v.roiPct}%`}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {v.costPerKm !== null ? `₹${v.costPerKm}` : '—'}
                        </td>
                        <td style={{ textAlign: 'center', color: '#475569', fontWeight: 600 }}>{v.tripCount}</td>
                        <td style={{ textAlign: 'center' }}>
                          {v.anomalyCount > 0 ? (
                            <span style={{ color: '#ef4444', background: '#fee2e2', padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 }}>
                              {v.anomalyCount} Flagged
                            </span>
                          ) : (
                            <ShieldCheck size={16} color="#10b981" style={{ display: 'inline' }} />
                          )}
                        </td>
                      </tr>

                      {/* Expanded Section */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                              
                              {/* Cost breakdown progress bars */}
                              <div>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.8rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>Cost Allocation</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  
                                  {/* Fuel */}
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', marginBottom: 2 }}>
                                      <span>Fuel Costs</span>
                                      <span style={{ fontWeight: 700 }}>₹{v.fuelCost.toLocaleString('en-IN')} ({v.totalOpex > 0 ? ((v.fuelCost / v.totalOpex) * 100).toFixed(0) : 0}%)</span>
                                    </div>
                                    <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                      <div style={{ width: `${v.totalOpex > 0 ? (v.fuelCost / v.totalOpex) * 100 : 0}%`, height: '100%', background: '#f59e0b' }} />
                                    </div>
                                  </div>

                                  {/* Maintenance */}
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', marginBottom: 2 }}>
                                      <span>Maintenance</span>
                                      <span style={{ fontWeight: 700 }}>₹{v.maintenanceCost.toLocaleString('en-IN')} ({v.totalOpex > 0 ? ((v.maintenanceCost / v.totalOpex) * 100).toFixed(0) : 0}%)</span>
                                    </div>
                                    <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                      <div style={{ width: `${v.totalOpex > 0 ? (v.maintenanceCost / v.totalOpex) * 100 : 0}%`, height: '100%', background: '#ef4444' }} />
                                    </div>
                                  </div>

                                  {/* Toll */}
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', marginBottom: 2 }}>
                                      <span>Toll & Transit Fees</span>
                                      <span style={{ fontWeight: 700 }}>₹{v.tollCost.toLocaleString('en-IN')} ({v.totalOpex > 0 ? ((v.tollCost / v.totalOpex) * 100).toFixed(0) : 0}%)</span>
                                    </div>
                                    <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                      <div style={{ width: `${v.totalOpex > 0 ? (v.tollCost / v.totalOpex) * 100 : 0}%`, height: '100%', background: '#3b82f6' }} />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Asset Utilization metrics */}
                              <div>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.8rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>Asset Utilization</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                  <div style={{ background: '#ffffff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                    <span style={{ display: 'block', fontSize: '0.675rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Odometer Km</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{v.odometerKm.toLocaleString()} km</span>
                                  </div>
                                  <div style={{ background: '#ffffff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                    <span style={{ display: 'block', fontSize: '0.675rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Trip Kms Run</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{v.totalKm.toLocaleString()} km</span>
                                  </div>
                                  <div style={{ background: '#ffffff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                    <span style={{ display: 'block', fontSize: '0.675rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Baseline Cost/km</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#475569' }}>
                                      {v.costPerKmBaseline ? `₹${v.costPerKmBaseline}` : 'N/A'}
                                    </span>
                                  </div>
                                  <div style={{ background: '#ffffff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                    <span style={{ display: 'block', fontSize: '0.675rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Variance vs Target</span>
                                    {v.costPerKm && v.costPerKmBaseline ? (
                                      <span style={{
                                        fontSize: '1rem', fontWeight: 800,
                                        color: v.costPerKm <= v.costPerKmBaseline ? '#166534' : '#ef4444'
                                      }}>
                                        {(((v.costPerKm - v.costPerKmBaseline) / v.costPerKmBaseline) * 100).toFixed(1)}%
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '1rem', fontWeight: 800, color: '#64748b' }}>N/A</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Alert Summary box */}
                              <div style={{ background: v.anomalyCount > 0 ? '#fef2f2' : '#f0fdf4', padding: 16, borderRadius: 10, border: `1px solid ${v.anomalyCount > 0 ? '#fca5a5' : '#bbf7d0'}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: v.anomalyCount > 0 ? '#991b1b' : '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {v.anomalyCount > 0 ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}
                                  {v.anomalyCount > 0 ? 'Urgent Investigation Required' : 'Asset Status: Health Normal'}
                                </h4>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: v.anomalyCount > 0 ? '#7f1d1d' : '#166534', lineHeight: 1.4 }}>
                                  {v.anomalyCount > 0 
                                    ? `This asset logged ${v.anomalyCount} abnormal spend events that exceed target margins. High probability of fuel leakage, siphoning, or pricing fraud.`
                                    : 'All logged expenditures for this vehicle fall within predefined tolerance levels. Performance parameters are stable.'
                                  }
                                </p>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
