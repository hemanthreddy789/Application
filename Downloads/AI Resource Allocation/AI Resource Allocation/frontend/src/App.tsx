import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layouts/Layout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Chat from './pages/Chat';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import WorkforceCenter from './pages/WorkforceCenter';
import Settings from './pages/Settings';
import Sprint from './pages/Sprint';

function App() {
  const isAuthenticated = sessionStorage.getItem('riq_auth') === '1';

  if (!isAuthenticated) return <Login />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="workforce" element={<WorkforceCenter />} />
          <Route path="employee-dashboard" element={<EmployeeDashboard />} />
          <Route path="chat" element={<Chat />} />
          <Route path="settings" element={<Settings />} />
          <Route path="sprint"   element={<Sprint />} />
          {/* Legacy redirects → Workforce Hub */}
          <Route path="employees"     element={<Navigate to="/workforce?tab=people"   replace />} />
          <Route path="heatmap"       element={<Navigate to="/workforce?tab=capacity"  replace />} />
          <Route path="leave-tracker" element={<Navigate to="/workforce?tab=leave"     replace />} />
          <Route path="forecast"      element={<Navigate to="/workforce?tab=strategy"  replace />} />
          <Route path="strategy"      element={<Navigate to="/workforce?tab=strategy"  replace />} />
          <Route path="ai-insights"   element={<Navigate to="/chat" replace />} />
          <Route path="analytics"     element={<Navigate to="/dashboard" replace />} />
          <Route path="policies"      element={<Navigate to="/chat" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
