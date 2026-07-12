import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/Login/LoginPage';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import AdminControlCenter from './pages/Admin/AdminControlCenter';

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
