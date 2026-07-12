import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Users, Truck, RefreshCw, AlertOctagon } from 'lucide-react';

// Import modular child components
import SafetyHealthPanel from '../../features/safety/components/SafetyHealthPanel';
import ImmediateActionCenter from '../../features/safety/components/ImmediateActionCenter';
import DriverComplianceRegistry from '../../features/safety/components/DriverComplianceRegistry';
import DriverRiskDrawer from '../../features/safety/components/DriverRiskDrawer';
import TripSafetyEngine from '../../features/safety/components/TripSafetyEngine';
import LicenseComplianceTimeline from '../../features/safety/components/LicenseComplianceTimeline';
import OperationalRiskPanel from '../../features/safety/components/OperationalRiskPanel';
import RouteIntelligenceDrawer from '../../features/safety/components/RouteIntelligenceDrawer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function SafetyOfficerDashboard({ kpis, distribution, alertingDrivers, onRefresh, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  // Drivers compliance registry states
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    licenseState: '',
    riskLevel: '',
    sortBy: ''
  });
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Trip safety checks states
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [selectedRouteTrip, setSelectedRouteTrip] = useState(null);
  const [isRouteDrawerOpen, setIsRouteDrawerOpen] = useState(false);

  // Status banner notifications
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const token = localStorage.getItem('token');

  const showFeedback = (text, type = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 5000);
  };

  // Fetch drivers list based on active filters
  const fetchDrivers = async () => {
    setLoadingDrivers(true);
    try {
      const queryParams = new URLSearchParams({
        search: filters.search,
        status: filters.status,
        licenseState: filters.licenseState,
        riskLevel: filters.riskLevel,
        sortBy: filters.sortBy
      }).toString();

      const response = await fetch(`${API_URL}/api/safety/drivers?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const res = await response.json();
      if (response.ok) {
        setDrivers(res.data);
        
        // If a driver is currently selected in the side drawer, update their details dynamically
        if (selectedDriver) {
          const updated = res.data.find(d => d.id === selectedDriver.id);
          if (updated) {
            setSelectedDriver(updated);
          }
        }
      } else {
        showFeedback(res.message || 'Failed to load drivers database.', 'error');
      }
    } catch (err) {
      showFeedback('Network error retrieving compliance registry.', 'error');
    } finally {
      setLoadingDrivers(false);
    }
  };

  // Fetch trip checks list
  const fetchTripsEligibility = async () => {
    setLoadingTrips(true);
    try {
      const response = await fetch(`${API_URL}/api/safety/trips/eligibility`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const res = await response.json();
      if (response.ok) {
        setTrips(res.data);
      } else {
        showFeedback(res.message || 'Failed to load trip eligibility checklists.', 'error');
      }
    } catch (err) {
      showFeedback('Network error fetching trip checkpoints.', 'error');
    } finally {
      setLoadingTrips(false);
    }
  };

  // Trigger suspension status mutate action
  const handleToggleStatus = async (driverId, targetStatus, reason) => {
    try {
      const response = await fetch(`${API_URL}/api/safety/drivers/${driverId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus, reason })
      });
      
      const res = await response.json();
      
      if (response.ok) {
        showFeedback(`Successfully updated driver status to ${targetStatus.toUpperCase()}.`, 'success');
        fetchDrivers();
        if (onRefresh) onRefresh();
      } else {
        // Bubble validation details up to the drawer component
        throw res;
      }
    } catch (err) {
      // Re-throw to allow component-level catch block to render validation failures
      throw err;
    }
  };

  // Open driver details drawer
  const handleReviewDriver = (driverId) => {
    // Find driver inside current loaded set, or fetch if not present
    const driverObj = drivers.find(d => d.id === driverId);
    if (driverObj) {
      setSelectedDriver(driverObj);
      setIsDrawerOpen(true);
    } else {
      // Fallback: fetch registry and open
      setFilters(prev => ({ ...prev, search: '' }));
      fetchDrivers().then(() => {
        const dObj = drivers.find(d => d.id === driverId);
        if (dObj) {
          setSelectedDriver(dObj);
          setIsDrawerOpen(true);
        }
      });
    }
  };

  // Synchronize dynamic filters
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Load registry list whenever filters modify
  useEffect(() => {
    fetchDrivers();
  }, [filters]);

  // Load contextual active tab lists
  useEffect(() => {
    if (activeTab === 'drivers') {
      fetchDrivers();
    } else if (activeTab === 'trips') {
      fetchTripsEligibility();
    }
  }, [activeTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>Safety & Compliance Command Center</h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
            Real-time compliance monitoring, explainable risk intelligence models, and trip safety evaluations.
          </p>
        </div>
        <button 
          onClick={() => {
            if (onRefresh) onRefresh();
            fetchDrivers();
            fetchTripsEligibility();
            showFeedback('Command center workspace synchronized.', 'success');
          }}
          className="submit-button"
          style={{ width: 'auto', height: '36px', padding: '0 16px', borderRadius: '6px' }}
        >
          <RefreshCw size={14} style={{ marginRight: 6 }} />
          <span style={{ fontSize: '0.8rem' }}>Sync Command Center</span>
        </button>
      </div>

      {/* Dynamic Alert Banner */}
      {statusMsg.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          fontSize: '0.8rem',
          fontWeight: 700,
          background: statusMsg.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color: statusMsg.type === 'error' ? '#991b1b' : '#16a34a',
          border: `1px solid ${statusMsg.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <AlertOctagon size={16} />
          {statusMsg.text}
        </div>
      )}



      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Top Panel: Dominant Safety Health Card & Compliance timeline */}
          <div className="safety-grid-2col">
            <SafetyHealthPanel kpis={kpis} />
            <LicenseComplianceTimeline drivers={drivers} onReviewDriver={handleReviewDriver} />
          </div>

          {/* Bottom Panel: Immediate action warning feed & urgency-severity matrix */}
          <div className="safety-grid-2col">
            <ImmediateActionCenter alerts={alertingDrivers} onReviewDriver={handleReviewDriver} />
            <OperationalRiskPanel drivers={drivers} trips={trips} onReviewDriver={handleReviewDriver} />
          </div>
        </div>
      )}

      {/* TAB 2: COMPLIANCE REGISTRY GRID */}
      {activeTab === 'drivers' && (
        <DriverComplianceRegistry
          drivers={drivers}
          loading={loadingDrivers}
          filters={filters}
          onFilterChange={handleFilterChange}
          onReviewDriver={handleReviewDriver}
        />
      )}

      {/* TAB 3: TRIP SAFETY ENGINE LIST */}
      {activeTab === 'trips' && (
        <TripSafetyEngine
          trips={trips}
          loading={loadingTrips}
          onViewRoute={(trip) => {
            setSelectedRouteTrip(trip);
            setIsRouteDrawerOpen(true);
          }}
        />
      )}

      {/* PREMIUM DETAILS DRAWER SLIDER */}
      <DriverRiskDrawer
        driver={selectedDriver}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedDriver(null);
        }}
        onToggleStatus={handleToggleStatus}
      />

      {/* ROUTE INTELLIGENCE DRAWER */}
      <RouteIntelligenceDrawer
        trip={selectedRouteTrip}
        isOpen={isRouteDrawerOpen}
        onClose={() => {
          setIsRouteDrawerOpen(false);
          setSelectedRouteTrip(null);
        }}
      />
    </div>
  );
}
