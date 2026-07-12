export const THRESHOLDS = {
  CRITICAL: 60,
  HARD_ELIGIBILITY: 75,
  GOOD: 80,
  EXCELLENT: 90
};

export const getSafetyScoreCategory = (score) => {
  if (score >= THRESHOLDS.EXCELLENT) return { label: 'EXCELLENT', color: '#16a34a', bg: '#f0fdf4' };
  if (score >= THRESHOLDS.GOOD) return { label: 'GOOD', color: '#ca8a04', bg: '#fef9c3' };
  if (score >= THRESHOLDS.HARD_ELIGIBILITY) return { label: 'AT RISK', color: '#ea580c', bg: '#fff7ed' };
  return { label: 'CRITICAL', color: '#dc2626', bg: '#fef2f2' };
};

export const getRiskLevelMeta = (level) => {
  switch (level) {
    case 'CRITICAL': return { label: 'CRITICAL', color: '#dc2626', bg: '#fef2f2', border: '#fee2e2' };
    case 'HIGH': return { label: 'HIGH', color: '#ea580c', bg: '#fff7ed', border: '#ffedd5' };
    case 'WARNING': return { label: 'WARNING', color: '#ca8a04', bg: '#fef9c3', border: '#fef08a' };
    default: return { label: 'LOW RISK', color: '#16a34a', bg: '#f0fdf4', border: '#dcfce7' };
  }
};
