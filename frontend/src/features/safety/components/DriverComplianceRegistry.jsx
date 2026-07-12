import React from 'react';
import { Search, User, Filter, SortAsc, ShieldAlert, Award, Ban, UserCheck } from 'lucide-react';
import { getSafetyScoreCategory, getRiskLevelMeta } from '../constants/safetyThresholds';

export default function DriverComplianceRegistry({
  drivers,
  loading,
  filters,
  onFilterChange,
  onReviewDriver
}) {
  const handleSearchChange = (e) => {
    onFilterChange('search', e.target.value);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return <UserCheck size={14} color="#16a34a" />;
      case 'on_trip': return <User size={14} color="#2563eb" />;
      case 'suspended': return <Ban size={14} color="#dc2626" />;
      default: return <User size={14} color="#64748b" />;
    }
  };

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }} className="driver-compliance-registry">
      <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Driver Compliance Registry</h2>
      </div>

      {/* Advanced Filter Bars */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
        gap: 12,
        alignItems: 'center'
      }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search name or license..."
            value={filters.search}
            onChange={handleSearchChange}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: '0.85rem',
              color: '#0f172a',
              outline: 'none'
            }}
          />
        </div>

        {/* Operational Status */}
        <select
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          style={{
            padding: 8,
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            fontSize: '0.85rem',
            color: '#334155',
            outline: 'none',
            background: '#fff'
          }}
        >
          <option value="">All Operational Statuses</option>
          <option value="available">Available</option>
          <option value="on_trip">On Trip</option>
          <option value="off_duty">Off Duty</option>
          <option value="suspended">Suspended</option>
        </select>

        {/* License State */}
        <select
          value={filters.licenseState}
          onChange={(e) => onFilterChange('licenseState', e.target.value)}
          style={{
            padding: 8,
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            fontSize: '0.85rem',
            color: '#334155',
            outline: 'none',
            background: '#fff'
          }}
        >
          <option value="">All License States</option>
          <option value="expired">Expired</option>
          <option value="expiring_7">Expiring within 7 days</option>
          <option value="expiring_30">Expiring within 30 days</option>
          <option value="valid">Valid beyond 30 days</option>
        </select>

        {/* Risk Level */}
        <select
          value={filters.riskLevel}
          onChange={(e) => onFilterChange('riskLevel', e.target.value)}
          style={{
            padding: 8,
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            fontSize: '0.85rem',
            color: '#334155',
            outline: 'none',
            background: '#fff'
          }}
        >
          <option value="">All Risk Levels</option>
          <option value="CRITICAL">Critical Risk</option>
          <option value="HIGH">High Risk</option>
          <option value="WARNING">Warning Risk</option>
          <option value="LOW">Low Risk</option>
        </select>

        {/* Sort By */}
        <select
          value={filters.sortBy}
          onChange={(e) => onFilterChange('sortBy', e.target.value)}
          style={{
            padding: 8,
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            fontSize: '0.85rem',
            color: '#334155',
            outline: 'none',
            background: '#fff'
          }}
        >
          <option value="">Sort By (Default)</option>
          <option value="risk_score_desc">Highest Risk First</option>
          <option value="risk_score_asc">Lowest Risk First</option>
          <option value="safety_score_desc">Safety Score: High to Low</option>
          <option value="safety_score_asc">Safety Score: Low to High</option>
          <option value="license_expiry_asc">License Expiry: Nearest First</option>
          <option value="license_expiry_desc">License Expiry: Latest First</option>
        </select>
      </div>

      {/* Grid Table */}
      <div style={{ overflowX: 'auto', marginTop: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: 12 }}>Driver</th>
              <th style={{ padding: 12 }}>Operational Status</th>
              <th style={{ padding: 12 }}>License & Expiry</th>
              <th style={{ padding: 12 }}>Safety Score</th>
              <th style={{ padding: 12 }}>Risk Level</th>
              <th style={{ padding: 12, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  <div className="skeleton-loader" style={{ height: 20, width: '100%', background: '#f1f5f9', borderRadius: 4 }}></div>
                </td>
              </tr>
            ) : drivers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  No matching driver records found.
                </td>
              </tr>
            ) : (
              drivers.map((driver) => {
                const scoreCategory = getSafetyScoreCategory(driver.safetyScore);
                const riskMeta = getRiskLevelMeta(driver.riskLevel);
                const now = new Date();
                const expiryDate = new Date(driver.licenseExpiry);
                const daysDiff = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

                return (
                  <tr key={driver.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem', verticalAlign: 'middle' }} className="registry-row">
                    {/* Driver details */}
                    <td style={{ padding: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{driver.fullName}</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>ID: {driver.id.substring(0, 8)}</span>
                      </div>
                    </td>

                    {/* Operational Status */}
                    <td style={{ padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {getStatusIcon(driver.status)}
                        <span style={{ fontWeight: 600, color: driver.status === 'suspended' ? '#dc2626' : '#334155', textTransform: 'capitalize' }}>
                          {driver.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>

                    {/* License Details */}
                    <td style={{ padding: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{driver.licenseNumber} ({driver.licenseCategory})</span>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: daysDiff < 0 ? '#dc2626' : daysDiff <= 7 ? '#ea580c' : daysDiff <= 30 ? '#ca8a04' : '#16a34a'
                        }}>
                          {daysDiff < 0 ? 'Expired' : `${daysDiff} days left`} ({expiryDate.toLocaleDateString()})
                        </span>
                      </div>
                    </td>

                    {/* Safety Score */}
                    <td style={{ padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontWeight: 800,
                          color: scoreCategory.color,
                          background: scoreCategory.bg,
                          padding: '2px 8px',
                          borderRadius: 4
                        }}>
                          {driver.safetyScore}%
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{scoreCategory.label}</span>
                      </div>
                    </td>

                    {/* Risk Level Badge */}
                    <td style={{ padding: 12 }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: riskMeta.color,
                        background: riskMeta.bg,
                        border: `1px solid ${riskMeta.border}`,
                        padding: '3px 8px',
                        borderRadius: 12,
                        letterSpacing: '0.02em'
                      }}>
                        {riskMeta.label} ({driver.riskScore})
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      <button
                        onClick={() => onReviewDriver(driver.id)}
                        style={{
                          background: '#fff',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          padding: '4px 12px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#0f172a'; }}
                        onMouseOut={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#cbd5e1'; }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
