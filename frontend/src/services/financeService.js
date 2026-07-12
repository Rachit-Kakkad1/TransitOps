/**
 * Finance API Client Service
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const financeService = {
  /**
   * Get fleet-level financial KPIs and category breakdown
   */
  getOverview: async () => {
    const response = await fetch(`${API_URL}/api/finance/overview`, {
      headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch financial overview');
    return data.data;
  },

  /**
   * Get vehicle profitability and ROI analysis
   */
  getVehicles: async () => {
    const response = await fetch(`${API_URL}/api/finance/vehicles`, {
      headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch vehicle ROI data');
    return data.data;
  },

  /**
   * Get filtered expense drilldown
   * @param {object} filters { category, vehicleId, startDate, endDate }
   */
  getExpenses: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.vehicleId) params.append('vehicleId', filters.vehicleId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_URL}/api/finance/expenses${queryString}`, {
      headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch expense drilldown');
    return data.data;
  },

  /**
   * Get monthly trends for the past year
   */
  getTrends: async () => {
    const response = await fetch(`${API_URL}/api/finance/trends`, {
      headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch monthly trends');
    return data.data;
  },

  /**
   * Get flagged expense anomalies
   */
  getAnomalies: async () => {
    const response = await fetch(`${API_URL}/api/finance/anomalies`, {
      headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch expense anomaly report');
    return data.data;
  },
};
