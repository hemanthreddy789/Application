import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CheckSquare, TrendingUp, MessageSquare, Brain, User, Zap, Sparkles } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', desc: 'Team overview' },
  { to: '/employees', icon: Users, label: 'Employees', desc: 'Profiles & workload' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks & Projects', desc: 'Assign & track' },
  { to: '/heatmap', icon: TrendingUp, label: 'Heatmap', desc: 'Capacity heatmap' },
  { to: '/forecast', icon: Brain, label: 'AI Forecast', desc: 'Predict availability' },
  { to: '/strategy', icon: Zap, label: 'Strategy Hub', desc: 'What-if & compliance' },
  { to: '/employee-dashboard', icon: User, label: 'My Portal', desc: 'Employee personal view' },
  { to: '/chat', icon: MessageSquare, label: 'AI Assistant', desc: 'Ask anything' },
  { to: '/ai-insights', icon: Sparkles, label: 'AI Insights', desc: 'Live visualizations' },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className="w-60 bg-slate-950 text-white flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Brain size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">AI Allocator</p>
              <p className="text-xs text-slate-400">Resource Management</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label, desc }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              <div>
                <p className="text-sm font-medium leading-tight">{label}</p>
                <p className="text-xs opacity-60 leading-tight">{desc}</p>
              </div>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm">M</div>
            <div>
              <p className="text-sm font-semibold text-white">Manager</p>
              <p className="text-xs text-slate-500">Admin Access</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
