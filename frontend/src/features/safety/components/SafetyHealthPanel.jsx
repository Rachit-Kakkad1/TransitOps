import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, AlertTriangle, FileCheck, TrendingUp, Activity } from 'lucide-react';

export default function SafetyHealthPanel({ kpis }) {
  const {
    averageSafetyScore = 100,
    totalDrivers = 0,
    licenseComplianceRate = 100,
    expiredLicenses = 0,
    driversRequiringAction = 0
  } = kpis || {};

  // Animate the gauge on mount
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedCompliance, setAnimatedCompliance] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(averageSafetyScore * ease * 10) / 10);
      setAnimatedCompliance(Math.round(licenseComplianceRate * ease * 10) / 10);
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [averageSafetyScore, licenseComplianceRate]);

  // Deterministic health classification
  let healthLabel = 'EXCELLENT';
  let healthColor = '#16a34a';
  let gradientStart = '#22c55e';
  let gradientEnd = '#15803d';
  let pulseColor = 'rgba(34, 197, 94, 0.15)';

  if (averageSafetyScore < 75) {
    healthLabel = 'CRITICAL RISK';
    healthColor = '#dc2626';
    gradientStart = '#ef4444';
    gradientEnd = '#b91c1c';
    pulseColor = 'rgba(239, 68, 68, 0.15)';
  } else if (averageSafetyScore < 85) {
    healthLabel = 'AT RISK';
    healthColor = '#ea580c';
    gradientStart = '#f97316';
    gradientEnd = '#c2410c';
    pulseColor = 'rgba(249, 115, 22, 0.15)';
  } else if (averageSafetyScore < 90) {
    healthLabel = 'GOOD';
    healthColor = '#ca8a04';
    gradientStart = '#eab308';
    gradientEnd = '#a16207';
    pulseColor = 'rgba(234, 179, 8, 0.15)';
  }

  const compliantCount = Math.max(0, totalDrivers - expiredLicenses - driversRequiringAction);

  // SVG Gauge calculations
  const gaugeRadius = 62;
  const gaugeStroke = 10;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const scorePercentage = animatedScore / 100;
  const arcLength = gaugeCircumference * 0.75; // 270 degrees
  const dashOffset = arcLength - (arcLength * scorePercentage);
  const gradientId = 'safetyGaugeGradient';
  const bgGradientId = 'safetyGaugeBg';
  const glowId = 'safetyGlow';

  // Compliance bar calculations
  const complianceBarWidth = 200;
  const complianceFill = (animatedCompliance / 100) * complianceBarWidth;

  return (
    <div className="safety-health-layout" style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: 28,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      minHeight: 260,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle background gradient orb */}
      <div style={{
        position: 'absolute',
        top: -40,
        right: -40,
        width: 180,
        height: 180,
        borderRadius: '50%',
        background: pulseColor,
        filter: 'blur(40px)',
        pointerEvents: 'none',
        transition: 'background 0.5s ease'
      }} />

      {/* === LEFT: Premium SVG Gauge === */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingRight: 24,
        borderRight: '1px solid #f1f5f9',
        position: 'relative'
      }}>
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          color: '#475569',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <Activity size={13} color={healthColor} />
          Fleet Safety Health
        </div>

        <div style={{ position: 'relative', width: 160, height: 160 }}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={gradientStart} />
                <stop offset="100%" stopColor={gradientEnd} />
              </linearGradient>
              <linearGradient id={bgGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f1f5f9" />
                <stop offset="100%" stopColor="#e2e8f0" />
              </linearGradient>
              <filter id={glowId}>
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background Arc (270 degrees) */}
            <circle
              cx="80"
              cy="80"
              r={gaugeRadius}
              fill="none"
              stroke={`url(#${bgGradientId})`}
              strokeWidth={gaugeStroke}
              strokeDasharray={`${arcLength} ${gaugeCircumference}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              transform="rotate(135 80 80)"
            />

            {/* Active Score Arc */}
            <circle
              cx="80"
              cy="80"
              r={gaugeRadius}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={gaugeStroke + 1}
              strokeDasharray={`${arcLength} ${gaugeCircumference}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(135 80 80)"
              filter={`url(#${glowId})`}
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />

            {/* Tick marks */}
            {[0, 25, 50, 75, 100].map((tick, i) => {
              const angle = 135 + (270 * tick / 100);
              const rad = (angle * Math.PI) / 180;
              const innerR = gaugeRadius - gaugeStroke - 4;
              const outerR = gaugeRadius - gaugeStroke - 9;
              return (
                <line
                  key={i}
                  x1={80 + innerR * Math.cos(rad)}
                  y1={80 + innerR * Math.sin(rad)}
                  x2={80 + outerR * Math.cos(rad)}
                  y2={80 + outerR * Math.sin(rad)}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* Center Score Value */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}>
            <span style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1,
              letterSpacing: '-0.02em'
            }}>
              {animatedScore.toFixed(1)}
            </span>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              out of 100
            </span>
          </div>
        </div>

        {/* Health Badge */}
        <div style={{
          marginTop: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 14px',
          borderRadius: 20,
          background: `linear-gradient(135deg, ${gradientStart}15, ${gradientEnd}15)`,
          border: `1px solid ${gradientStart}30`,
          transition: 'all 0.4s ease'
        }}>
          <div style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: healthColor,
            boxShadow: `0 0 6px ${healthColor}60`,
            animation: 'pulse-dot 2s infinite'
          }} />
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            color: healthColor,
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}>
            {healthLabel}
          </span>
        </div>

        <style>{`
          @keyframes pulse-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.3); }
          }
        `}</style>
      </div>

      {/* === RIGHT: Metrics Breakdown === */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
        {/* Compliance Bar */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '14px 16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: '#eff6ff', borderRadius: 6, padding: 6, color: '#2563eb', display: 'flex' }}>
                <FileCheck size={14} />
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em' }}>License Compliance</span>
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{animatedCompliance.toFixed(1)}%</span>
          </div>
          <div style={{
            width: '100%',
            height: 6,
            borderRadius: 4,
            background: '#e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              borderRadius: 4,
              background: `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`,
              width: `${animatedCompliance}%`,
              transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: `0 0 8px ${gradientStart}40`
            }} />
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="safety-grid-3col">
          {/* Total Drivers */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '12px 14px',
            transition: 'all 0.2s',
            cursor: 'default'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ background: '#f1f5f9', borderRadius: 6, padding: 5, color: '#475569', display: 'flex' }}>
                <Users size={13} />
              </div>
              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{totalDrivers}</div>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: 3 }}>active profiles</div>
          </div>

          {/* Compliant */}
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 10,
            padding: '12px 14px',
            transition: 'all 0.2s',
            cursor: 'default'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(34,197,94,0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ background: '#dcfce7', borderRadius: 6, padding: 5, color: '#16a34a', display: 'flex' }}>
                <ShieldCheck size={13} />
              </div>
              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Compliant</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d', lineHeight: 1 }}>{compliantCount}</div>
            <div style={{ fontSize: '0.62rem', color: '#4ade80', marginTop: 3 }}>fully valid</div>
          </div>

          {/* Critical Issues */}
          <div style={{
            background: driversRequiringAction > 0 ? '#fef2f2' : '#f8fafc',
            border: `1px solid ${driversRequiringAction > 0 ? '#fecaca' : '#e2e8f0'}`,
            borderRadius: 10,
            padding: '12px 14px',
            transition: 'all 0.2s',
            cursor: 'default',
            animation: driversRequiringAction > 0 ? 'subtle-attention 3s ease-in-out infinite' : 'none'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = driversRequiringAction > 0 ? '0 4px 12px rgba(239,68,68,0.12)' : '0 4px 12px rgba(0,0,0,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ background: driversRequiringAction > 0 ? '#fee2e2' : '#f1f5f9', borderRadius: 6, padding: 5, color: driversRequiringAction > 0 ? '#dc2626' : '#475569', display: 'flex' }}>
                <AlertTriangle size={13} />
              </div>
              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: driversRequiringAction > 0 ? '#dc2626' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Critical</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: driversRequiringAction > 0 ? '#b91c1c' : '#0f172a', lineHeight: 1 }}>{driversRequiringAction}</div>
            <div style={{ fontSize: '0.62rem', color: driversRequiringAction > 0 ? '#f87171' : '#94a3b8', marginTop: 3 }}>require action</div>
          </div>
        </div>

        {/* Expired licenses inline alert */}
        {expiredLicenses > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderRadius: 8,
            background: 'linear-gradient(90deg, #fef2f2, #fff1f2)',
            border: '1px solid #fecaca',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#b91c1c'
          }}>
            <AlertTriangle size={13} />
            {expiredLicenses} driver{expiredLicenses > 1 ? 's' : ''} with expired license{expiredLicenses > 1 ? 's' : ''} — immediate review required
          </div>
        )}
      </div>

      <style>{`
        @keyframes subtle-attention {
          0%, 100% { box-shadow: none; }
          50% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.08); }
        }
      `}</style>
    </div>
  );
}
