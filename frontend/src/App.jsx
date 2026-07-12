import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/Login/LoginPage';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import AdminControlCenter from './pages/Admin/AdminControlCenter';

// Finance Pages
import VehicleProfitabilityPage from './pages/Finance/VehicleProfitabilityPage';
import ExpenseIntelligencePage from './pages/Finance/ExpenseIntelligencePage';
import FinancialReportsPage from './pages/Finance/FinancialReportsPage';

function RoleProtectedRoute({ allowedRoles, children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Guest Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Dashboard Routes */}
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Financial Analyst / Fleet Manager Routes */}
        <Route path="/fleet-roi" element={
          <RoleProtectedRoute allowedRoles={['FINANCIAL_ANALYST', 'FLEET_MANAGER']}>
            <VehicleProfitabilityPage />
          </RoleProtectedRoute>
        } />
        
        <Route path="/expenses" element={
          <RoleProtectedRoute allowedRoles={['FINANCIAL_ANALYST', 'FLEET_MANAGER']}>
            <ExpenseIntelligencePage />
          </RoleProtectedRoute>
        } />
        
        <Route path="/reports" element={
          <RoleProtectedRoute allowedRoles={['FINANCIAL_ANALYST', 'FLEET_MANAGER']}>
            <FinancialReportsPage />
          </RoleProtectedRoute>
        } />

        {/* Fallback to dashboard for other sub-routes in shell */}
        <Route path="/vehicles" element={<Navigate to="/dashboard" replace />} />
        <Route path="/trips" element={<Navigate to="/dashboard" replace />} />
        <Route path="/maintenance" element={<Navigate to="/dashboard" replace />} />
        <Route path="/drivers" element={<Navigate to="/dashboard" replace />} />
        <Route path="/analytics" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {/* Wildcard fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Guest Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Dashboard Routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
            <Route path="/admin/users" element={<AdminControlCenter tab="users" hideTabs={true} />} />
            <Route path="/admin/permissions" element={<AdminControlCenter tab="permissions" hideTabs={true} />} />
            <Route path="/admin/audit" element={<AdminControlCenter tab="audit" hideTabs={true} />} />
            <Route path="/admin/security" element={<AdminControlCenter tab="security" hideTabs={true} />} />
            <Route path="/admin/settings" element={<AdminControlCenter tab="settings" hideTabs={true} />} />
            {/* Fallback to dashboard for other sub-routes in shell */}
            <Route path="/vehicles" element={<Navigate to="/dashboard" replace />} />
            <Route path="/trips" element={<Dashboard />} />
            <Route path="/maintenance" element={<Navigate to="/dashboard" replace />} />
            <Route path="/drivers" element={<Dashboard />} />
            <Route path="/analytics" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          {/* Wildcard fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
