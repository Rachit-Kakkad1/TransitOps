/**
 * Trip API client service
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const tripService = {
  /**
   * Get all trips
   */
  getTrips: async () => {
    const response = await fetch(`${API_URL}/api/trips`, {
      headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch trips');
    return data.data;
  },

  /**
   * Create a new draft trip
   */
  createTrip: async (tripData) => {
    const response = await fetch(`${API_URL}/api/trips`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(tripData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create trip');
    return data.data;
  },

  /**
   * Update a draft trip
   */
  updateTrip: async (id, tripData) => {
    const response = await fetch(`${API_URL}/api/trips/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(tripData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to update trip');
    return data.data;
  },

  /**
   * Get recommendations for a trip
   */
  getRecommendations: async (id) => {
    const response = await fetch(`${API_URL}/api/trips/${id}/recommendations`, {
      headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to get recommendations');
    return data.data;
  },

  /**
   * Dispatch a trip
   */
  dispatchTrip: async (id, dispatchData = {}) => {
    const response = await fetch(`${API_URL}/api/trips/${id}/dispatch`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(dispatchData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to dispatch trip');
    return data.data;
  },

  /**
   * Complete a trip
   */
  completeTrip: async (id) => {
    const response = await fetch(`${API_URL}/api/trips/${id}/complete`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to complete trip');
    return data.data;
  },

  /**
   * Cancel a trip
   */
  cancelTrip: async (id) => {
    const response = await fetch(`${API_URL}/api/trips/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to cancel trip');
    return data.data;
  },

  /**
   * Get public shipment tracking details (no auth header needed)
   */
  getPublicTracking: async (token) => {
    const response = await fetch(`${API_URL}/api/public/track/${token}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch tracking details');
    return data.data;
  },

  /**
   * Get active trip positions for live map
   */
  getActivePositions: async () => {
    const response = await fetch(`${API_URL}/api/trips/positions`, {
      headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch active positions');
    return data.data;
  },

  /**
   * Log an expense (toll/fuel/other) for a trip
   */
  logExpense: async (tripId, expenseData) => {
    const response = await fetch(`${API_URL}/api/trips/${tripId}/expenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(expenseData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to log expense');
    return data.data;
  },
};
