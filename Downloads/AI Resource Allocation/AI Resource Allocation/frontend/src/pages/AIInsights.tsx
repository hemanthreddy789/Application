import { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Sparkles, TrendingUp, TrendingDown, Minus, Trash2, BarChart2 } from 'lucide-react';

export interface Visualization {
  type: 'kpi' | 'bar' | 'pie' | 'progress' | 'table';
  id: string;
  title: string;
  subtitle?: string;
  value?: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange';
  data?: Array<{ name: string; value: number; color?: string }>;
  columns?: string[];
  rows?: string[][];
  items?: Array<{ label: string; value: number; max: number; color?: string }>;
  prompt?: string;
  createdAt?: number;
}

const COLOR_MAP: Record<string, string> = {
  blue: '#3b82f6', green: '#22c55e', red: '#ef4444',
  yellow: '#f59e0b', purple: '#8b5cf6', orange: '#f97316',
};

const BAR_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#f97316'];

function KpiCard({ viz }: { viz: Visualization }) {
  const bg = COLOR_MAP[viz.color || 'blue'];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{viz.title}</p>
          <p className="text-3xl font-bold mt-1" style={{ color: bg }}>{viz.value}</p>
          {viz.subtitle && <p className="text-xs text-gray-400 mt-1">{viz.subtitle}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg + '20' }}>
          {viz.trend === 'up' && <TrendingUp size={18} style={{ color: bg }} />}
          {viz.trend === 'down' && <TrendingDown size={18} style={{ color: bg }} />}
          {(viz.trend === 'neutral' || !viz.trend) && <Minus size={18} style={{ color: bg }} />}
        </div>
      </div>
      {viz.trendValue && (
        <div className="mt-3 flex items-center gap-1">
          <span className={`text-xs font-medium ${viz.trend === 'up' ? 'text-green-600' : viz.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
            {viz.trendValue}
          </span>
          <span className="text-xs text-gray-400">vs last period</span>
        </div>
      )}
    </div>
  );
}

function BarCard({ viz }: { viz: Visualization }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-700 mb-4">{viz.title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={viz.data} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {viz.data?.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieCard({ viz }: { viz: Visualization }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-700 mb-4">{viz.title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={viz.data} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
            {viz.data?.map((entry, i) => (
              <Cell key={i} fill={entry.color || BAR_COLORS[i % BAR_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: '8px', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProgressCard({ viz }: { viz: Visualization }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-700 mb-4">{viz.title}</p>
      <div className="space-y-3">
        {viz.items?.map((item, i) => {
          const pct = Math.min(100, Math.round((item.value / item.max) * 100));
          const color = item.color || BAR_COLORS[i % BAR_COLORS.length];
          return (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 font-medium">{item.label}</span>
                <span className="text-gray-500">{pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableCard({ viz }: { viz: Visualization }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm col-span-full">
      <p className="text-sm font-semibold text-gray-700 mb-4">{viz.title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {viz.columns?.map((col, i) => (
                <th key={i} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {viz.rows?.map((row, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                {row.map((cell, j) => (
                  <td key={j} className="py-2 px-3 text-gray-700">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function VizCard({ viz }: { viz: Visualization }) {
  if (viz.type === 'kpi') return <KpiCard viz={viz} />;
  if (viz.type === 'bar') return <BarCard viz={viz} />;
  if (viz.type === 'pie') return <PieCard viz={viz} />;
  if (viz.type === 'progress') return <ProgressCard viz={viz} />;
  if (viz.type === 'table') return <TableCard viz={viz} />;
  return null;
}

export const INSIGHTS_STORAGE_KEY = 'fristine_ai_insights';

export function saveInsights(vizs: Visualization[], prompt: string) {
  const existing: Visualization[] = JSON.parse(localStorage.getItem(INSIGHTS_STORAGE_KEY) || '[]');
  const stamped = vizs.map(v => ({ ...v, prompt, createdAt: Date.now() }));
  const updated = [...stamped, ...existing].slice(0, 100);
  localStorage.setItem(INSIGHTS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('fristine-insights-updated'));
}

export default function AIInsights() {
  const [groups, setGroups] = useState<Array<{ prompt: string; createdAt: number; items: Visualization[] }>>([]);

  const load = () => {
    const raw: Visualization[] = JSON.parse(localStorage.getItem(INSIGHTS_STORAGE_KEY) || '[]');
    const map = new Map<string, { prompt: string; createdAt: number; items: Visualization[] }>();
    for (const v of raw) {
      const key = `${v.prompt}-${v.createdAt}`;
      if (!map.has(key)) map.set(key, { prompt: v.prompt || '', createdAt: v.createdAt || 0, items: [] });
      map.get(key)!.items.push(v);
    }
    setGroups(Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt));
  };

  useEffect(() => {
    load();
    window.addEventListener('fristine-insights-updated', load);
    return () => window.removeEventListener('fristine-insights-updated', load);
  }, []);

  const clearAll = () => {
    localStorage.removeItem(INSIGHTS_STORAGE_KEY);
    setGroups([]);
  };

  const removeGroup = (createdAt: number) => {
    const raw: Visualization[] = JSON.parse(localStorage.getItem(INSIGHTS_STORAGE_KEY) || '[]');
    const filtered = raw.filter(v => v.createdAt !== createdAt);
    localStorage.setItem(INSIGHTS_STORAGE_KEY, JSON.stringify(filtered));
    load();
  };

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
          <BarChart2 size={32} className="text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">No AI Insights Yet</h2>
        <p className="text-gray-400 text-sm max-w-sm">
          Go to the <span className="font-semibold text-indigo-500">Fristine Assistant</span> chat and ask it to visualize something.
          <br /><br />
          Try: <em>"Visualize team workload"</em> or <em>"Show me a project risk dashboard"</em>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">AI Insights</h1>
            <p className="text-xs text-gray-400">{groups.length} visualization {groups.length === 1 ? 'session' : 'sessions'} generated</p>
          </div>
        </div>
        <button onClick={clearAll} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors">
          <Trash2 size={12} /> Clear All
        </button>
      </div>

      {groups.map((group) => (
        <div key={group.createdAt} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-400" />
              <span className="text-sm font-semibold text-gray-700 italic">"{group.prompt}"</span>
              <span className="text-xs text-gray-400">· {new Date(group.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <button onClick={() => removeGroup(group.createdAt)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 size={12} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {group.items
              .filter(v => v.type === 'kpi')
              .map(v => <VizCard key={v.id} viz={v} />)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.items
              .filter(v => v.type !== 'kpi')
              .map(v => <VizCard key={v.id} viz={v} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
