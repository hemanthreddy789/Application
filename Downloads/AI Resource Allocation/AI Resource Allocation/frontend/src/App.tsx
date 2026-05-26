import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layouts/Layout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Tasks from './pages/Tasks';
import Heatmap from './pages/Heatmap';
import Chat from './pages/Chat';
import AIInsights from './pages/AIInsights';
import Login from './pages/Login';
import Forecast from './pages/Forecast';
import EmployeeDashboard from './pages/EmployeeDashboard';
import StrategyHub from './pages/StrategyHub';

function App() {
  const isAuthenticated = true; // Mock

  if (!isAuthenticated) return <Login />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="heatmap" element={<Heatmap />} />
          <Route path="forecast" element={<Forecast />} />
          <Route path="strategy" element={<StrategyHub />} />
          <Route path="employee-dashboard" element={<EmployeeDashboard />} />
          <Route path="chat" element={<Chat />} />
          <Route path="ai-insights" element={<AIInsights />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
