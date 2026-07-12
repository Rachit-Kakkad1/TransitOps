import React, { useState } from 'react';
import { AlertCircle, ShieldAlert, CheckCircle, Info } from 'lucide-react';

export default function OperationalRiskPanel({ drivers, trips, onReviewDriver }) {
  const [selectedCell, setSelectedCell] = useState(null);

  // Map drivers/trips to risk matrix coordinates
  // Urgency: Immediate, High, Routine
  // Severity: Critical, High, Moderate, Low
  const now = new Date();
  
  const cells = {
    'Critical-Immediate': [],
    'Critical-High': [],
    'Critical-Routine': [],
    'High-Immediate': [],
    'High-High': [],
    'High-Routine': [],
    'Moderate-Immediate': [],
    'Moderate-High': [],
    'Moderate-Routine': [],
    'Low-Immediate': [],
    'Low-High': [],
    'Low-Routine': []
  };

  // Evaluate Drivers
  drivers.forEach(d => {
    const expiry = new Date(d.licenseExpiry);
    const daysDiff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    const score = parseFloat(d.safetyScore);

    // Expired license available/on_trip
    if (daysDiff < 0) {
      if (d.status === 'available' || d.status === 'on_trip') {
        cells['Critical-Immediate'].push({
          type: 'Driver License Expired',
          name: d.fullName,
          evidence: `License expired ${Math.abs(daysDiff)} days ago. Operational status: ${d.status.toUpperCase()}.`,
          id: d.id,
          entityType: 'driver'
        });
      } else {
        cells['Critical-High'].push({
          type: 'Driver License Expired',
          name: d.fullName,
          evidence: `License expired ${Math.abs(daysDiff)} days ago. Current status: ${d.status.toUpperCase()}.`,
          id: d.id,
          entityType: 'driver'
        });
      }
    }

    // Safety Score < 60
    if (score < 60) {
      if (d.status === 'on_trip') {
        cells['Critical-Immediate'].push({
          type: 'Critical Safety Score',
          name: d.fullName,
          evidence: `Safety score of ${score}% is below critical limit, driver currently on active trip.`,
          id: d.id,
          entityType: 'driver'
        });
      } else {
        cells['Critical-High'].push({
          type: 'Critical Safety Score',
          name: d.fullName,
          evidence: `Safety score of ${score}% is below critical limit. Current status: ${d.status.toUpperCase()}.`,
          id: d.id,
          entityType: 'driver'
        });
      }
    } else if (score < 75) {
      // Safety Score 60-74
      cells['High-High'].push({
        type: 'Low Safety Score',
        name: d.fullName,
        evidence: `Safety score of ${score}% falls below eligibility requirement (75%).`,
        id: d.id,
        entityType: 'driver'
      });
    }
  });

  // Evaluate Trips
  trips.forEach(t => {
    if (!t.eligible) {
      // Check overloading
      const overloadingCheck = t.checks.find(c => c.code === 'VEHICLE_CAPACITY_OK' && !c.passed);
      if (overloadingCheck) {
        cells['High-Immediate'].push({
          type: 'Overloaded Vehicle Dispatch',
          name: `${t.source} → ${t.destination}`,
          evidence: overloadingCheck.message,
          id: t.id,
          entityType: 'trip'
        });
      }

      // Check maintenance
      const maintenanceCheck = t.checks.find(c => c.code === 'VEHICLE_STATUS_ACTIVE' && !c.passed);
      if (maintenanceCheck) {
        cells['High-Immediate'].push({
          type: 'Vehicle In Shop Dispatch',
          name: `${t.source} → ${t.destination}`,
          evidence: maintenanceCheck.message,
          id: t.id,
          entityType: 'trip'
        });
      }
    }
  });

  const matrixGrid = [
    { severity: 'Critical', urgency: 'Immediate', bg: '#fecaca', border: '#f87171', color: '#991b1b' },
    { severity: 'Critical', urgency: 'High', bg: '#fee2e2', border: '#fca5a5', color: '#991b1b' },
    { severity: 'Critical', urgency: 'Routine', bg: '#fef2f2', border: '#fecaca', color: '#991b1b' },
    { severity: 'High', urgency: 'Immediate', bg: '#ffedd5', border: '#fdba74', color: '#9a3412' },
    { severity: 'High', urgency: 'High', bg: '#ffedd5', border: '#fdba74', color: '#9a3412' },
    { severity: 'High', urgency: 'Routine', bg: '#fff7ed', border: '#ffedd5', color: '#9a3412' },
    { severity: 'Moderate', urgency: 'Immediate', bg: '#fef9c3', border: '#fde047', color: '#854d0e' },
    { severity: 'Moderate', urgency: 'High', bg: '#fef9c3', border: '#fde047', color: '#854d0e' },
    { severity: 'Moderate', urgency: 'Routine', bg: '#fefcf0', border: '#fef08a', color: '#854d0e' },
    { severity: 'Low', urgency: 'Immediate', bg: '#dcfce7', border: '#86efac', color: '#166534' },
    { severity: 'Low', urgency: 'High', bg: '#dcfce7', border: '#86efac', color: '#166534' },
    { severity: 'Low', urgency: 'Routine', bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' }
  ];

  const handleCellClick = (cellName) => {
    setSelectedCell(selectedCell === cellName ? null : cellName);
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
    }} className="operational-risk-panel">
      <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Operational Risk Matrix</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
        {/* Severity Labels Column */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '36px 0 12px 0', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textAlign: 'right', paddingRight: 8 }}>
          <div>Critical</div>
          <div>High</div>
          <div>Moderate</div>
          <div>Low</div>
        </div>

        {/* Matrix Grid Box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Urgency Labels Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#475569', paddingBottom: 4 }}>
            <div>Immediate</div>
            <div>High</div>
            <div>Routine</div>
          </div>

          {/* Matrix Squares (4 rows x 3 columns) */}
          <div style={{
            display: 'grid',
            gridTemplateRows: 'repeat(4, 70px)',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8
          }}>
            {['Critical', 'High', 'Moderate', 'Low'].map((sev) => (
              ['Immediate', 'High', 'Routine'].map((urg) => {
                const cellName = `${sev}-${urg}`;
                const items = cells[cellName] || [];
                const count = items.length;
                const cellMeta = matrixGrid.find(m => m.severity === sev && m.urgency === urg);
                const isSelected = selectedCell === cellName;

                return (
                  <button
                    key={cellName}
                    disabled={count === 0}
                    onClick={() => handleCellClick(cellName)}
                    style={{
                      background: count > 0 ? cellMeta.bg : '#f8fafc',
                      border: count > 0 
                        ? `2px solid ${isSelected ? '#0f172a' : cellMeta.border}` 
                        : '1px solid #e2e8f0',
                      borderRadius: 6,
                      cursor: count > 0 ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      transition: 'all 0.2s',
                      opacity: count > 0 ? 1 : 0.4
                    }}
                    className={`matrix-cell ${count > 0 ? 'active' : ''}`}
                  >
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: count > 0 ? cellMeta.color : '#cbd5e1' }}>
                      {count}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: count > 0 ? cellMeta.color : '#cbd5e1', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>
                      {urg}
                    </span>
                  </button>
                );
              })
            ))}
          </div>
        </div>
      </div>

      {/* Selected Cell Evidence Details */}
      {selectedCell && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 16,
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
              Selected Cell Evidence: {selectedCell.replace('-', ' × ')}
            </span>
            <button
              onClick={() => setSelectedCell(null)}
              style={{ background: 'none', border: 'none', fontSize: '0.75rem', cursor: 'pointer', color: '#64748b' }}
            >
              Close
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cells[selectedCell].map((item, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#fff',
                padding: 12,
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: '0.75rem'
              }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#0f172a', display: 'block' }}>{item.type}: {item.name}</span>
                  <span style={{ color: '#475569', display: 'block', marginTop: 2 }}>{item.evidence}</span>
                </div>
                {item.entityType === 'driver' && (
                  <button
                    onClick={() => onReviewDriver(item.id)}
                    style={{
                      background: '#0f172a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '4px 10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.7rem'
                    }}
                  >
                    Review
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
