import { useEffect, useState } from 'react';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    Overloaded: { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' },
    Moderate:   { background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.25)' },
    Balanced:   { background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' },
    Available:  { background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' },
  };
  return (
    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={styles[status] || { background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>
      {status}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    Urgent: 'bg-red-500',
    High: 'bg-orange-400',
    Medium: 'bg-yellow-400',
    Low: 'bg-slate-500',
  };
  return <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${colors[priority] || 'bg-slate-500'}`}></span>;
}

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [workload, setWorkload] = useState<any[]>([]);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [showOverloadModal, setShowOverloadModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showOnLeaveTodayModal, setShowOnLeaveTodayModal] = useState(false);
  const [showLeaveTrackingModal, setShowLeaveTrackingModal] = useState(false);
  const [showBurnoutModal, setShowBurnoutModal] = useState(false);
  const [showRebalanceModal, setShowRebalanceModal] = useState(false);
  const [projectRisks, setProjectRisks] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [burnoutData, setBurnoutData] = useState<any[]>([]);
  const [rebalanceSuggestions, setRebalanceSuggestions] = useState<any[]>([]);
  const [confidenceData, setConfidenceData] = useState<any[]>([]);
  const [showConfidenceModal, setShowConfidenceModal] = useState(false);
  const [skillGaps, setSkillGaps] = useState<any[]>([]);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [spilloverData, setSpilloverData] = useState<any[]>([]);
  const [standupData, setStandupData] = useState<any>(null);
  const [showSpilloverModal, setShowSpilloverModal] = useState(false);
  const [showStandupModal, setShowStandupModal] = useState(false);
  const [financeData, setFinanceData] = useState<any[]>([]);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [graphData, setGraphData] = useState<any>({});
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [showAllEmployeesModal, setShowAllEmployeesModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('rebalance') === 'true') {
      setShowRebalanceModal(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    fetch('/api/v1/recommendations/rebalance')
      .then(r => r.json())
      .then(data => setRebalanceSuggestions(Array.isArray(data) ? data : []))
      .catch(console.error);
    fetch('/api/v1/analytics/delivery-confidence')
      .then(r => r.json())
      .then(data => setConfidenceData(Array.isArray(data) ? data : []))
      .catch(console.error);
    fetch('/api/v1/skills/gaps')
      .then(r => r.json())
      .then(data => setSkillGaps(Array.isArray(data) ? data : []))
      .catch(console.error);
    fetch('/api/v1/scrum/spillover')
      .then(r => r.json())
      .then(data => setSpilloverData(Array.isArray(data) ? data : []))
      .catch(console.error);
    fetch('/api/v1/scrum/standup')
      .then(r => r.json())
      .then(data => setStandupData(data))
      .catch(console.error);
    fetch('/api/v1/finance/projects')
      .then(r => r.json())
      .then(data => setFinanceData(Array.isArray(data) ? data : []))
      .catch(console.error);
    fetch('/api/v1/graph/data')
      .then(r => r.json())
      .then(data => setGraphData(data))
      .catch(console.error);
    fetch('/v1/analytics/burnout')
      .then(r => r.json())
      .then(data => setBurnoutData(Array.isArray(data) ? data : []))
      .catch(console.error);
    fetch('/api/dashboard/summary')
      .then(r => r.json())
      .then(res => {
        // Handle both raw data and enveloped data
        const data = res.success ? res.data : res;
        setSummary(data);
      })
      .catch(err => {
        console.error('Summary fetch failed:', err);
        setSummary({ totalEmployees: 0, overloadedEmployees: 0, totalActiveTasks: 0, atRiskProjects: 0 });
      });

    fetch('/api/dashboard/workload')
      .then(r => r.json())
      .then(res => {
        const data = res.success ? res.data : res;
        setWorkload(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('Workload fetch failed:', err);
        setWorkload([]);
      });

    fetch('/api/dashboard/project-risks')
      .then(r => r.json())
      .then(res => {
        const data = res.success ? res.data : res;
        setProjectRisks(Array.isArray(data) ? data : []);
      })
      .catch(console.error);

    fetch('/api/tasks')
      .then(r => r.json())
      .then(res => {
        const data = res.success ? res.data : res;
        setAllTasks(Array.isArray(data) ? data : []);
      })
      .catch(console.error);

    fetch('/api/dashboard/leaves/all')
      .then(r => r.json())
      .then(res => {
        const data = res.success ? res.data : res;
        setAllLeaves(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
  }, []);

  const handleApproveRebalance = (suggestion: any) => {
    fetch(`/api/tasks/${suggestion.taskId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: suggestion.toEmployeeId })
    })
      .then(r => r.json())
      .then(() => {
        setRebalanceSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        fetch('/api/dashboard/workload').then(r => r.json()).then(res => {
          const data = res.success ? res.data : res;
          setWorkload(Array.isArray(data) ? data : []);
        }).catch(console.error);
      })
      .catch(console.error);
  };

  const handleRejectRebalance = (id: string) => {
    setRebalanceSuggestions(prev => prev.filter(s => s.id !== id));
  };

  if (!summary) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: '#6366f1' }} />
        <p className="text-slate-500 text-sm">Loading dashboard...</p>
      </div>
    </div>
  );

  const overloaded = workload.filter(e => e.status === 'Overloaded');

  const kpiCards = [
    { label: 'Total Employees',     value: summary.totalEmployees,                                                    neon: '#4f46e5', onClick: () => setShowAllEmployeesModal(true) },
    { label: 'Overloaded',          value: summary.overloadedEmployees,                                               neon: '#dc2626', onClick: () => setShowOverloadModal(true) },
    { label: 'Active Tasks',        value: summary.totalActiveTasks,                                                  neon: '#0891b2', onClick: () => setShowTasksModal(true) },
    { label: 'At-Risk Projects',    value: summary.atRiskProjects,                                                    neon: '#d97706', onClick: () => setShowRiskModal(true) },
    { label: 'On Leave Today',      value: workload.filter(e => e.onLeave).length,                                    neon: '#059669', onClick: () => setShowOnLeaveTodayModal(true) },
    { label: 'Leave Requests',      value: allLeaves.length,                                                          neon: '#7c3aed', onClick: () => setShowLeaveTrackingModal(true) },
    { label: 'Burnout Risk',        value: burnoutData.filter(e => e.riskLevel === 'High').length,                    neon: '#be123c', onClick: () => setShowBurnoutModal(true) },
    { label: 'Delivery Confidence', value: confidenceData.length > 0 ? Math.round(confidenceData.reduce((s,c) => s + c.confidenceScore, 0) / confidenceData.length) + '%' : 'N/A', neon: '#047857', onClick: () => setShowConfidenceModal(true) },
    { label: 'Skill Gaps',          value: skillGaps.length,                                                          neon: '#b45309', onClick: () => setShowSkillsModal(true) },
    { label: 'Spillover Risk',      value: spilloverData.length,                                                      neon: '#ea580c', onClick: () => setShowSpilloverModal(true) },
    { label: 'Knowledge Graph',     value: graphData.nodes?.length || 0,                                              neon: '#6d28d9', onClick: () => setShowGraphModal(true) },
  ];

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: 'var(--t1)', letterSpacing: '-0.3px', marginBottom: 4 }}>
            Command Center
          </h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', fontWeight: 300 }}>Real-time workforce intelligence & capacity overview</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--t3)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)', animation: 'blink 2s infinite' }} />
          Live
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {kpiCards.map((card, i) => (
          <div key={i} onClick={card.onClick}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--card-border)',
              borderRadius: 14,
              boxShadow: 'var(--card-shadow)',
              padding: '18px 20px',
              cursor: 'pointer',
              transition: 'box-shadow 0.18s, transform 0.18s',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow-h)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <div style={{ position: 'absolute', inset: '0 0 auto 0', height: 3, background: `linear-gradient(90deg, transparent, ${card.neon}, transparent)` }} />
            <div style={{ position: 'absolute', right: 14, top: 16, width: 9, height: 9, borderRadius: 999, background: card.neon, boxShadow: `0 0 0 4px ${card.neon}18` }} />
            {/* Label */}
            <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              {card.label}
            </p>
            {/* Value */}
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 34, fontWeight: 400, color: 'var(--t1)', lineHeight: 1, letterSpacing: '-0.5px' }}>
              {card.value}
            </p>
            <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6, fontWeight: 300 }}>View details →</p>
          </div>
        ))}
      </div>



      {/* All Employees Modal */}
      {showAllEmployeesModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 24px 80px rgba(0,0,0,0.6)' }}>
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-indigo-500/10">
              <div>
                <h2 className="text-xl font-bold text-indigo-300 flex items-center gap-2">👥 All Employees</h2>
                <p className="text-sm text-indigo-600 mt-0.5">{workload.length} team members across all departments</p>
              </div>
              <button onClick={() => setShowAllEmployeesModal(false)} className="text-gray-400 hover:text-slate-300 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500 uppercase font-semibold sticky top-0" style={{ background: 'var(--card)' }}>
                  <tr className="border-b border-white/5">
                    <th className="p-3 text-left">Employee</th>
                    <th className="p-3 text-left">Department</th>
                    <th className="p-3 text-left">Role</th>
                    <th className="p-3 text-center">Tasks</th>
                    <th className="p-3 text-center">Utilization</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {workload.map(emp => (
                    <tr key={emp.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>{emp.name.charAt(0)}</div>
                          <span className="font-semibold text-slate-100">{emp.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-400">{emp.department}</td>
                      <td className="p-3 text-slate-400">{emp.role}</td>
                      <td className="p-3 text-center font-bold text-slate-300">{emp.activeTaskCount}</td>
                      <td className="p-3 text-center">
                        <span className="font-bold text-sm"
                          style={{ color: emp.utilizationPercentage >= 100 ? '#f87171' : emp.utilizationPercentage >= 80 ? '#fb923c' : '#34d399' }}>
                          {emp.utilizationPercentage}%
                        </span>
                      </td>
                      <td className="p-3 text-center"><StatusBadge status={emp.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Overload Drill-Down Modal */}
      {showOverloadModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 24px 80px rgba(0,0,0,0.6)' }}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-red-500/10">
              <div>
                <h2 className="text-xl font-bold text-red-300 flex items-center gap-2">
                  <span>🚨</span> Overloaded Resource Analysis
                </h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(239,68,68,0.6)' }}>Personnel currently exceeding 100% weekly capacity</p>
              </div>
              <button onClick={() => setShowOverloadModal(false)} className="text-gray-400 hover:text-slate-300 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4">
              <table className="w-full">
                <thead className="text-xs text-slate-500 uppercase font-semibold">
                  <tr className="border-b border-white/5">
                    <th className="p-3 text-left">Employee</th>
                    <th className="p-3 text-left">Utilization</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {overloaded.map(emp => (
                    <tr key={emp.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>{emp.name.charAt(0)}</div>
                          <div>
                            <p className="font-bold text-slate-100 text-sm">{emp.name}</p>
                            <p className="text-xs text-slate-400">{emp.role}</p>
                          </div>
                        </div>
                        {/* List Tasks causing overload */}
                        <div className="mt-2 ml-11 space-y-1">
                          {emp.activeTasks && emp.activeTasks.length > 0 ? (
                            emp.activeTasks.map((task: any) => (
                              <div key={task.id} className="flex justify-between items-center text-xs p-1.5 rounded border border-white/5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                <span className="text-slate-300 font-medium">{task.title}</span>
                                <a href={`/tasks?taskId=${task.id}`} className="hover:underline font-bold text-[10px] uppercase px-1.5 py-0.5 rounded" style={{ color: '#818cf8', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>Reassign</a>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-400 italic">No active tasks causing overload.</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-red-400">{emp.utilizationPercentage}%</span>
                          <span className="text-xs text-gray-400">({emp.allocatedHours}/{emp.capacityHours}h)</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-xs text-gray-400">Manage tasks below</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-white/5 text-right">
              <button onClick={() => setShowOverloadModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/[0.06] transition-all border border-white/10 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Project Risks Drill-Down Modal */}
      {showRiskModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 24px 80px rgba(0,0,0,0.6)' }}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center" style={{ background: 'rgba(249,115,22,0.08)' }}>
              <div>
                <h2 className="text-xl font-bold text-orange-400 flex items-center gap-2">
                  <span>⚠️</span> At-Risk Project Intelligence
                </h2>
                <p className="text-sm text-orange-500/70 mt-1">High-probability delay alerts based on resource constraints</p>
              </div>
              <button onClick={() => setShowRiskModal(false)} className="text-gray-400 hover:text-slate-300 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4 space-y-4">
              {projectRisks.filter(p => p.delayProbability > 25).sort((a,b) => b.delayProbability - a.delayProbability).map(proj => (
                <div key={proj.id} className="p-4 rounded-xl flex flex-col md:flex-row gap-4 items-start" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(249,115,22,0.2)' }}>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-100 text-lg">{proj.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full" style={proj.riskLevel === 'Critical' ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' } : { background: 'rgba(249,115,22,0.15)', color: '#fb923c' }}>
                        {proj.riskLevel} Risk
                      </span>
                      <span className="text-sm font-bold text-slate-400">{proj.delayProbability}% Delay Prob.</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {proj.riskReasons.map((r: string, i: number) => (
                        <p key={i} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="text-red-400 mt-0.5">•</span> {r}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="md:w-64 space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Mitigation</p>
                    {proj.mitigationActions.map((act: string, i: number) => (
                      <button key={i} className="w-full text-left text-xs p-2 rounded-lg transition-colors font-medium text-indigo-300" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        ✨ {act}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {projectRisks.filter(p => p.delayProbability > 25).length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">✅</p>
                  <p>All projects currently on track with healthy resource buffers.</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/5 text-right">
              <button onClick={() => setShowRiskModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/[0.06] transition-all border border-white/10">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Active Tasks Drill-Down Modal */}
      {showTasksModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 24px 80px rgba(0,0,0,0.6)' }}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center" style={{ background: 'rgba(34,211,238,0.07)' }}>
              <div>
                <h2 className="text-xl font-bold text-cyan-300 flex items-center gap-2">
                  <span>⚡</span> Live Task Inventory
                </h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(34,211,238,0.6)' }}>Full breakdown of all work items currently in progress</p>
              </div>
              <button onClick={() => setShowTasksModal(false)} className="text-gray-400 hover:text-slate-300 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-gray-400 border-b border-white/5">
                  <tr>
                    <th className="p-4 font-bold">Task Title</th>
                    <th className="p-4 font-bold">Assignee</th>
                    <th className="p-4 font-bold">Project</th>
                    <th className="p-4 font-bold">Deadline</th>
                    <th className="p-4 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {allTasks.filter(t => t.status !== 'Completed').map(task => (
                    <tr key={task.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-100 text-sm">{task.title}</p>
                        <p className="text-[10px] text-slate-400 uppercase mt-0.5">{task.taskType}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                            {task.assignedEmployee?.name?.charAt(0) || '?'}
                          </div>
                          <span className="text-sm text-slate-300 font-medium">{task.assignedEmployee?.name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-300">{task.project?.name}</td>
                      <td className="p-4 text-sm text-slate-400 font-medium">{new Date(task.deadline).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full" style={task.status === 'In Progress' ? { background: 'rgba(99,102,241,0.15)', color: '#818cf8' } : { background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-white/5 text-right">
              <button onClick={() => setShowTasksModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/[0.06] transition-all border border-white/10">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* On Leave Today Modal */}
      {showOnLeaveTodayModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 24px 80px rgba(0,0,0,0.6)' }}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center" style={{ background: 'rgba(245,158,11,0.08)' }}>
              <div>
                <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                  <span>🌴</span> On Leave Today
                </h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(245,158,11,0.6)' }}>Personnel currently away</p>
              </div>
              <button onClick={() => setShowOnLeaveTodayModal(false)} className="text-gray-400 hover:text-slate-300 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4 space-y-3">
              {workload.filter(e => e.onLeave).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8 italic">Full team is present today! ✅</p>
              )}
              {workload.filter(e => e.onLeave).map(emp => (
                <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>{emp.name.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-bold text-slate-100">{emp.name}</p>
                      <p className="text-[10px] text-slate-400">{emp.role}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}>Away</span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-white/5 text-right">
              <button onClick={() => setShowOnLeaveTodayModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/[0.06] transition-all border border-white/10 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Burnout Risk Modal */}
      {showBurnoutModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 24px 80px rgba(0,0,0,0.6)' }}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center" style={{ background: 'rgba(239,68,68,0.07)' }}>
              <div>
                <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
                  <span>🔥</span> Burnout & Fatigue Risk Analysis
                </h2>
                <p className="text-sm text-red-500/70 mt-1">Employees at risk based on workload, complexity, and recovery time</p>
              </div>
              <button onClick={() => setShowBurnoutModal(false)} className="text-gray-400 hover:text-slate-300 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4 space-y-4">
              {burnoutData.map(emp => {
                const borderStyle = emp.riskLevel === 'High' ? 'rgba(239,68,68,0.25)' : emp.riskLevel === 'Medium' ? 'rgba(249,115,22,0.2)' : 'rgba(52,211,153,0.2)';
                const bgStyle = emp.riskLevel === 'High' ? 'rgba(239,68,68,0.07)' : emp.riskLevel === 'Medium' ? 'rgba(249,115,22,0.06)' : 'rgba(52,211,153,0.06)';

                return (
                  <div key={emp.employeeId} className="p-4 rounded-xl flex flex-col md:flex-row gap-4 items-start" style={{ background: bgStyle, border: `1px solid ${borderStyle}` }}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={emp.riskLevel === 'High' ? { background: 'rgba(239,68,68,0.2)', color: '#f87171' } : { background: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-100 text-lg">{emp.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full" style={emp.riskLevel === 'High' ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' } : { background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                              {emp.riskLevel} Risk
                            </span>
                            <span className="text-sm font-bold text-slate-500">Score: {emp.burnoutScore}/100</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        {emp.reasons.map((r: string, i: number) => (
                          <p key={i} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-red-400 mt-0.5">•</span> {r}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="md:w-64 space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Suggested Actions</p>
                      {emp.suggestedActions.map((act: string, i: number) => (
                        <div key={i} className="text-xs p-2 rounded-lg font-medium text-slate-300" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          ✨ {act}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {burnoutData.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">🎈</p>
                  <p>All employees have healthy workloads and adequate recovery time.</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/5 text-right">
              <button onClick={() => setShowBurnoutModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/[0.06] transition-all border border-white/10">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Autonomous Rebalancing Modal */}
      {showRebalanceModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 24px 80px rgba(0,0,0,0.6)' }}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-indigo-500/10">
              <div>
                <h2 className="text-xl font-bold text-indigo-300 flex items-center gap-2">
                  <span>⚖️</span> Autonomous Resource Rebalancing
                </h2>
                <p className="text-sm text-indigo-600 mt-1">AI-generated suggestions to redistribute workload from overloaded employees</p>
              </div>
              <button onClick={() => setShowRebalanceModal(false)} className="text-gray-400 hover:text-slate-300 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4 space-y-4">
              {rebalanceSuggestions.map(sug => (
                <div key={sug.id} className="p-4 rounded-xl border border-white/8 space-y-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-100">{sug.taskTitle}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Task ID: {sug.taskId}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>Suggestion</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <p className="text-xs text-red-400 font-semibold mb-1">Move From</p>
                      <p className="font-bold text-slate-100">{sug.fromEmployeeName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">Utilization:</span>
                        <span className="font-bold text-red-400">{sug.fromUtilizationBefore}%</span>
                        <span className="text-slate-500">→</span>
                        <span className="font-bold text-emerald-400">{sug.fromUtilizationAfter}%</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                      <p className="text-xs text-emerald-400 font-semibold mb-1">Move To</p>
                      <p className="font-bold text-slate-100">{sug.toEmployeeName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">Utilization:</span>
                        <span className="font-bold text-slate-300">{sug.toUtilizationBefore}%</span>
                        <span className="text-slate-500">→</span>
                        <span className="font-bold text-emerald-400">{sug.toUtilizationAfter}%</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 p-2 rounded-lg border border-white/5" style={{ background: 'rgba(255,255,255,0.04)' }}>{sug.reason}</p>

                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => handleRejectRebalance(sug.id)}
                      className="text-xs text-slate-300 px-3 py-1.5 rounded-lg font-semibold transition-all hover:bg-white/[0.06]" style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => handleApproveRebalance(sug)}
                      className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-100 transition-all"
                    >
                      Approve & Reassign
                    </button>
                  </div>
                </div>
              ))}
              {rebalanceSuggestions.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">⚖️</p>
                  <p>No rebalancing needed. Team workload is well distributed.</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/5 text-right">
              <button onClick={() => setShowRebalanceModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/[0.06] transition-all border border-white/10 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Confidence Modal */}
      {showConfidenceModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 24px 80px rgba(0,0,0,0.6)' }}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center" style={{ background: 'rgba(52,211,153,0.07)' }}>
              <div>
                <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                  <span>🎯</span> Delivery Confidence Index
                </h2>
                <p className="text-sm text-emerald-500/70 mt-1">Project delivery confidence based on risk, capacity, and velocity</p>
              </div>
              <button onClick={() => setShowConfidenceModal(false)} className="text-gray-400 hover:text-slate-300 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4 space-y-4">
              {confidenceData.map(proj => {
                const color = proj.confidenceScore >= 90 ? '#34d399' : proj.confidenceScore >= 70 ? '#818cf8' : proj.confidenceScore >= 40 ? '#fb923c' : '#f87171';
                const bgStyle = proj.confidenceScore >= 90 ? 'rgba(52,211,153,0.12)' : proj.confidenceScore >= 70 ? 'rgba(99,102,241,0.12)' : proj.confidenceScore >= 40 ? 'rgba(249,115,22,0.12)' : 'rgba(239,68,68,0.12)';

                return (
                  <div key={proj.projectId} className="p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center" style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)' }}>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-100 text-lg">{proj.projectName}</h3>
                      <p className="text-xs text-slate-300 mt-1">{proj.explanation}</p>
                    </div>
                    <div className="w-24 h-24 rounded-full flex flex-col items-center justify-center" style={{ background: bgStyle, border: `2px solid ${color}40` }}>
                      <span className="text-2xl font-bold" style={{ color }}>{proj.confidenceScore}%</span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{proj.confidenceLevel.split(' ')[0]}</span>
                    </div>
                  </div>
                );
              })}
              {confidenceData.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">🎯</p>
                  <p>No project data available.</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/5 text-right">
              <button onClick={() => setShowConfidenceModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/[0.06] transition-all border border-white/10 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Skill Gaps Modal */}
      {showSkillsModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 24px 80px rgba(0,0,0,0.6)' }}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center" style={{ background: 'rgba(245,158,11,0.07)' }}>
              <div>
                <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                  <span>🎓</span> Predicted Skill Gaps
                </h2>
                <p className="text-sm text-amber-500/70 mt-1">Skills required by active tasks but low in team capacity</p>
              </div>
              <button onClick={() => setShowSkillsModal(false)} className="text-gray-400 hover:text-slate-300 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4 space-y-4">
              {skillGaps.map(gap => {
                const color = gap.riskLevel === 'High' ? '#f87171' : '#fb923c';
                const bgStyle = gap.riskLevel === 'High' ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)';

                return (
                  <div key={gap.skillId} className="p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center" style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)' }}>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-100 text-lg">{gap.skillName}</h3>
                      <p className="text-xs text-slate-300 mt-1">Required in {gap.requiredInTasks} active tasks.</p>
                    </div>
                    <div className="w-24 h-24 rounded-full flex flex-col items-center justify-center" style={{ background: bgStyle, border: `2px solid ${color}40` }}>
                      <span className="text-2xl font-bold" style={{ color }}>{gap.expertsAvailable}</span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">Experts</span>
                    </div>
                  </div>
                );
              })}
              {skillGaps.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">🎓</p>
                  <p>No critical skill gaps detected. Team is well-skilled for current tasks.</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/5 text-right">
              <button onClick={() => setShowSkillsModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/[0.06] transition-all border border-white/10 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Spillover Modal */}
      {showSpilloverModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 24px 80px rgba(0,0,0,0.6)' }}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center" style={{ background: 'rgba(249,115,22,0.07)' }}>
              <div>
                <h2 className="text-xl font-bold text-orange-400 flex items-center gap-2">
                  <span>⏳</span> Spillover Risk Prediction
                </h2>
                <p className="text-sm text-orange-500/70 mt-1">Tasks predicted to exceed their deadline based on current progress</p>
              </div>
              <button onClick={() => setShowSpilloverModal(false)} className="text-gray-400 hover:text-slate-300 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4 space-y-4">
              {spilloverData.map(task => (
                <div key={task.taskId} className="p-4 rounded-xl" style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-100">{task.title}</h3>
                      <p className="text-xs text-slate-400">{task.projectName} • {task.assignee}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={task.riskLevel === 'High' ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' } : { background: 'rgba(249,115,22,0.15)', color: '#fb923c' }}>
                      {task.riskLevel} Risk
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-300">
                    <p>Hours Remaining: <span className="font-semibold">{task.hoursRemaining}h</span></p>
                    <p>Hours Available: <span className="font-semibold">{task.hoursAvailable}h</span></p>
                  </div>
                </div>
              ))}
              {spilloverData.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">⏳</p>
                  <p>No tasks at risk of spillover. Everything is on track!</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/5 text-right">
              <button onClick={() => setShowSpilloverModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/[0.06] transition-all border border-white/10 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Standup Modal */}
      {showStandupModal && standupData && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 24px 80px rgba(0,0,0,0.6)' }}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center" style={{ background: 'rgba(99,102,241,0.08)' }}>
              <div>
                <h2 className="text-xl font-bold text-indigo-300 flex items-center gap-2">
                  <span>🗣️</span> AI Daily Standup Summary
                </h2>
                <p className="text-sm text-indigo-400/70 mt-1">Automated summary of team progress and blockers</p>
              </div>
              <button onClick={() => setShowStandupModal(false)} className="text-gray-400 hover:text-slate-300 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-6 space-y-6">
              <div>
                <h3 className="font-bold text-emerald-400 flex items-center gap-2 mb-2">
                  <span>✅</span> Completed (Last 24h)
                </h3>
                <div className="space-y-2">
                  {standupData.completedYesterday.map((t: any, i: number) => (
                    <div key={i} className="text-sm text-slate-300 p-2 rounded-lg" style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.15)' }}>
                      <span className="font-medium">{t.title}</span> <span className="text-slate-500">({t.assignee})</span>
                    </div>
                  ))}
                  {standupData.completedYesterday.length === 0 && <p className="text-sm text-slate-500">No tasks completed yesterday.</p>}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-indigo-400 flex items-center gap-2 mb-2">
                  <span>🚀</span> In Progress
                </h3>
                <div className="space-y-2">
                  {standupData.inProgress.map((t: any, i: number) => (
                    <div key={i} className="text-sm text-slate-300 p-2 rounded-lg flex justify-between items-center" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)' }}>
                      <span><span className="font-medium">{t.title}</span> <span className="text-slate-500">({t.assignee})</span></span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>{t.progress}%</span>
                    </div>
                  ))}
                  {standupData.inProgress.length === 0 && <p className="text-sm text-slate-500">No tasks in progress.</p>}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-red-400 flex items-center gap-2 mb-2">
                  <span>🚫</span> Blocked
                </h3>
                <div className="space-y-2">
                  {standupData.blocked.map((t: any, i: number) => (
                    <div key={i} className="text-sm text-slate-300 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <span className="font-medium">{t.title}</span> <span className="text-slate-500">({t.assignee})</span>
                    </div>
                  ))}
                  {standupData.blocked.length === 0 && <p className="text-sm text-slate-500">No blocked tasks. Great!</p>}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-white/5 text-right">
              <button onClick={() => setShowStandupModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/[0.06] transition-all border border-white/10 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Finance Modal */}
      {showFinanceModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 24px 80px rgba(0,0,0,0.6)' }}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center" style={{ background: 'rgba(239,68,68,0.07)' }}>
              <div>
                <h2 className="text-xl font-bold text-red-300 flex items-center gap-2">
                  <span>💰</span> Financial Overview
                </h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(239,68,68,0.6)' }}>Project budgets vs actual costs</p>
              </div>
              <button onClick={() => setShowFinanceModal(false)} className="text-gray-400 hover:text-slate-300 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead className="text-[11px] uppercase tracking-widest text-gray-400 border-b border-white/5" style={{ background: 'var(--card)' }}>
                  <tr>
                    <th className="p-4 font-semibold">Project</th>
                    <th className="p-4 font-semibold">Budget</th>
                    <th className="p-4 font-semibold">Current Cost</th>
                    <th className="p-4 font-semibold">Variance</th>
                    <th className="p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {financeData.map(p => (
                    <tr key={p.projectId} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                      <td className="p-4 font-semibold text-slate-100">{p.projectName}</td>
                      <td className="p-4 text-sm text-slate-300">${p.budget.toLocaleString()}</td>
                      <td className="p-4 text-sm text-slate-300">${p.currentCost.toLocaleString()}</td>
                      <td className="p-4 text-sm font-semibold" style={{ color: p.variance < 0 ? '#f87171' : '#34d399' }}>
                        ${p.variance.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={p.isOverBudget
                            ? { background: 'rgba(239,68,68,0.12)', color: '#f87171' }
                            : { background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                          {p.isOverBudget ? 'Over Budget' : 'On Track'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-white/5 text-right">
              <button onClick={() => setShowFinanceModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/[0.06] transition-all border border-white/10 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Graph Modal */}
      {showGraphModal && graphData.nodes && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 24px 80px rgba(0,0,0,0.6)' }}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center" style={{ background: 'rgba(168,85,247,0.08)' }}>
              <div>
                <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2">
                  <span>🌐</span> Knowledge Graph Foundation
                </h2>
                <p className="text-sm text-purple-500/70 mt-1">Relationships between Employees, Projects, Tasks, and Skills</p>
              </div>
              <button onClick={() => setShowGraphModal(false)} className="text-gray-400 hover:text-slate-300 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-slate-100 mb-3">Entities ({graphData.nodes.length})</h3>
                <div className="space-y-2 max-h-[50vh] overflow-auto">
                  {['Employee', 'Project', 'Task', 'Skill'].map(type => {
                    const count = graphData.nodes.filter((n: any) => n.type === type).length;
                    return (
                      <div key={type} className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className="font-medium text-slate-300">{type}s</span>
                        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-slate-100 mb-3">Relationships ({graphData.edges.length})</h3>
                <div className="space-y-2 max-h-[50vh] overflow-auto">
                  {['belongs_to', 'assigned_to', 'requires', 'has_skill'].map(label => {
                    const count = graphData.edges.filter((e: any) => e.label === label).length;
                    return (
                      <div key={label} className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className="font-medium text-slate-300">{label.replace('_', ' ')}</span>
                        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-white/5 text-right">
              <button onClick={() => setShowGraphModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/[0.06] transition-all border border-white/10 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Tracking Modal */}
      {showLeaveTrackingModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
          <div className="rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 24px 80px rgba(0,0,0,0.6)' }}>
            <div className="flex-1 overflow-auto">
              <LeaveManagementSection allLeaves={allLeaves} />
            </div>
            <div className="p-4 border-t border-white/5 text-right">
              <button onClick={() => setShowLeaveTrackingModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/[0.06] transition-all border border-white/10">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Table — Who is working on what */}
      <div className="rounded-2xl overflow-hidden glass transition-all hover:shadow-md">
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Team Workload & Live Assignments</h2>
            <p className="text-xs text-slate-400 mt-0.5 tracking-tight">Real-time resource utilization across active enterprise projects</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowRebalanceModal(true)} 
              className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-100"
            >
              ⚖️ Rebalance Workload
            </button>
            <span className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-500/10 px-2.5 py-1 rounded-full">Live Monitor</span>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-[11px] uppercase tracking-widest text-gray-400 border-b border-white/5" style={{ background: 'var(--card)' }}>
              <tr>
                <th className="p-4 font-semibold">Employee</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Capacity Used</th>
                <th className="p-4 font-semibold">Active Tasks</th>
                <th className="p-4 font-semibold">Performance</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {workload.map(emp => {
                const isExpanded = expandedEmployee === emp.id;
                const utilColor = emp.utilizationPercentage >= 100 ? '#ef4444' :
                                  emp.utilizationPercentage >= 80 ? '#fb923c' :
                                  emp.utilizationPercentage >= 50 ? '#60a5fa' : '#34d399';
                return (
                  <>
                    <tr
                      key={emp.id}
                      className={`border-b border-white/[0.04] cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-500/10' : 'hover:bg-white/[0.03]'}`}
                      onClick={() => setExpandedEmployee(isExpanded ? null : emp.id)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-100">{emp.name}</p>
                            {emp.onLeave ? (
                              <span className="text-xs px-2 py-0.5 rounded font-medium inline-block mt-0.5" style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c' }}>🏖️ On Leave Now</span>
                            ) : emp.upcomingLeaves?.length > 0 ? (
                              <span className="text-xs px-2 py-0.5 rounded font-medium inline-block mt-0.5" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>
                                📅 Leave: {new Date(emp.upcomingLeaves[0].startDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})} – {new Date(emp.upcomingLeaves[0].endDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-300">{emp.role}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(emp.utilizationPercentage, 100)}%`, background: utilColor }}></div>
                          </div>
                          <span className={`text-sm font-bold ${emp.utilizationPercentage >= 100 ? 'text-red-400' : 'text-slate-300'}`}>
                            {emp.utilizationPercentage}%
                          </span>
                          <span className="text-xs text-slate-500">({emp.allocatedHours}/{emp.capacityHours}h)</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-sm font-bold ${emp.activeTaskCount > 3 ? 'text-red-400' : emp.activeTaskCount > 1 ? 'text-orange-400' : 'text-slate-300'}`}>
                          {emp.activeTaskCount} task{emp.activeTaskCount !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <div className="h-full rounded-full"
                              style={{ width: `${emp.performanceScore}%`, background: emp.performanceScore >= 85 ? '#10b981' : emp.performanceScore >= 70 ? '#3b82f6' : '#f87171' }}></div>
                          </div>
                          <span className="text-xs text-slate-300">{Math.round(emp.performanceScore)}%</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{Math.round(emp.onTimeDeliveryRate)}% on-time</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={emp.status} />
                          {burnoutData.find(b => b.employeeId === emp.id)?.riskLevel === 'High' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>🔥 Risk</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && emp.activeTasks && (
                      <tr key={`${emp.id}-tasks`} style={{ background: 'rgba(99,102,241,0.06)', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                        <td colSpan={6} className="px-8 py-3">
                          {emp.activeTasks.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No active tasks assigned.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {emp.activeTasks.map((task: any) => (
                                <div key={task.id} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-semibold text-slate-100 leading-tight">{task.title}</p>
                                    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={task.status === 'In Progress' ? { background: 'rgba(99,102,241,0.15)', color: '#818cf8' } : { background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                                      {task.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-indigo-400 mt-1 font-medium">📁 {task.project || 'No Project'}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <PriorityDot priority={task.priority} />
                                    <span className="text-xs text-slate-400">{task.priority}</span>
                                    <span className="text-xs text-slate-500 ml-auto">Due: {new Date(task.deadline).toLocaleDateString()}</span>
                                  </div>
                                  <div className="mt-2">
                                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                                      <span>Progress</span>
                                      <span>{task.progressPercentage}%</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${task.progressPercentage}%` }}></div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-8">
        {/* Placeholder for future chat integration or other tools */}
      </div>
    </div>
  );
}

function LeaveManagementSection({ allLeaves }: { allLeaves: any[] }) {
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  
  const upcoming = allLeaves.filter(l => new Date(l.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
  return (
    <div className="rounded-2xl overflow-hidden glass flex flex-col h-full">
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Leave Tracking & Compliance</h2>
          <p className="text-xs text-slate-400 mt-0.5">Comprehensive history and forward planning of team absences</p>
        </div>
        <div className="flex p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setTab('upcoming')}
            className="px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all"
            style={tab === 'upcoming' ? { background: '#6366f1', color: '#fff' } : { color: '#64748b' }}
          >Upcoming</button>
          <button
            onClick={() => setTab('history')}
            className="px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all"
            style={tab === 'history' ? { background: '#6366f1', color: '#fff' } : { color: '#64748b' }}
          >All Requests</button>
        </div>
      </div>
      <div className="overflow-auto max-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead className="text-[10px] uppercase tracking-widest text-gray-400 border-b border-white/5 sticky top-0 z-10" style={{ background: 'var(--card)' }}>
            <tr>
              <th className="p-4 font-bold">Employee</th>
              <th className="p-4 font-bold">Duration</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold text-right">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {(tab === 'upcoming' ? upcoming : allLeaves).map((leave, idx) => {
              const start = new Date(leave.startDate);
              const end = new Date(leave.endDate);
              const isCurrent = Date.now() >= start.getTime() && Date.now() <= end.getTime();

              return (
                <tr key={idx} className="hover:bg-white/[0.03] transition-colors" style={isCurrent ? { background: 'rgba(245,158,11,0.07)' } : {}}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={isCurrent ? { background: 'rgba(245,158,11,0.15)', color: '#fbbf24' } : { background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>
                        {leave.employee?.name?.charAt(0) || leave.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-100 text-sm">{leave.employee?.name || leave.name}</p>
                        <p className="text-xs text-slate-400">{leave.employee?.role || leave.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-400 font-medium">
                    {start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full" style={leave.status === 'Approved' ? { background: 'rgba(52,211,153,0.15)', color: '#34d399' } : { background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>
                      {leave.status}
                    </span>
                  </td>
                  <td className="p-4 text-right text-xs text-slate-400 italic">
                    {leave.leaveType || 'Annual Leave'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

