import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend,
} from 'recharts';
import {
  Sparkles, TrendingUp, TrendingDown, Minus, Trash2, BarChart2,
  X, MoreHorizontal, Share2, AlertTriangle, AlertCircle,
  CheckCircle2, Zap, Lightbulb, Telescope, FileDown,
  ArrowRight, ExternalLink, ShieldAlert, Activity,
} from 'lucide-react';

/* ─── types ─── */
export interface Visualization {
  type: 'kpi' | 'bar' | 'pie' | 'progress' | 'table' | 'area' | 'radar' | 'heatmap' | 'sankey' | 'allocation' | 'summary' | 'insight' | 'action' | 'nav';
  id: string;
  title: string;
  subtitle?: string;
  // KPI
  value?: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange';
  status?: 'Healthy' | 'Warning' | 'Critical';
  insight?: string;        // one-sentence AI insight on KPI card
  // Charts
  data?: Array<{ name: string; value: number; color?: string }>;
  // Table
  columns?: string[];
  rows?: string[][];
  // Progress
  items?: Array<{ label: string; value: number; max: number; color?: string }>;
  // Executive summary (type: summary)
  text?: string;
  // AI insights panel (type: insight)
  risks?: string[];
  warnings?: string[];
  opportunities?: string[];
  predictions?: string[];
  recommendations?: string[];
  // Radar chart (type: radar) — reuses data[]{name,value}, optional radarKeys for multi-series
  radarKeys?: Array<{ name: string; color: string; key: string }>;
  // Heatmap (type: heatmap) — reuses columns/rows; rows[i][0]=label, rest are numeric strings
  // Sankey diagram (type: sankey)
  nodes?: Array<{ id: string; name: string; group?: 'source' | 'target' | 'middle' }>;
  links?: Array<{ source: string; target: string; value: number }>;
  // Allocation matrix (type: allocation)
  employees?: string[];
  projects?: string[];
  matrix?: number[][];
  // Action center (type: action)
  actions?: Array<{ label: string; variant?: 'primary' | 'secondary' | 'danger'; module?: string; requiresConfirm?: boolean }>;
  // Navigation (type: nav)
  navLinks?: Array<{ label: string; path?: string; description?: string }>;
  // Meta
  prompt?: string;
  createdAt?: number;
}

/* ─── colour system ─── */
const COLOR_MAP: Record<string, string> = {
  blue:   '#3b82f6',
  green:  '#22c55e',
  red:    '#ef4444',
  yellow: '#f59e0b',
  purple: '#818cf8',
  orange: '#f97316',
};

const CHART_PALETTE = [
  '#818cf8', '#f97316', '#22c55e', '#f59e0b',
  '#ef4444', '#c084fc', '#22d3ee', '#34d399',
];

const STATUS_CFG: Record<string, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
  Healthy:  { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e', icon: <CheckCircle2 size={10} />, label: 'Healthy' },
  Warning:  { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', icon: <AlertTriangle size={10} />, label: 'Warning' },
  Critical: { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', icon: <AlertCircle size={10} />, label: 'Critical' },
};

const premiumCardStyle = {
  background: 'var(--card)',
  border: '1px solid var(--card-border)',
  boxShadow: 'var(--card-shadow)',
} as const;

const chartGridStroke = 'rgba(120,120,120,0.14)';

/* ─── Underlying Data Drill Modal (universal) ─── */
function DrillModal({ title, columns, rows, onClose }: {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  onClose: () => void;
}) {
  const [filter, setFilter] = useState('');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  let displayed = rows.filter(r =>
    !filter || r.some(c => String(c).toLowerCase().includes(filter.toLowerCase()))
  );
  if (sortCol !== null) {
    displayed = [...displayed].sort((a, b) =>
      sortAsc
        ? String(a[sortCol]).localeCompare(String(b[sortCol]), undefined, { numeric: true })
        : String(b[sortCol]).localeCompare(String(a[sortCol]), undefined, { numeric: true })
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60] p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Underlying Data</p>
            <p className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{title}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={filter} onChange={e => setFilter(e.target.value)}
              placeholder="Filter rows…"
              className="text-xs px-3 py-1.5 rounded-lg outline-none"
              style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)', color: 'var(--t1)', width: 130 }}
            />
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--t3)' }}><X size={14} /></button>
          </div>
        </div>
        {/* Badge */}
        <div className="px-5 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--bg-sub)' }}>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
            {displayed.length} records
          </span>
          <span className="text-[10px]" style={{ color: 'var(--t3)' }}>Click column headers to sort</span>
        </div>
        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0" style={{ background: 'var(--bg-sub)' }}>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                {columns.map((col, i) => (
                  <th key={i}
                    className="text-left px-5 py-3 font-bold uppercase tracking-widest cursor-pointer select-none transition-colors hover:text-indigo-400"
                    style={{ color: 'var(--t3)' }}
                    onClick={() => { setSortCol(i); setSortAsc(sortCol === i ? !sortAsc : true); }}>
                    {col} {sortCol === i ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((row, i) => (
                <tr key={i} className="transition-colors"
                  style={{ borderBottom: '1px solid var(--card-border)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-sub)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-5 py-3" style={{ color: j === 0 ? 'var(--t1)' : 'var(--t2)', fontWeight: j === 0 ? 600 : 400 }}>
                      {String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr><td colSpan={columns.length} className="px-5 py-8 text-center text-xs" style={{ color: 'var(--t3)' }}>No matching records</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── dark tooltip ─── */
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-2xl"
      style={{ background: 'var(--card)', border: '1px solid rgba(129,140,248,0.3)' }}>
      {label && <p className="text-slate-400 mb-1 font-semibold">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-black" style={{ color: p.color || p.fill || '#818cf8' }}>
          {p.name ? `${p.name}: ` : ''}{p.value}
        </p>
      ))}
    </div>
  );
}

/* ─── KPI drill modal ─── */
function KpiDrillModal({ viz, onClose }: { viz: Visualization; onClose: () => void }) {
  const accent = COLOR_MAP[viz.color || 'blue'];
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }} onClick={onClose}>
      <div className="w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden rounded-2xl"
        style={{ background: 'var(--card)', border: `1px solid ${accent}40`, boxShadow: `0 0 40px ${accent}20` }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: `${accent}08` }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>{viz.title}</p>
            <p className="text-4xl font-black text-white">{viz.value}</p>
            {viz.subtitle && <p className="text-xs text-slate-500 mt-1">{viz.subtitle}</p>}
            {viz.insight && <p className="text-xs mt-2 italic" style={{ color: accent }}>{viz.insight}</p>}
          </div>
          <div className="flex items-center gap-2">
            {viz.status && STATUS_CFG[viz.status] && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: STATUS_CFG[viz.status].bg, color: STATUS_CFG[viz.status].color }}>
                {STATUS_CFG[viz.status].icon} {STATUS_CFG[viz.status].label}
              </span>
            )}
            {viz.trendValue && (
              <span className="text-xs font-black px-2.5 py-1 rounded-full"
                style={{
                  background: viz.trend === 'up' ? 'rgba(34,197,94,0.15)' : viz.trend === 'down' ? 'rgba(239,68,68,0.15)' : 'rgba(148,163,184,0.1)',
                  color: viz.trend === 'up' ? '#22c55e' : viz.trend === 'down' ? '#ef4444' : '#94a3b8',
                }}>
                {viz.trend === 'up' ? '↑' : viz.trend === 'down' ? '↓' : '→'} {viz.trendValue}
              </span>
            )}
            <button onClick={onClose} className="p-2 rounded-xl transition-colors text-slate-500 hover:text-white"
              style={{ background: 'var(--bg-sub)' }}><X size={14} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-5">
          {viz.data && viz.data.length > 0 && (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={viz.data} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--t3)' }} angle={-30} textAnchor="end" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--t3)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {viz.data.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                <thead><tr>{['Name', 'Value'].map(h => <th key={h} className="text-left px-3 py-2 font-bold uppercase tracking-widest text-slate-600">{h}</th>)}</tr></thead>
                <tbody>
                  {viz.data.map((row, i) => (
                    <tr key={i} style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <td className="px-3 py-2 font-medium text-slate-300 rounded-l-lg">{row.name}</td>
                      <td className="px-3 py-2 font-black rounded-r-lg text-right" style={{ color: row.color || CHART_PALETTE[i % CHART_PALETTE.length] }}>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── [1] Executive Summary card ─── */
function SummaryCard({ viz }: { viz: Visualization }) {
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(20px)' }}>
      {/* top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7, #6366f1)' }} />
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>
          <Activity size={16} color="#818cf8" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#818cf8' }}>Executive Summary</p>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
              AI Generated
            </span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{viz.text || viz.subtitle}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── [2] KPI Card — premium style ─── */
function KpiCard({ viz }: { viz: Visualization }) {
  const [open, setOpen] = useState(false);
  const accent = COLOR_MAP[viz.color || 'blue'];
  const isUp = viz.trend === 'up';
  const isDown = viz.trend === 'down';
  const statusCfg = viz.status ? STATUS_CFG[viz.status] : null;
  return (
    <>
      <div onClick={() => setOpen(true)}
        className="rounded-2xl cursor-pointer group transition-all relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${accent}12 0%, ${accent}06 50%, transparent 100%)`,
          border: `1px solid ${accent}25`,
          boxShadow: `0 2px 12px ${accent}10, inset 0 1px 0 rgba(120,120,120,0.12)`,
          padding: '20px',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.border = `1px solid ${accent}55`;
          el.style.boxShadow = `0 8px 32px ${accent}20, inset 0 1px 0 rgba(255,255,255,0.08)`;
          el.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.border = `1px solid ${accent}25`;
          el.style.boxShadow = `0 2px 12px ${accent}10, inset 0 1px 0 rgba(120,120,120,0.12)`;
          el.style.transform = 'translateY(0)';
        }}>
        {/* Top colored bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, ${accent}00, ${accent}, ${accent}00)` }} />
        {/* Large ghost value */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 font-black pointer-events-none select-none leading-none"
          style={{ fontSize: 64, color: accent, opacity: 0.06 }}>{viz.value}</div>

        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${accent}20`, border: `1px solid ${accent}35`, boxShadow: `0 0 12px ${accent}20` }}>
            {isUp   && <TrendingUp  size={18} style={{ color: accent }} />}
            {isDown && <TrendingDown size={18} style={{ color: accent }} />}
            {(!isUp && !isDown) && <Minus size={18} style={{ color: accent }} />}
          </div>
          <div className="flex flex-col items-end gap-1">
            {statusCfg && (
              <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}40` }}>
                {statusCfg.icon} {statusCfg.label}
              </span>
            )}
            {viz.trendValue && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{
                  background: isUp ? 'rgba(34,197,94,0.18)' : isDown ? 'rgba(239,68,68,0.18)' : 'rgba(148,163,184,0.12)',
                  color: isUp ? '#22c55e' : isDown ? '#ef4444' : '#94a3b8',
                  border: `1px solid ${isUp ? 'rgba(34,197,94,0.3)' : isDown ? 'rgba(239,68,68,0.3)' : 'rgba(148,163,184,0.12)'}`,
                }}>
                {isUp ? '▲' : isDown ? '▼' : '→'} {viz.trendValue}
              </span>
            )}
          </div>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[1.2px] mb-1.5" style={{ color: accent, opacity: 0.7 }}>{viz.title}</p>
        <p className="text-[32px] font-black leading-none mb-1" style={{ color: 'var(--t1)', letterSpacing: '-1px' }}>{viz.value}</p>
        {viz.subtitle && <p className="text-[10px] font-medium mt-1" style={{ color: 'rgba(148,163,184,0.6)' }}>{viz.subtitle}</p>}

        {viz.insight && (
          <div className="mt-3 pt-3 flex items-start gap-2" style={{ borderTop: `1px solid ${accent}18` }}>
            <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: accent }} />
            <p className="text-[10px] leading-relaxed italic" style={{ color: accent, opacity: 0.8 }}>{viz.insight}</p>
          </div>
        )}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${accent}25`, color: accent, border: `1px solid ${accent}40` }}>drill →</span>
        </div>
      </div>
      {open && <KpiDrillModal viz={viz} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ─── [3] Bar chart card ─── */
function BarCard({ viz }: { viz: Visualization }) {
  const [drill, setDrill] = useState(false);
  return (
    <>
      <div className="rounded-2xl p-5 h-full cursor-pointer group"
        style={premiumCardStyle}
        onClick={() => viz.data && viz.data.length > 0 && setDrill(true)}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-bold text-white">{viz.title}</p>
            {viz.subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{viz.subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>data →</span>
            <Share2 size={12} className="text-slate-600 cursor-pointer hover:text-slate-300 transition-colors" onClick={e => e.stopPropagation()} />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={viz.data} margin={{ top: 5, right: 5, bottom: 20, left: -20 }}>
            <defs>
              {CHART_PALETTE.map((color, i) => (
                <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={color} stopOpacity={1}    />
                  <stop offset="55%"  stopColor={color} stopOpacity={0.75} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.2}  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridStroke} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 'bold' }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" />
            <YAxis tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
            <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(120,120,120,0.12)', rx: 8 }} />
            <Bar dataKey="value" radius={[8, 8, 2, 2]} maxBarSize={44}>
              {viz.data?.map((entry, i) => (
                <Cell key={i} fill={entry.color || `url(#barGrad${i % CHART_PALETTE.length})`}
                  stroke={CHART_PALETTE[i % CHART_PALETTE.length]} strokeWidth={0} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {drill && viz.data && (
        <DrillModal
          title={viz.title}
          columns={['Name', 'Value']}
          rows={viz.data.map(d => [d.name, d.value])}
          onClose={() => setDrill(false)}
        />
      )}
    </>
  );
}

/* ─── Pie/donut card ─── */
function PieCard({ viz }: { viz: Visualization }) {
  const [drill, setDrill] = useState(false);
  const total = viz.data?.reduce((s, d) => s + d.value, 0) || 0;
  return (
    <>
    <div className="rounded-2xl p-5 cursor-pointer group"
      style={premiumCardStyle}
      onClick={() => viz.data && viz.data.length > 0 && setDrill(true)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-white">{viz.title}</p>
          {viz.subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{viz.subtitle}</p>}
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>data →</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative" style={{ width: 140, height: 140, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={viz.data} cx="50%" cy="50%" innerRadius={42} outerRadius={62}
                dataKey="value" startAngle={90} endAngle={-270} strokeWidth={2} stroke="var(--card)">
                {viz.data?.map((entry, i) => <Cell key={i} fill={entry.color || CHART_PALETTE[i % CHART_PALETTE.length]} />)}
              </Pie>
              <Tooltip content={<DarkTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-xl font-black text-white leading-none">
              {viz.data && viz.data.length > 0 ? `${Math.round((viz.data[0].value / total) * 100)}%` : '—'}
            </p>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Total</p>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {viz.data?.map((entry, i) => {
            const color = entry.color || CHART_PALETTE[i % CHART_PALETTE.length];
            const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
            return (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-xs text-slate-400 font-medium">{entry.name}</span>
                </div>
                <span className="text-xs font-black" style={{ color }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    {drill && viz.data && (
      <DrillModal
        title={viz.title}
        columns={['Category', 'Count', '% of Total']}
        rows={viz.data.map(d => [d.name, d.value, `${total > 0 ? Math.round((d.value / total) * 100) : 0}%`])}
        onClose={() => setDrill(false)}
      />
    )}
    </>
  );
}

/* ─── Progress bars card ─── */
function ProgressCard({ viz }: { viz: Visualization }) {
  const [drill, setDrill] = useState(false);
  return (
    <>
    <div className="rounded-2xl p-5 cursor-pointer group"
      style={premiumCardStyle}
      onClick={() => viz.items && viz.items.length > 0 && setDrill(true)}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-bold text-white">{viz.title}</p>
          {viz.subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{viz.subtitle}</p>}
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>data →</span>
      </div>
      <div className="space-y-4">
        {viz.items?.map((item, i) => {
          const pct = Math.min(100, Math.round((item.value / item.max) * 100));
          const color = item.color || CHART_PALETTE[i % CHART_PALETTE.length];
          return (
            <div key={i}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-slate-300">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black" style={{ color }}>{pct}%</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                    {item.value}/{item.max}
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full relative" style={{ background: 'rgba(120,120,120,0.12)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}88)`, boxShadow: `0 0 10px ${color}55` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
    {drill && viz.items && (
      <DrillModal
        title={viz.title}
        columns={['Label', 'Value', 'Max', '%']}
        rows={viz.items.map(item => [item.label, item.value, item.max, `${Math.min(100, Math.round((item.value / item.max) * 100))}%`])}
        onClose={() => setDrill(false)}
      />
    )}
    </>
  );
}

/* ─── Table card ─── */
function TableCard({ viz }: { viz: Visualization }) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedRow, setSelectedRow] = useState<string[] | null>(null);

  const statusColors: Record<string, [string, string]> = {
    completed:  ['rgba(34,197,94,0.15)',  '#22c55e'],
    pending:    ['rgba(251,191,36,0.15)', '#fbbf24'],
    blocked:    ['rgba(239,68,68,0.15)',  '#ef4444'],
    active:     ['rgba(129,140,248,0.15)','#818cf8'],
    overloaded: ['rgba(239,68,68,0.15)',  '#ef4444'],
    available:  ['rgba(34,211,153,0.15)', '#34d399'],
    high:       ['rgba(249,115,22,0.15)', '#f97316'],
    moderate:   ['rgba(129,140,248,0.15)','#818cf8'],
    critical:   ['rgba(239,68,68,0.15)',  '#ef4444'],
    healthy:    ['rgba(34,197,94,0.15)',  '#22c55e'],
    warning:    ['rgba(251,191,36,0.15)', '#fbbf24'],
    approved:   ['rgba(34,197,94,0.15)',  '#22c55e'],
    rejected:   ['rgba(239,68,68,0.15)',  '#ef4444'],
    low:        ['rgba(34,197,94,0.15)',  '#22c55e'],
    medium:     ['rgba(251,191,36,0.15)', '#fbbf24'],
  };

  const getStatusStyle = (val: string) => {
    const key = val.toLowerCase();
    for (const [k, v] of Object.entries(statusColors)) {
      if (key.includes(k)) return { background: v[0], color: v[1], border: `1px solid ${v[1]}30` };
    }
    return { background: 'var(--bg-sub)', color: 'var(--t3)', border: '1px solid var(--card-border)' };
  };

  const looksLikeStatus = (val: string) =>
    /completed|pending|blocked|active|overloaded|available|high|moderate|critical|healthy|warning|approved|rejected|low|medium/i.test(val);

  let rows = viz.rows || [];
  if (filter) rows = rows.filter(r => r.some(c => c.toLowerCase().includes(filter.toLowerCase())));
  if (sortCol !== null) {
    rows = [...rows].sort((a, b) =>
      sortAsc ? a[sortCol].localeCompare(b[sortCol]) : b[sortCol].localeCompare(a[sortCol])
    );
  }

  return (
    <>
    <div className="rounded-2xl overflow-hidden col-span-full"
      style={premiumCardStyle}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-white">{viz.title}</p>
          {viz.rows && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.25)' }}>
              {viz.rows.length} records
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Filter..."
            className="text-xs px-2 py-1 rounded-lg outline-none"
            style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)', color: 'var(--t1)', width: 100 }}
          />
          <Share2 size={12} className="text-slate-600 cursor-pointer hover:text-slate-300 transition-colors" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
              {viz.columns?.map((col, i) => (
                <th key={i} className="text-left px-5 py-3 font-bold uppercase tracking-widest text-slate-600 cursor-pointer select-none hover:text-slate-400 transition-colors"
                  onClick={() => { setSortCol(i); setSortAsc(sortCol === i ? !sortAsc : true); }}>
                  {col} {sortCol === i ? (sortAsc ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="transition-colors cursor-pointer" style={{ borderBottom: '1px solid var(--card-border)' }}
                onClick={() => setSelectedRow(row)}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                {row.map((cell, j) => (
                  <td key={j} className="px-5 py-3">
                    {looksLikeStatus(cell) ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={getStatusStyle(cell)}>{cell}</span>
                    ) : (
                      <span className={j === 0 ? 'font-bold text-white' : 'text-slate-400'}>{cell}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Row detail modal */}
    {selectedRow && viz.columns && (
      <div className="fixed inset-0 flex items-center justify-center z-[60] p-4"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
        onClick={() => setSelectedRow(null)}>
        <div className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--bg-sub)' }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#818cf8' }}>Row Detail</p>
            <button onClick={() => setSelectedRow(null)} style={{ color: 'var(--t3)' }}><X size={14} /></button>
          </div>
          <div className="p-5 space-y-3">
            {viz.columns.map((col, i) => (
              <div key={i} className="flex justify-between items-start gap-4">
                <span className="text-xs font-bold uppercase tracking-widest shrink-0" style={{ color: 'var(--t3)', width: 120 }}>{col}</span>
                <span className="text-sm font-medium text-right" style={{ color: 'var(--t1)' }}>{selectedRow[i] ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

/* ─── Area chart card ─── */
function AreaCard({ viz }: { viz: Visualization }) {
  const [drill, setDrill] = useState(false);
  const color = COLOR_MAP[viz.color || 'purple'];
  return (
    <>
    <div className="rounded-2xl p-5 cursor-pointer group"
      style={premiumCardStyle}
      onClick={() => viz.data && viz.data.length > 0 && setDrill(true)}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-bold text-white">{viz.title}</p>
          {viz.subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{viz.subtitle}</p>}
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>data →</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={viz.data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.55} />
              <stop offset="50%"  stopColor={color} stopOpacity={0.2}  />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridStroke} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
          <Tooltip content={<DarkTooltip />} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={3}
            fill="url(#areaGrad)" dot={{ fill: color, r: 4, stroke: 'var(--card)', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2.5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    {drill && viz.data && (
      <DrillModal
        title={viz.title}
        columns={['Period', 'Value']}
        rows={viz.data.map(d => [d.name, d.value])}
        onClose={() => setDrill(false)}
      />
    )}
    </>
  );
}

/* ─── [6] AI Insights panel ─── */
function InsightPanel({ viz }: { viz: Visualization }) {
  type Tab = 'risks' | 'warnings' | 'opportunities' | 'predictions' | 'recommendations';
  const [tab, setTab] = useState<Tab>('risks');

  const tabs: Array<{ key: Tab; icon: React.ReactNode; label: string; color: string; items?: string[] }> = [
    { key: 'risks',           icon: <ShieldAlert  size={12} />, label: 'Risks',           color: '#ef4444', items: viz.risks },
    { key: 'warnings',        icon: <AlertTriangle size={12} />, label: 'Warnings',        color: '#fbbf24', items: viz.warnings },
    { key: 'opportunities',   icon: <Zap          size={12} />, label: 'Opportunities',   color: '#22c55e', items: viz.opportunities },
    { key: 'predictions',     icon: <Telescope    size={12} />, label: 'Predictions',     color: '#818cf8', items: viz.predictions },
    { key: 'recommendations', icon: <Lightbulb    size={12} />, label: 'Recommendations', color: '#f97316', items: viz.recommendations },
  ].filter(t => t.items && t.items.length > 0) as Array<{ key: Tab; icon: React.ReactNode; label: string; color: string; items: string[] }>;

  const activeCfg = tabs.find(t => t.key === tab) || tabs[0];
  if (!activeCfg) return null;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={premiumCardStyle}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(99,102,241,0.06)' }}>
        <div className="flex items-center gap-2">
          <Sparkles size={14} color="#818cf8" />
          <p className="text-sm font-bold text-white">{viz.title || 'AI Insights'}</p>
        </div>
        <div className="flex gap-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all"
              style={{
                background: tab === t.key ? `${t.color}20` : 'transparent',
                color: tab === t.key ? t.color : '#475569',
                border: tab === t.key ? `1px solid ${t.color}35` : '1px solid transparent',
              }}>
              {t.icon} {t.label}
              <span className="ml-0.5 rounded-full text-[9px] font-black px-1"
                style={{ background: tab === t.key ? `${t.color}25` : 'rgba(120,120,120,0.12)', color: tab === t.key ? t.color : '#64748b' }}>
                {t.items?.length ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="p-5 space-y-2.5">
        {(activeCfg.items ?? []).map((item, i) => (
          <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl"
            style={{ background: `${activeCfg.color}08`, border: `1px solid ${activeCfg.color}18` }}>
            <span className="mt-0.5 shrink-0" style={{ color: activeCfg.color }}>{activeCfg.icon}</span>
            <span className="text-xs text-slate-300 leading-relaxed">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── [7] Action center ─── */
function ActionCenter({ viz, onAction }: { viz: Visualization; onAction?: (label: string, requiresConfirm: boolean) => void }) {
  const variantStyle = (v?: string) => {
    if (v === 'primary')   return { background: '#6366f1', color: '#fff', border: 'none' };
    if (v === 'danger')    return { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' };
    return { background: 'rgba(120,120,120,0.12)', color: 'var(--t3)', border: '1px solid rgba(255,255,255,0.1)' };
  };
  return (
    <div className="rounded-2xl p-5"
      style={premiumCardStyle}>
      <div className="flex items-center gap-2 mb-4">
        <Zap size={14} color="#fbbf24" />
        <p className="text-sm font-bold text-white">{viz.title || 'Action Center'}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {viz.actions?.map((action, i) => (
          <button key={i}
            onClick={() => onAction?.(action.label, action.requiresConfirm ?? false)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
            style={variantStyle(action.variant)}
            onMouseEnter={e => { if (action.variant === 'primary') (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}>
            {action.requiresConfirm && <ShieldAlert size={11} />}
            {!action.requiresConfirm && action.variant !== 'danger' && <ArrowRight size={11} />}
            {action.label}
          </button>
        ))}
        <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
          style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
          <FileDown size={11} /> Export PDF
        </button>
      </div>
      {viz.actions?.some(a => a.requiresConfirm) && (
        <p className="text-[10px] text-slate-600 mt-3 flex items-center gap-1">
          <ShieldAlert size={10} /> Actions marked with a shield require confirmation before execution.
        </p>
      )}
    </div>
  );
}

/* ─── [8] Related navigation ─── */
function NavLinks({ viz }: { viz: Visualization }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl p-5"
      style={premiumCardStyle}>
      <div className="flex items-center gap-2 mb-4">
        <ExternalLink size={14} color="#22d3ee" />
        <p className="text-sm font-bold text-white">{viz.title || 'Related Sections'}</p>
      </div>
      <div className="space-y-2">
        {(viz.navLinks || (viz as any).links)?.map((link: any, i: number) => (
          <div key={i}
            onClick={() => link.path && navigate(link.path)}
            className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all group"
            style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(34,211,238,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(34,211,238,0.2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(120,120,120,0.12)'; }}>
            <div>
              <p className="text-xs font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">{link.label}</p>
              {link.description && <p className="text-[10px] text-slate-600 mt-0.5">{link.description}</p>}
            </div>
            <ArrowRight size={13} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Radar chart card ─── */
function RadarCard({ viz }: { viz: Visualization }) {
  const color = COLOR_MAP[viz.color || 'purple'];
  const keys = viz.radarKeys || [];
  return (
    <div className="rounded-2xl p-5"
      style={premiumCardStyle}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-white">{viz.title}</p>
          {viz.subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{viz.subtitle}</p>}
        </div>
        <MoreHorizontal size={14} className="text-slate-600 cursor-pointer hover:text-slate-300 transition-colors" />
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={viz.data}>
          <PolarGrid stroke={chartGridStroke} />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 600 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#334155' }} tickCount={4} />
          {keys.length > 0 ? keys.map((k, i) => (
            <Radar key={i} name={k.name} dataKey={k.key}
              stroke={k.color} fill={k.color} fillOpacity={0.18} strokeWidth={2}
              dot={{ fill: k.color, r: 3 }} />
          )) : (
            <Radar name={viz.title} dataKey="value"
              stroke={color} fill={color} fillOpacity={0.2} strokeWidth={2.5}
              dot={{ fill: color, r: 4, stroke: 'var(--card)', strokeWidth: 2 }} />
          )}
          <Tooltip content={<DarkTooltip />} />
          {keys.length > 1 && (
            <Legend formatter={(v) => <span style={{ color: 'var(--t3)', fontSize: 10 }}>{v}</span>} />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Heatmap card ─── */
function HeatmapCard({ viz }: { viz: Visualization }) {
  const cols = viz.columns || [];
  const rows = viz.rows || [];
  const allVals = rows.flatMap(r => r.slice(1).map(Number).filter(n => !isNaN(n)));
  const min = allVals.length ? Math.min(...allVals) : 0;
  const max = allVals.length ? Math.max(...allVals) : 100;

  const cellStyle = (rawVal: string): React.CSSProperties => {
    const val = Number(rawVal);
    if (isNaN(val)) return { background: 'var(--bg-sub)', color: '#334155' };
    const pct = max > min ? (val - min) / (max - min) : 0;
    if (pct > 0.66) return { background: `rgba(239,68,68,${0.12 + pct * 0.5})`,  color: '#fca5a5' };
    if (pct > 0.33) return { background: `rgba(251,191,36,${0.12 + pct * 0.4})`, color: '#fcd34d' };
    return           { background: `rgba(34,197,94,${0.10 + pct * 0.35})`,  color: '#86efac' };
  };

  return (
    <div className="rounded-2xl overflow-hidden col-span-full"
      style={premiumCardStyle}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
        <p className="text-sm font-bold text-white">{viz.title}</p>
        {viz.subtitle && <p className="text-[10px] text-slate-500">{viz.subtitle}</p>}
      </div>
      <div className="overflow-x-auto p-4">
        <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: '3px' }}>
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-slate-600 font-bold text-[10px]" style={{ minWidth: 100 }}></th>
              {cols.map((c, i) => (
                <th key={i} className="px-2 py-2 text-center text-slate-500 font-bold text-[10px]" style={{ minWidth: 56 }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-semibold text-slate-300 text-[11px]">{row[0]}</td>
                {row.slice(1).map((cell, j) => (
                  <td key={j} className="px-2 py-2 text-center rounded-lg font-black text-[11px]"
                    style={cellStyle(cell)}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center gap-3 mt-3 px-1">
          <span className="text-[10px] text-slate-600">Scale:</span>
          {[['Low', 'rgba(34,197,94,0.25)', '#86efac'], ['Med', 'rgba(251,191,36,0.3)', '#fcd34d'], ['High', 'rgba(239,68,68,0.45)', '#fca5a5']].map(([l, bg, c]) => (
            <div key={l} className="flex items-center gap-1">
              <div className="w-5 h-3.5 rounded" style={{ background: bg }} />
              <span className="text-[10px]" style={{ color: c }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Sankey / resource flow card ─── */
function SankeyCard({ viz }: { viz: Visualization }) {
  const sources = viz.nodes?.filter(n => n.group !== 'target') || [];
  const targets = viz.nodes?.filter(n => n.group === 'target') || [];
  const flowLinks = viz.links || [];

  return (
    <div className="rounded-2xl p-5 col-span-full"
      style={premiumCardStyle}>
      <p className="text-sm font-bold text-white mb-5">{viz.title}</p>
      <div className="flex items-start gap-6 overflow-x-auto pb-2">
        {/* Source nodes */}
        <div className="flex flex-col gap-2 shrink-0 min-w-[140px]">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Resources</p>
          {sources.map(s => {
            const out = flowLinks.filter(l => l.source === s.id).reduce((a, l) => a + l.value, 0);
            const color = out > 80 ? '#f87171' : out > 60 ? '#fbbf24' : '#818cf8';
            return (
              <div key={s.id} className="px-3 py-2 rounded-xl text-xs"
                style={{ background: `${color}12`, border: `1px solid ${color}30`, color }}>
                <p className="font-bold text-white text-[11px]">{s.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color }}>{out}% allocated</p>
              </div>
            );
          })}
        </div>

        {/* Flow visualization */}
        <div className="flex-1 relative" style={{ minWidth: 180, paddingTop: 28 }}>
          {flowLinks.slice(0, 8).map((link, i) => {
            const pct = link.value;
            const lineColor = pct > 75 ? '#ef4444' : pct > 50 ? '#f97316' : '#818cf8';
            return (
              <div key={i} className="flex items-center gap-1.5 mb-2">
                <div className="h-0.5 rounded-full flex-1"
                  style={{
                    width: `${Math.max(15, pct)}%`,
                    background: `linear-gradient(90deg, ${lineColor}80, ${lineColor})`,
                    boxShadow: `0 0 4px ${lineColor}50`,
                    opacity: 0.7 + (pct / 100) * 0.3,
                  }} />
                <span className="text-[9px] font-black shrink-0" style={{ color: lineColor, minWidth: 28 }}>{pct}%</span>
              </div>
            );
          })}
        </div>

        {/* Target nodes */}
        <div className="flex flex-col gap-2 shrink-0 min-w-[160px]">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Projects</p>
          {targets.map(t => {
            const inflow = flowLinks.filter(l => l.target === t.id).reduce((a, l) => a + l.value, 0);
            const pct = inflow;
            const color = pct > 80 ? '#34d399' : '#22d3ee';
            return (
              <div key={t.id} className="px-3 py-2 rounded-xl text-xs"
                style={{ background: `${color}10`, border: `1px solid ${color}25`, color }}>
                <p className="font-bold text-white text-[11px]">{t.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color }}>{pct}% of capacity used</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Allocation matrix card ─── */
function AllocationMatrix({ viz }: { viz: Visualization }) {
  const employees = viz.employees || [];
  const projects  = viz.projects  || [];
  const matrix    = viz.matrix    || [];

  const cellCfg = (val: number) => {
    if (val === 0)   return { bg: 'rgba(255,255,255,0.03)', color: '#1e293b', label: '—' };
    if (val >= 80)   return { bg: 'rgba(239,68,68,0.15)',   color: '#f87171', label: `${val}%` };
    if (val >= 50)   return { bg: 'rgba(251,191,36,0.14)',  color: '#fbbf24', label: `${val}%` };
    return             { bg: 'rgba(34,197,94,0.12)',   color: '#34d399', label: `${val}%` };
  };

  return (
    <div className="rounded-2xl overflow-hidden col-span-full"
      style={premiumCardStyle}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
        <p className="text-sm font-bold text-white">{viz.title || 'Allocation Matrix'}</p>
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
          {employees.length} × {projects.length}
        </span>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: '3px' }}>
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-slate-600 font-bold text-[10px]" style={{ minWidth: 120 }}>Employee</th>
              {projects.map((p, i) => (
                <th key={i} className="px-3 py-2 text-center text-slate-500 font-bold text-[10px]"
                  style={{ minWidth: 80, maxWidth: 120 }}>{p}</th>
              ))}
              <th className="px-3 py-2 text-center text-slate-600 font-bold text-[10px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, i) => {
              const row = matrix[i] || [];
              const total = row.reduce((s, v) => s + v, 0);
              const totalColor = total > 100 ? '#f87171' : total >= 80 ? '#fbbf24' : '#34d399';
              return (
                <tr key={i}>
                  <td className="px-3 py-2 font-semibold text-slate-200 text-[11px]">{emp}</td>
                  {row.map((val, j) => {
                    const cfg = cellCfg(val);
                    return (
                      <td key={j} className="px-3 py-2 text-center rounded-lg font-black text-[11px]"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center font-black text-[11px] rounded-lg"
                    style={{ color: totalColor, background: `${totalColor}12` }}>
                    {total}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center gap-3 mt-3 px-1">
          <span className="text-[10px] text-slate-600">Allocation:</span>
          {[['None', 'rgba(120,120,120,0.12)', '#334155'], ['<50%', 'rgba(34,197,94,0.12)', '#34d399'], ['50–79%', 'rgba(251,191,36,0.14)', '#fbbf24'], ['80%+', 'rgba(239,68,68,0.15)', '#f87171']].map(([l, bg, c]) => (
            <div key={l} className="flex items-center gap-1">
              <div className="w-5 h-3 rounded" style={{ background: bg }} />
              <span className="text-[10px]" style={{ color: c }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── VizCard dispatcher ─── */
export function VizCard({ viz, onAction }: { viz: Visualization; onAction?: (label: string, requiresConfirm: boolean) => void }) {
  if (viz.type === 'summary')    return <SummaryCard viz={viz} />;
  if (viz.type === 'kpi')        return <KpiCard viz={viz} />;
  if (viz.type === 'bar')        return viz.data && viz.data.length > 8 ? <AreaCard viz={viz} /> : <BarCard viz={viz} />;
  if (viz.type === 'area')       return <AreaCard viz={viz} />;
  if (viz.type === 'pie')        return <PieCard viz={viz} />;
  if (viz.type === 'progress')   return <ProgressCard viz={viz} />;
  if (viz.type === 'radar')      return <RadarCard viz={viz} />;
  if (viz.type === 'heatmap')    return <HeatmapCard viz={viz} />;
  if (viz.type === 'sankey')     return <SankeyCard viz={viz} />;
  if (viz.type === 'allocation') return <AllocationMatrix viz={viz} />;
  if (viz.type === 'table')      return <TableCard viz={viz} />;
  if (viz.type === 'insight')    return <InsightPanel viz={viz} />;
  if (viz.type === 'action')     return <ActionCenter viz={viz} onAction={onAction} />;
  if (viz.type === 'nav')        return <NavLinks viz={viz} />;
  return null;
}

/* ─── Workspace layout renderer (shared between AIInsights page + Chat.tsx) ─── */
export function WorkspaceRenderer({ items, onAction }: { items: Visualization[]; onAction?: (label: string, requiresConfirm: boolean) => void }) {
  const get = (type: string | string[]) =>
    items.filter(v => Array.isArray(type) ? type.includes(v.type) : v.type === type);

  const summaries     = get('summary');
  const kpis          = get('kpi');
  const charts        = get(['bar', 'area', 'pie', 'progress', 'radar']);
  const tables        = get('table');
  const insightPanels = get('insight');
  const actions       = get('action');
  const navItems      = get('nav');

  return (
    <div className="space-y-5">
      {/* [1] Executive Summary */}
      {summaries.map(v => <VizCard key={v.id} viz={v} onAction={onAction} />)}

      {/* [2] KPI Cards */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {kpis.map(v => <VizCard key={v.id} viz={v} onAction={onAction} />)}
        </div>
      )}

      {/* [3+4] Charts (primary + secondary) */}
      {charts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {charts.map(v => <VizCard key={v.id} viz={v} onAction={onAction} />)}
        </div>
      )}

      {/* Heatmap / Sankey / Allocation (full-width) */}
      {get(['heatmap', 'sankey', 'allocation']).map(v => <VizCard key={v.id} viz={v} onAction={onAction} />)}

      {/* [5] Data Tables */}
      {tables.map(v => <VizCard key={v.id} viz={v} onAction={onAction} />)}

      {/* [6] AI Insights Panel */}
      {insightPanels.map(v => <VizCard key={v.id} viz={v} onAction={onAction} />)}

      {/* [7+8] Action Center + Navigation */}
      {(actions.length > 0 || navItems.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actions.map(v => <VizCard key={v.id} viz={v} onAction={onAction} />)}
          {navItems.map(v => <VizCard key={v.id} viz={v} onAction={onAction} />)}
        </div>
      )}
    </div>
  );
}

/* ─── storage helpers ─── */
export const INSIGHTS_STORAGE_KEY = 'fristine_ai_insights';

export function saveInsights(vizs: Visualization[], prompt: string) {
  const existing: Visualization[] = JSON.parse(localStorage.getItem(INSIGHTS_STORAGE_KEY) || '[]');
  const stamped = vizs.map(v => ({ ...v, prompt, createdAt: Date.now() }));
  const updated = [...stamped, ...existing].slice(0, 200);
  localStorage.setItem(INSIGHTS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('fristine-insights-updated'));
}

/* ══════════════════ MAIN PAGE ══════════════════ */
export default function AIInsights() {
  const [groups, setGroups] = useState<Array<{ prompt: string; createdAt: number; items: Visualization[] }>>([]);
  const [activeGroup, setActiveGroup] = useState(0);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

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

  const clearAll = () => { localStorage.removeItem(INSIGHTS_STORAGE_KEY); setGroups([]); };
  const removeGroup = (createdAt: number) => {
    const raw: Visualization[] = JSON.parse(localStorage.getItem(INSIGHTS_STORAGE_KEY) || '[]');
    localStorage.setItem(INSIGHTS_STORAGE_KEY, JSON.stringify(raw.filter(v => v.createdAt !== createdAt)));
    load();
  };

  const handleAction = (label: string, requiresConfirm: boolean) => {
    if (requiresConfirm) setConfirmAction(label);
    // read actions execute immediately (navigate, etc.)
  };

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[65vh] text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))', border: '1px solid rgba(99,102,241,0.3)' }}>
          <BarChart2 size={28} className="text-indigo-400" />
        </div>
        <h2 className="text-xl font-black text-white mb-2">No AI Workspaces Yet</h2>
        <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
          Go to the <span className="font-bold text-indigo-400">AI Assistant</span> and ask it to analyze something.
          <br /><br />
          Try: <span className="italic text-slate-400">"Visualize team workload"</span> or <span className="italic text-slate-400">"Analyze leave impact"</span>
        </p>
        <div className="mt-5 flex flex-wrap gap-2 justify-center">
          {['Visualize team workload', 'Analyze leave impact', 'Show project risks', 'Full capacity report'].map(s => (
            <span key={s} className="text-xs px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
              "{s}"
            </span>
          ))}
        </div>
      </div>
    );
  }

  const group = groups[activeGroup] || groups[0];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow: '0 0 16px rgba(99,102,241,0.4)' }}>
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white leading-tight">AI Workspaces</h1>
            <p className="text-[10px] text-slate-500">{groups.length} workspace{groups.length > 1 ? 's' : ''} — 8-section dynamic dashboards</p>
          </div>
        </div>
        <button onClick={clearAll}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          <Trash2 size={11} /> Clear All
        </button>
      </div>

      {/* Session tabs */}
      <div className="flex items-center gap-0 rounded-2xl overflow-hidden p-1"
        style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)' }}>
        {groups.map((g, i) => (
          <button key={g.createdAt} onClick={() => setActiveGroup(i)}
            className="flex-1 flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all truncate"
            style={{
              background: activeGroup === i ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: activeGroup === i ? '#818cf8' : '#475569',
              border: activeGroup === i ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
            }}>
            <span className="truncate italic">"{g.prompt}"</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[9px] text-slate-600">
                {new Date(g.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button onClick={e => { e.stopPropagation(); removeGroup(g.createdAt); }}
                className="text-slate-600 hover:text-red-400 transition-colors p-0.5"><X size={10} /></button>
            </div>
          </button>
        ))}
      </div>

      {/* Active workspace — full 8-section layout */}
      {group && <WorkspaceRenderer items={group.items} onAction={handleAction} />}

      {/* Action confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}>
          <div className="rounded-2xl p-6 max-w-sm w-full"
            style={{ background: 'var(--card)', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 0 40px rgba(239,68,68,0.15)' }}>
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert size={18} color="#ef4444" />
              <p className="text-sm font-black text-white">Confirm Action</p>
            </div>
            <p className="text-sm text-slate-300 mb-1">You are about to execute:</p>
            <p className="text-sm font-bold text-white mb-1">"{confirmAction}"</p>
            <p className="text-xs text-slate-500 mb-5">This is a write action that modifies platform data. It cannot be undone automatically.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmAction(null)}
                className="flex-1 text-sm font-bold py-2 rounded-xl"
                style={{ background: 'rgba(120,120,120,0.12)', color: 'var(--t3)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
              <button onClick={() => { alert(`Action "${confirmAction}" would be executed here.`); setConfirmAction(null); }}
                className="flex-1 text-sm font-bold py-2 rounded-xl"
                style={{ background: '#ef4444', color: '#fff' }}>
                Confirm & Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



