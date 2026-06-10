import { useEffect, useRef, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface WeekCell {
  utilization: number;
  riskScore: number;
  status: 'available' | 'moderate' | 'high' | 'overloaded';
  taskHours: number;
  effectiveCapacity: number;
  leaveDays?: number;
  blockedCount?: number;
  taskCount: number;
  tasks?: { title: string; project: string; priority: string; hours: number; deadline: string }[];
}

interface EmployeeRow {
  id: string;
  name: string;
  role: string;
  department: string;
  overallUtilization: number;
  weeklyCapacityHours: number;
  currentAllocatedHours: number;
  weeks: WeekCell[];
}

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  priority: string;
  delayRiskScore: number;
  weeks: WeekCell[];
}

interface HeatmapData {
  generatedAt: string;
  weeks: { label: string; range: string }[];
  employees: EmployeeRow[];
  projects: ProjectRow[];
}

// ── Color helpers ────────────────────────────────────────────────────────────

const CELL_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  available:  { bg: 'rgba(34,197,94,0.15)',  text: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  moderate:   { bg: 'rgba(99,102,241,0.15)', text: '#818cf8', border: 'rgba(99,102,241,0.25)' },
  high:       { bg: 'rgba(245,158,11,0.2)',  text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  overloaded: { bg: 'rgba(239,68,68,0.2)',   text: '#f87171', border: 'rgba(239,68,68,0.3)' },
};

const RISK_BAR_COLOR: Record<string, string> = {
  available:  '#22c55e',
  moderate:   '#6366f1',
  high:       '#f59e0b',
  overloaded: '#ef4444',
};

// ── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ cell, name }: { cell: WeekCell; name: string }) {
  return (
    <div style={{
      position: 'absolute', zIndex: 100, top: '110%', left: '50%', transform: 'translateX(-50%)',
      minWidth: 220, maxWidth: 280,
      background: 'var(--card)', border: '1px solid var(--card-border)',
      borderRadius: 10, padding: '10px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      pointerEvents: 'none',
    }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--t1)', marginBottom: 6 }}>{name}</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--t3)' }}>Utilization: <strong style={{ color: RISK_BAR_COLOR[cell.status] }}>{cell.utilization}%</strong></span>
        <span style={{ fontSize: 11, color: 'var(--t3)' }}>Risk: <strong style={{ color: RISK_BAR_COLOR[cell.status] }}>{cell.riskScore}</strong></span>
        <span style={{ fontSize: 11, color: 'var(--t3)' }}>{cell.taskHours}h / {cell.effectiveCapacity}h cap</span>
      </div>
      {cell.leaveDays != null && cell.leaveDays > 0 && (
        <div style={{ fontSize: 10, color: '#f59e0b', marginBottom: 4 }}>⚠ {cell.leaveDays} leave day{cell.leaveDays > 1 ? 's' : ''} this week</div>
      )}
      {cell.blockedCount != null && cell.blockedCount > 0 && (
        <div style={{ fontSize: 10, color: '#f87171', marginBottom: 4 }}>🔴 {cell.blockedCount} blocked task{cell.blockedCount > 1 ? 's' : ''}</div>
      )}
      {cell.tasks && cell.tasks.length > 0 && (
        <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: 6, marginTop: 4 }}>
          {cell.tasks.map((t, i) => (
            <div key={i} style={{ fontSize: 10, color: 'var(--t2)', marginBottom: 2, display: 'flex', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
              <span style={{ color: 'var(--t4)', whiteSpace: 'nowrap' }}>{t.hours}h</span>
            </div>
          ))}
          {cell.taskCount > 5 && (
            <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>+{cell.taskCount - 5} more tasks</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Cell ─────────────────────────────────────────────────────────────────────

function HeatCell({ cell, rowName, showBar = true }: { cell: WeekCell; rowName: string; showBar?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const style = CELL_STYLE[cell.status] || CELL_STYLE.available;

  return (
    <td style={{ padding: '6px 4px', position: 'relative' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: style.bg, border: `1px solid ${style.border}`,
          borderRadius: 8, padding: '6px 8px', cursor: 'default',
          minWidth: 76, textAlign: 'center', position: 'relative',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: style.text }}>{cell.utilization}%</div>
        {showBar && (
          <div style={{ marginTop: 4, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: RISK_BAR_COLOR[cell.status],
              width: `${Math.min(100, cell.utilization)}%`,
              transition: 'width 0.4s',
            }} />
          </div>
        )}
        <div style={{ fontSize: 9, color: 'var(--t4)', marginTop: 2 }}>{cell.taskCount} task{cell.taskCount !== 1 ? 's' : ''}</div>
        {hovered && <Tooltip cell={cell} name={rowName} />}
      </div>
    </td>
  );
}

// ── Sync indicator ────────────────────────────────────────────────────────────

function SyncDot({ syncing, lastSynced }: { syncing: boolean; lastSynced: Date | null }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);
  const secs = lastSynced ? Math.floor((Date.now() - lastSynced.getTime()) / 1000) : null;
  const label = syncing ? 'Syncing…' : secs == null ? 'Live' : secs < 10 ? 'just now' : secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ago`;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--t3)' }}>
      {syncing
        ? <span style={{ width: 6, height: 6, borderRadius: '50%', border: '1.5px solid #818cf8', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
        : <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'hmPulse 2s ease-in-out infinite' }} />}
      {syncing ? 'Syncing…' : `Synced ${label}`}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Heatmap() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [view, setView] = useState<'employees' | 'projects'>('employees');
  const [dept, setDept] = useState('All');
  const [tooltip] = useState<string | null>(null);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHeatmap = async (silent = false) => {
    if (silent) setSyncing(true);
    else setLoading(true);
    try {
      const res = await fetch('/api/heatmap');
      if (!res.ok) throw new Error('Failed');
      const d: HeatmapData = await res.json();
      setData(d);
      setLastSynced(new Date());
    } catch (e) {
      console.error('[Heatmap]', e);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchHeatmap(false);
    pollerRef.current = setInterval(() => fetchHeatmap(true), 30_000);
    return () => { if (pollerRef.current) clearInterval(pollerRef.current); };
  }, []);

  const depts = data ? ['All', ...Array.from(new Set(data.employees.map(e => e.department)))] : ['All'];
  const empRows = data
    ? (dept === 'All' ? data.employees : data.employees.filter(e => e.department === dept))
    : [];
  const projRows = data?.projects ?? [];

  // ── summary stats ───────────────────────────────────────────────────────────
  const overloaded   = empRows.filter(e => e.overallUtilization >= 100).length;
  const highLoad     = empRows.filter(e => e.overallUtilization >= 80 && e.overallUtilization < 100).length;
  const available    = empRows.filter(e => e.overallUtilization < 50).length;
  const avgUtil      = empRows.length ? Math.round(empRows.reduce((s, e) => s + e.overallUtilization, 0) / empRows.length) : 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '3rem', color: 'var(--t3)', fontSize: 14 }}>
        <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--card-border)', borderTopColor: '#818cf8', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
        Loading heatmap…
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes hmPulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes hmPulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--t1)' }}>Workload Heatmap</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--t3)' }}>
            Real-time load forecast · 4-week window · deadline-weighted
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SyncDot syncing={syncing} lastSynced={lastSynced} />
          <button
            onClick={() => fetchHeatmap(true)}
            disabled={syncing}
            style={{
              background: 'var(--bg-sub)', border: '1px solid var(--card-border)',
              borderRadius: 8, padding: '5px 12px', fontSize: 12, color: 'var(--t2)', cursor: 'pointer',
              opacity: syncing ? 0.4 : 1,
            }}
          >↻ Refresh</button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        {[
          { label: 'Avg Utilization', val: `${avgUtil}%`,    color: avgUtil > 85 ? '#f87171' : avgUtil > 65 ? '#fbbf24' : '#4ade80' },
          { label: 'Overloaded',      val: String(overloaded), color: overloaded > 0 ? '#f87171' : '#4ade80' },
          { label: 'High Load',       val: String(highLoad),   color: highLoad > 0  ? '#fbbf24' : '#4ade80' },
          { label: 'Available',       val: String(available),  color: '#4ade80' },
        ].map(k => (
          <div key={k.label} style={{
            background: 'var(--card)', border: '1px solid var(--card-border)',
            borderRadius: 10, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* View toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-sub)', border: '1px solid var(--card-border)', borderRadius: 8, overflow: 'hidden' }}>
          {(['employees', 'projects'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{
                padding: '5px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
                background: view === v ? '#6366f1' : 'transparent',
                color: view === v ? '#fff' : 'var(--t3)',
              }}
            >{v === 'employees' ? 'By Employee' : 'By Project'}</button>
          ))}
        </div>

        {/* Dept filter (employees only) */}
        {view === 'employees' && (
          <select
            value={dept}
            onChange={e => setDept(e.target.value)}
            style={{
              background: 'var(--card)', border: '1px solid var(--card-border)',
              borderRadius: 8, padding: '5px 10px', fontSize: 12, color: 'var(--t2)',
              cursor: 'pointer', outline: 'none',
            }}
          >
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--card-border)', background: 'var(--card)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
                {view === 'employees' ? 'Employee' : 'Project'}
              </th>
              {(data?.weeks ?? []).map(w => (
                <th key={w.label} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.04em', minWidth: 100 }}>
                  <div>{w.label}</div>
                  <div style={{ fontSize: 9, fontWeight: 400, color: 'var(--t4)', marginTop: 1 }}>{w.range}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view === 'employees' && empRows.map(emp => (
              <tr key={emp.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: '#fff',
                    }}>
                      {emp.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{emp.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--t4)' }}>{emp.role} · {emp.department}</div>
                    </div>
                    {emp.overallUtilization >= 100 && (
                      <span style={{ fontSize: 9, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 99, padding: '1px 6px', fontWeight: 700 }}>OVER</span>
                    )}
                  </div>
                </td>
                {emp.weeks.map((cell, wi) => (
                  <HeatCell key={wi} cell={cell} rowName={emp.name} />
                ))}
              </tr>
            ))}

            {view === 'projects' && projRows.map(proj => (
              <tr key={proj.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{proj.name}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 10, color: proj.status === 'Active' ? '#4ade80' : 'var(--t4)' }}>{proj.status}</span>
                    {proj.delayRiskScore > 50 && (
                      <span style={{ fontSize: 9, background: 'rgba(239,68,68,0.1)', color: '#f87171', borderRadius: 99, padding: '1px 5px', fontWeight: 700 }}>
                        {proj.delayRiskScore}% risk
                      </span>
                    )}
                  </div>
                </td>
                {proj.weeks.map((cell, wi) => (
                  <HeatCell key={wi} cell={cell} rowName={proj.name} showBar={false} />
                ))}
              </tr>
            ))}

            {view === 'employees' && empRows.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>No employees found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Available (<50%)', color: '#22c55e' },
          { label: 'Moderate (50-80%)', color: '#6366f1' },
          { label: 'High (80-100%)', color: '#f59e0b' },
          { label: 'Overloaded (>100%)', color: '#ef4444' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--t3)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
            {l.label}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t4)' }}>
          Hover any cell for task breakdown · auto-refreshes every 30s
        </div>
      </div>

      {/* ── Formula explainer ── */}
      <details style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '10px 14px' }}>
        <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>How is weight calculated?</summary>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--t3)', lineHeight: 1.7 }}>
          <p><strong style={{ color: 'var(--t1)' }}>Employee utilization per week</strong></p>
          <code style={{ display: 'block', background: 'var(--card)', borderRadius: 6, padding: '8px 10px', margin: '4px 0', fontSize: 11, color: '#818cf8' }}>
            taskHours = Σ (estimatedHours × remaining%) for tasks with deadline in that week{'\n'}
            remaining% = 1 − (progressPercentage / 100){'\n'}
            leaveHours = leaveDaysThisWeek × (weeklyCapacity / 5){'\n'}
            effectiveCapacity = weeklyCapacity − leaveHours{'\n'}
            utilization% = taskHours / effectiveCapacity × 100
          </code>
          <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--t1)' }}>Risk score (0–100)</strong></p>
          <code style={{ display: 'block', background: 'var(--card)', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#818cf8' }}>
            riskScore = utilization × 0.6 + (overdueTaskCount × 10) + (leavePresent ? 10 : 0)
          </code>
          <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--t1)' }}>Project utilization per week</strong></p>
          <code style={{ display: 'block', background: 'var(--card)', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#818cf8' }}>
            projectLoad% = totalTaskHoursDueThisWeek / totalAssignedEmployeeCapacity × 100
          </code>
          <p style={{ marginTop: 6, fontSize: 11, color: 'var(--t4)' }}>
            Current week blends live <em>currentAllocatedHours</em> with deadline-projected hours (50/50).
            Future weeks are purely deadline-projected.
          </p>
        </div>
      </details>
    </div>
  );
}
