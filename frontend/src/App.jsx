import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/Login/LoginPage';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard/Dashboard';

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
