import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

const COLOR_MAP: Record<string, string> = {
  overloaded: '#ef4444', high: '#f97316', moderate: '#3b82f6',
  available: '#10b981', leave: '#a855f7', crunch: '#f59e0b', holiday: '#6b7280', off: '#e5e7eb',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-3 text-sm w-52">
      <p className="font-bold text-slate-800">{d?.day_label} ({d?.weekday})</p>
      <p className="text-gray-500 text-xs mt-0.5">{d?.status}</p>
      <div className="mt-2 space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Utilization</span>
          <span className="font-bold" style={{ color: COLOR_MAP[d?.color] || '#6b7280' }}>{Math.round(d?.predicted_capacity)}%</span>
        </div>
      </div>
    </div>
  );
};

export default function Forecast() {
  const [viewMode, setViewMode] = useState<'employee' | 'all' | 'project'>('employee');
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [allForecasts, setAllForecasts] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/employees').then(r => r.json()).then(res => {
      const data = res.success ? res.data : res;
      setEmployees(data);
      if (data.length > 0) setSelectedEmployee(data[0].id);
    });
    fetch('/api/projects').then(r => r.json()).then(res => {
      const data = res.success ? res.data : res;
      setProjects(data);
      if (data.length > 0) setSelectedProject(data[0].id);
    });
    fetch('/api/dashboard/forecast/all').then(r => r.json()).then(res => {
      setAllForecasts(res.success ? res.data : res);
    });
  }, []);

  useEffect(() => {
    if (viewMode === 'employee' && selectedEmployee) {
      fetchForecast(`/api/employees/${selectedEmployee}/forecast`);
    } else if (viewMode === 'project' && selectedProject) {
      fetchForecast(`/api/projects/${selectedProject}/forecast`);
    } else if (viewMode === 'all') {
      fetchForecast(`/api/dashboard/forecast/team-aggregate`);
    }
  }, [selectedEmployee, selectedProject, viewMode]);

  const fetchForecast = (url: string) => {
    setLoading(true);
    setForecastData(null);
    fetch(url)
      .then(r => r.json())
      .then(res => {
        const data = res.success ? res.data : res;
        if (data.forecast) {
          data.forecast = data.forecast.map((d: any) => ({
            ...d,
            day_label: d.day_label || new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            weekday: d.weekday || new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' }),
            color: d.color || (d.predicted_capacity > 100 ? 'overloaded' : d.predicted_capacity > 0 ? 'moderate' : 'off'),
            status: d.status || (d.predicted_capacity === 0 ? 'Off' : `${Math.round(d.predicted_capacity)}% utilized`),
          }));
        }
        setForecastData(data);
        setLoading(false);
      })
      .catch(() => {
        setForecastData({ error: 'Forecast service unavailable' });
        setLoading(false);
      });
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">AI Capacity Forecasting</h1>
          <p className="text-sm text-gray-500 mt-0.5">Predictive workload analysis for personnel and projects</p>
          
          <div className="flex bg-gray-100 p-1 rounded-lg mt-4 w-fit">
            {(['employee', 'project', 'all'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {mode === 'employee' ? '👤 Employee' : mode === 'project' ? '📁 Project' : '🌐 Team Aggregate'}
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'employee' && (
          <select
            className="border border-gray-300 rounded-xl px-4 py-2.5 bg-white font-medium text-sm shadow-sm"
            value={selectedEmployee}
            onChange={e => setSelectedEmployee(e.target.value)}
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>
            ))}
          </select>
        )}

        {viewMode === 'project' && (
          <select
            className="border border-gray-300 rounded-xl px-4 py-2.5 bg-white font-medium text-sm shadow-sm"
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-200">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500 font-medium">Computing AI Predictions...</p>
          </div>
        </div>
      ) : forecastData?.error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm">
          <p className="font-bold mb-1">⚠️ Forecast Service Offline</p>
          <p>Please ensure the ML backend is running.</p>
        </div>
      ) : forecastData && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* AI Insight */}
          <div className={`rounded-2xl p-5 flex items-start gap-4 border ${forecastData.risk_level === 'High' ? 'bg-red-50 border-red-100' : 'bg-slate-800 text-white border-slate-700'}`}>
            <span className="text-3xl mt-1">🤖</span>
            <div className="flex-1">
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${forecastData.risk_level === 'High' ? 'text-red-600' : 'text-slate-400'}`}>
                AI Strategic Insight — {viewMode === 'employee' ? forecastData.employee_name : viewMode === 'project' ? forecastData.project_name : 'Whole Organization'}
              </p>
              <p className="text-base font-semibold leading-relaxed">{forecastData.insight}</p>
            </div>
            {forecastData.risk_level === 'High' && (
              <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg animate-pulse">HIGH RISK</span>
            )}
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {viewMode === 'all' ? 'Team-Wide Capacity Forecast' : '28-Day Capacity Projection'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Average predicted load percentage across the timeline</p>
              </div>
              <div className="flex gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>Overload</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>Forecast</div>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData.forecast} margin={{ top: 10, right: 20, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="day_label" tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} axisLine={false} tickLine={false} interval={3} />
                  <YAxis domain={[0, 150]} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} label={{ position: 'right', value: 'CAPACITY', fill: '#ef4444', fontSize: 10, fontWeight: 'black' }} />
                  <Area type="monotone" dataKey="predicted_capacity" stroke="#6366f1" strokeWidth={3} fill="url(#forecastGrad)" 
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload.predicted_capacity < 100) return <></>;
                      return <circle key={payload.date} cx={cx} cy={cy} r={4} fill="#ef4444" stroke="white" strokeWidth={2} />;
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {viewMode === 'all' && (
             <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
             <div className="p-5 border-b border-gray-100 bg-slate-50/50">
               <h3 className="font-bold text-slate-800">Global Team Health Metrics</h3>
               <p className="text-xs text-gray-500 mt-0.5">Quick summary of all personnel predicted status</p>
             </div>
             <table className="w-full text-left">
               <thead className="bg-white text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
                 <tr>
                   <th className="p-4 font-bold">Employee</th>
                   <th className="p-4 font-bold">Current Load</th>
                   <th className="p-4 font-bold">Predicted Peak</th>
                   <th className="p-4 font-bold text-right">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {allForecasts.map(emp => (
                   <tr key={emp.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setViewMode('employee'); setSelectedEmployee(emp.id); }}>
                     <td className="p-4">
                       <p className="font-bold text-slate-800 text-sm">{emp.name}</p>
                       <p className="text-xs text-gray-500">{emp.role}</p>
                     </td>
                     <td className="p-4 text-sm font-semibold">{emp.currentLoad}%</td>
                     <td className="p-4">
                       <div className="flex items-center gap-2">
                         <span className={`text-sm font-bold ${emp.peakLoad > 100 ? 'text-red-600' : 'text-orange-500'}`}>{emp.peakLoad}%</span>
                         <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                           <div className={`h-full rounded-full ${emp.peakLoad > 100 ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${Math.min(emp.peakLoad, 100)}%` }}></div>
                         </div>
                       </div>
                     </td>
                     <td className="p-4 text-right">
                       <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${emp.status === 'Overloaded' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                         {emp.status}
                       </span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
          )}
        </div>
      )}
    </div>
  );
}
