import { useEffect, useState } from 'react';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Overloaded: 'bg-red-100 text-red-700 border border-red-200',
    Moderate: 'bg-orange-100 text-orange-700 border border-orange-200',
    Balanced: 'bg-blue-100 text-blue-700 border border-blue-200',
    Available: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    Urgent: 'bg-red-500',
    High: 'bg-orange-400',
    Medium: 'bg-yellow-400',
    Low: 'bg-gray-300',
  };
  return <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${colors[priority] || 'bg-gray-300'}`}></span>;
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
      <div className="text-gray-400 text-lg">Loading dashboard...</div>
    </div>
  );

  const overloaded = workload.filter(e => e.status === 'Overloaded');

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Resource Allocation Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Live view of who is working on what and team capacity</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { label: 'Total Employees', value: summary.totalEmployees, icon: '👥', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Overloaded', value: summary.overloadedEmployees, icon: '🔴', color: 'text-red-600', bg: 'bg-red-50', note: 'Click to view list', onClick: () => setShowOverloadModal(true) },
          { label: 'Active Tasks', value: summary.totalActiveTasks, icon: '⚡', color: 'text-blue-600', bg: 'bg-blue-50', note: 'Click to view all', onClick: () => setShowTasksModal(true) },
          { label: 'At-Risk Projects', value: summary.atRiskProjects, icon: '⚠️', color: 'text-orange-500', bg: 'bg-orange-50', note: 'Click to view risks', onClick: () => setShowRiskModal(true) },
          { label: 'On Leave Today', value: workload.filter(e => e.onLeave).length, icon: '🌴', color: 'text-amber-600', bg: 'bg-amber-50', note: 'Click to view list', onClick: () => setShowOnLeaveTodayModal(true) },
          { label: 'Leave Tracking', value: allLeaves.length, icon: '📅', color: 'text-purple-600', bg: 'bg-purple-50', note: 'Click to view requests', onClick: () => setShowLeaveTrackingModal(true) },
          { label: 'Burnout Risk', value: burnoutData.filter(e => e.riskLevel === 'High').length, icon: '🔥', color: 'text-rose-600', bg: 'bg-rose-50', note: 'Click to view list', onClick: () => setShowBurnoutModal(true) },
          { label: 'Delivery Confidence', value: confidenceData.length > 0 ? Math.round(confidenceData.reduce((sum, c) => sum + c.confidenceScore, 0) / confidenceData.length) + '%' : 'N/A', icon: '🎯', color: 'text-emerald-600', bg: 'bg-emerald-50', note: 'Click to view list', onClick: () => setShowConfidenceModal(true) },
          { label: 'Skill Gaps', value: skillGaps.length, icon: '🎓', color: 'text-amber-600', bg: 'bg-amber-50', note: 'Skills needed', onClick: () => setShowSkillsModal(true) },
          { label: 'Spillover Risk', value: spilloverData.length, icon: '⏳', color: 'text-orange-600', bg: 'bg-orange-50', note: 'Tasks at risk', onClick: () => setShowSpilloverModal(true) },
          { label: 'Knowledge Graph', value: graphData.nodes?.length || 0, icon: '🌐', color: 'text-purple-600', bg: 'bg-purple-50', note: 'Total entities', onClick: () => setShowGraphModal(true) },
        ].map((card, i) => (
          <div 
            key={i} 
            className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 transition-all ${card.onClick ? 'cursor-pointer hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5' : ''}`}
            onClick={card.onClick}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                {card.note && <p className="text-xs text-gray-400 mt-1">{card.note}</p>}
              </div>
              <div className={`text-xl p-2 rounded-lg ${card.bg}`}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>



      {/* Overload Drill-Down Modal */}
      {showOverloadModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <div>
                <h2 className="text-xl font-bold text-red-800 flex items-center gap-2">
                  <span>🚨</span> Overloaded Resource Analysis
                </h2>
                <p className="text-sm text-red-600 mt-1">Personnel currently exceeding 100% weekly capacity</p>
              </div>
              <button onClick={() => setShowOverloadModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4">
              <table className="w-full">
                <thead className="text-xs text-gray-400 uppercase font-semibold">
                  <tr className="border-b border-gray-100">
                    <th className="p-3 text-left">Employee</th>
                    <th className="p-3 text-left">Utilization</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {overloaded.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">{emp.name.charAt(0)}</div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{emp.name}</p>
                            <p className="text-xs text-gray-500">{emp.role}</p>
                          </div>
                        </div>
                        {/* List Tasks causing overload */}
                        <div className="mt-2 ml-11 space-y-1">
                          {emp.activeTasks && emp.activeTasks.length > 0 ? (
                            emp.activeTasks.map((task: any) => (
                              <div key={task.id} className="flex justify-between items-center text-xs bg-gray-50 p-1.5 rounded border border-gray-100">
                                <span className="text-gray-700 font-medium">{task.title}</span>
                                <a href={`/tasks?taskId=${task.id}`} className="text-indigo-600 hover:underline font-bold text-[10px] uppercase bg-white px-1.5 py-0.5 rounded border border-indigo-100">Reassign</a>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-400 italic">No active tasks causing overload.</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-red-600">{emp.utilizationPercentage}%</span>
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
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button onClick={() => setShowOverloadModal(false)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Project Risks Drill-Down Modal */}
      {showRiskModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-orange-50">
              <div>
                <h2 className="text-xl font-bold text-orange-800 flex items-center gap-2">
                  <span>⚠️</span> At-Risk Project Intelligence
                </h2>
                <p className="text-sm text-orange-600 mt-1">High-probability delay alerts based on resource constraints</p>
              </div>
              <button onClick={() => setShowRiskModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4 space-y-4">
              {projectRisks.filter(p => p.delayProbability > 25).sort((a,b) => b.delayProbability - a.delayProbability).map(proj => (
                <div key={proj.id} className="p-4 rounded-xl border border-orange-100 bg-white shadow-sm flex flex-col md:flex-row gap-4 items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-lg">{proj.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${proj.riskLevel === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {proj.riskLevel} Risk
                      </span>
                      <span className="text-sm font-bold text-slate-600">{proj.delayProbability}% Delay Prob.</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {proj.riskReasons.map((r: string, i: number) => (
                        <p key={i} className="text-xs text-gray-600 flex items-start gap-2">
                          <span className="text-red-400 mt-0.5">•</span> {r}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="md:w-64 space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AI Mitigation</p>
                    {proj.mitigationActions.map((act: string, i: number) => (
                      <button key={i} className="w-full text-left text-xs bg-indigo-50 text-indigo-700 p-2 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors font-medium">
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
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button onClick={() => setShowRiskModal(false)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Active Tasks Drill-Down Modal */}
      {showTasksModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50">
              <div>
                <h2 className="text-xl font-bold text-blue-800 flex items-center gap-2">
                  <span>⚡</span> Live Task Inventory
                </h2>
                <p className="text-sm text-blue-600 mt-1">Full breakdown of all work items currently in progress</p>
              </div>
              <button onClick={() => setShowTasksModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="p-4 font-bold">Task Title</th>
                    <th className="p-4 font-bold">Assignee</th>
                    <th className="p-4 font-bold">Project</th>
                    <th className="p-4 font-bold">Deadline</th>
                    <th className="p-4 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allTasks.filter(t => t.status !== 'Completed').map(task => (
                    <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-800 text-sm">{task.title}</p>
                        <p className="text-[10px] text-gray-500 uppercase mt-0.5">{task.taskType}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                            {task.assignedEmployee?.name?.charAt(0) || '?'}
                          </div>
                          <span className="text-sm text-gray-700 font-medium">{task.assignedEmployee?.name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{task.project?.name}</td>
                      <td className="p-4 text-sm text-gray-500 font-medium">{new Date(task.deadline).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button onClick={() => setShowTasksModal(false)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* On Leave Today Modal */}
      {showOnLeaveTodayModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-amber-50">
              <div>
                <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                  <span>🌴</span> On Leave Today
                </h2>
                <p className="text-sm text-amber-600 mt-1">Personnel currently away</p>
              </div>
              <button onClick={() => setShowOnLeaveTodayModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4 space-y-3">
              {workload.filter(e => e.onLeave).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8 italic">Full team is present today! ✅</p>
              )}
              {workload.filter(e => e.onLeave).map(emp => (
                <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl border border-amber-100 bg-amber-50/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-xs">{emp.name.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{emp.name}</p>
                      <p className="text-[10px] text-gray-500">{emp.role}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-white px-2 py-1 rounded-lg border border-amber-100 uppercase">Away</span>
                </div>
              ))}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button onClick={() => setShowOnLeaveTodayModal(false)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Burnout Risk Modal */}
      {showBurnoutModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-rose-50">
              <div>
                <h2 className="text-xl font-bold text-rose-800 flex items-center gap-2">
                  <span>🔥</span> Burnout & Fatigue Risk Analysis
                </h2>
                <p className="text-sm text-rose-600 mt-1">Employees at risk based on workload, complexity, and recovery time</p>
              </div>
              <button onClick={() => setShowBurnoutModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4 space-y-4">
              {burnoutData.map(emp => {
                const bgColor = emp.riskLevel === 'High' ? 'bg-red-50' : emp.riskLevel === 'Medium' ? 'bg-orange-50' : 'bg-emerald-50';
                const borderColor = emp.riskLevel === 'High' ? 'border-red-100' : emp.riskLevel === 'Medium' ? 'border-orange-100' : 'border-emerald-100';

                return (
                  <div key={emp.employeeId} className={`p-4 rounded-xl border ${borderColor} ${bgColor} shadow-sm flex flex-col md:flex-row gap-4 items-start`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${emp.riskLevel === 'High' ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-800'}`}>
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">{emp.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${emp.riskLevel === 'High' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                              {emp.riskLevel} Risk
                            </span>
                            <span className="text-sm font-bold text-slate-600">Score: {emp.burnoutScore}/100</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        {emp.reasons.map((r: string, i: number) => (
                          <p key={i} className="text-xs text-gray-600 flex items-start gap-2">
                            <span className="text-red-400 mt-0.5">•</span> {r}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="md:w-64 space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Suggested Actions</p>
                      {emp.suggestedActions.map((act: string, i: number) => (
                        <div key={i} className="text-xs bg-white text-gray-700 p-2 rounded-lg border border-gray-100 font-medium">
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
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button onClick={() => setShowBurnoutModal(false)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Autonomous Rebalancing Modal */}
      {showRebalanceModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
              <div>
                <h2 className="text-xl font-bold text-indigo-800 flex items-center gap-2">
                  <span>⚖️</span> Autonomous Resource Rebalancing
                </h2>
                <p className="text-sm text-indigo-600 mt-1">AI-generated suggestions to redistribute workload from overloaded employees</p>
              </div>
              <button onClick={() => setShowRebalanceModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4 space-y-4">
              {rebalanceSuggestions.map(sug => (
                <div key={sug.id} className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800">{sug.taskTitle}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Task ID: {sug.taskId}</p>
                    </div>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase">Suggestion</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                      <p className="text-xs text-red-600 font-semibold mb-1">Move From</p>
                      <p className="font-bold text-slate-800">{sug.fromEmployeeName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">Utilization:</span>
                        <span className="font-bold text-red-600">{sug.fromUtilizationBefore}%</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-bold text-green-600">{sug.fromUtilizationAfter}%</span>
                      </div>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                      <p className="text-xs text-emerald-600 font-semibold mb-1">Move To</p>
                      <p className="font-bold text-slate-800">{sug.toEmployeeName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">Utilization:</span>
                        <span className="font-bold text-gray-600">{sug.toUtilizationBefore}%</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-bold text-emerald-600">{sug.toUtilizationAfter}%</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">{sug.reason}</p>

                  <div className="flex justify-end gap-2 mt-2">
                    <button 
                      onClick={() => handleRejectRebalance(sug.id)}
                      className="text-xs bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-50 transition-all"
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
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button onClick={() => setShowRebalanceModal(false)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Confidence Modal */}
      {showConfidenceModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-emerald-50">
              <div>
                <h2 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
                  <span>🎯</span> Delivery Confidence Index
                </h2>
                <p className="text-sm text-emerald-600 mt-1">Project delivery confidence based on risk, capacity, and velocity</p>
              </div>
              <button onClick={() => setShowConfidenceModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4 space-y-4">
              {confidenceData.map(proj => {
                const color = proj.confidenceScore >= 90 ? 'text-emerald-600' : proj.confidenceScore >= 70 ? 'text-blue-600' : proj.confidenceScore >= 40 ? 'text-orange-500' : 'text-red-600';
                const bgColor = proj.confidenceScore >= 90 ? 'bg-emerald-50' : proj.confidenceScore >= 70 ? 'bg-blue-50' : proj.confidenceScore >= 40 ? 'bg-orange-50' : 'bg-red-50';
                
                return (
                  <div key={proj.projectId} className={`p-4 rounded-xl border border-gray-100 bg-white shadow-sm flex flex-col md:flex-row gap-4 items-center`}>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-lg">{proj.projectName}</h3>
                      <p className="text-xs text-gray-600 mt-1">{proj.explanation}</p>
                    </div>
                    <div className={`w-24 h-24 rounded-full ${bgColor} flex flex-col items-center justify-center border-2 border-white shadow-inner`}>
                      <span className={`text-2xl font-bold ${color}`}>{proj.confidenceScore}%</span>
                      <span className="text-[10px] text-gray-500 font-medium uppercase mt-0.5">{proj.confidenceLevel.split(' ')[0]}</span>
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
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button onClick={() => setShowConfidenceModal(false)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Skill Gaps Modal */}
      {showSkillsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-amber-50">
              <div>
                <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                  <span>🎓</span> Predicted Skill Gaps
                </h2>
                <p className="text-sm text-amber-600 mt-1">Skills required by active tasks but low in team capacity</p>
              </div>
              <button onClick={() => setShowSkillsModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4 space-y-4">
              {skillGaps.map(gap => {
                const color = gap.riskLevel === 'High' ? 'text-red-600' : 'text-orange-500';
                const bgColor = gap.riskLevel === 'High' ? 'bg-red-50' : 'bg-orange-50';
                
                return (
                  <div key={gap.skillId} className={`p-4 rounded-xl border border-gray-100 bg-white shadow-sm flex flex-col md:flex-row gap-4 items-center`}>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-lg">{gap.skillName}</h3>
                      <p className="text-xs text-gray-600 mt-1">Required in {gap.requiredInTasks} active tasks.</p>
                    </div>
                    <div className={`w-24 h-24 rounded-full ${bgColor} flex flex-col items-center justify-center border-2 border-white shadow-inner`}>
                      <span className={`text-2xl font-bold ${color}`}>{gap.expertsAvailable}</span>
                      <span className="text-[10px] text-gray-500 font-medium uppercase mt-0.5">Experts</span>
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
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button onClick={() => setShowSkillsModal(false)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Spillover Modal */}
      {showSpilloverModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-orange-50">
              <div>
                <h2 className="text-xl font-bold text-orange-800 flex items-center gap-2">
                  <span>⏳</span> Spillover Risk Prediction
                </h2>
                <p className="text-sm text-orange-600 mt-1">Tasks predicted to exceed their deadline based on current progress</p>
              </div>
              <button onClick={() => setShowSpilloverModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4 space-y-4">
              {spilloverData.map(task => (
                <div key={task.taskId} className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800">{task.title}</h3>
                      <p className="text-xs text-gray-500">{task.projectName} • {task.assignee}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${task.riskLevel === 'High' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                      {task.riskLevel} Risk
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
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
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button onClick={() => setShowSpilloverModal(false)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Standup Modal */}
      {showStandupModal && standupData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50">
              <div>
                <h2 className="text-xl font-bold text-blue-800 flex items-center gap-2">
                  <span>🗣️</span> AI Daily Standup Summary
                </h2>
                <p className="text-sm text-blue-600 mt-1">Automated summary of team progress and blockers</p>
              </div>
              <button onClick={() => setShowStandupModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-6 space-y-6">
              <div>
                <h3 className="font-bold text-emerald-700 flex items-center gap-2 mb-2">
                  <span>✅</span> Completed (Last 24h)
                </h3>
                <div className="space-y-2">
                  {standupData.completedYesterday.map((t: any, i: number) => (
                    <div key={i} className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg">
                      <span className="font-medium">{t.title}</span> <span className="text-gray-500">({t.assignee})</span>
                    </div>
                  ))}
                  {standupData.completedYesterday.length === 0 && <p className="text-sm text-gray-400">No tasks completed yesterday.</p>}
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-blue-700 flex items-center gap-2 mb-2">
                  <span>🚀</span> In Progress
                </h3>
                <div className="space-y-2">
                  {standupData.inProgress.map((t: any, i: number) => (
                    <div key={i} className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg flex justify-between items-center">
                      <span><span className="font-medium">{t.title}</span> <span className="text-gray-500">({t.assignee})</span></span>
                      <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold">{t.progress}%</span>
                    </div>
                  ))}
                  {standupData.inProgress.length === 0 && <p className="text-sm text-gray-400">No tasks in progress.</p>}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-red-700 flex items-center gap-2 mb-2">
                  <span>🚫</span> Blocked
                </h3>
                <div className="space-y-2">
                  {standupData.blocked.map((t: any, i: number) => (
                    <div key={i} className="text-sm text-gray-700 bg-red-50 p-2 rounded-lg">
                      <span className="font-medium">{t.title}</span> <span className="text-gray-500">({t.assignee})</span>
                    </div>
                  ))}
                  {standupData.blocked.length === 0 && <p className="text-sm text-gray-400">No blocked tasks. Great!</p>}
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button onClick={() => setShowStandupModal(false)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Finance Modal */}
      {showFinanceModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <div>
                <h2 className="text-xl font-bold text-red-800 flex items-center gap-2">
                  <span>💰</span> Financial Overview
                </h2>
                <p className="text-sm text-red-600 mt-1">Project budgets vs actual costs</p>
              </div>
              <button onClick={() => setShowFinanceModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-[11px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
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
                    <tr key={p.projectId} className="border-b border-gray-50 hover:bg-slate-50">
                      <td className="p-4 font-semibold text-slate-800">{p.projectName}</td>
                      <td className="p-4 text-sm text-gray-600">${p.budget.toLocaleString()}</td>
                      <td className="p-4 text-sm text-gray-600">${p.currentCost.toLocaleString()}</td>
                      <td className={`p-4 text-sm font-semibold ${p.variance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        ${p.variance.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.isOverBudget ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {p.isOverBudget ? 'Over Budget' : 'On Track'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button onClick={() => setShowFinanceModal(false)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Graph Modal */}
      {showGraphModal && graphData.nodes && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-50">
              <div>
                <h2 className="text-xl font-bold text-purple-800 flex items-center gap-2">
                  <span>🌐</span> Knowledge Graph Foundation
                </h2>
                <p className="text-sm text-purple-600 mt-1">Relationships between Employees, Projects, Tasks, and Skills</p>
              </div>
              <button onClick={() => setShowGraphModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2">&times;</button>
            </div>
            <div className="overflow-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-slate-800 mb-3">Entities ({graphData.nodes.length})</h3>
                <div className="space-y-2 max-h-[50vh] overflow-auto">
                  {['Employee', 'Project', 'Task', 'Skill'].map(type => {
                    const count = graphData.nodes.filter((n: any) => n.type === type).length;
                    return (
                      <div key={type} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">{type}s</span>
                        <span className="text-xs font-bold bg-white px-2 py-1 rounded-full border border-gray-200">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-3">Relationships ({graphData.edges.length})</h3>
                <div className="space-y-2 max-h-[50vh] overflow-auto">
                  {['belongs_to', 'assigned_to', 'requires', 'has_skill'].map(label => {
                    const count = graphData.edges.filter((e: any) => e.label === label).length;
                    return (
                      <div key={label} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">{label.replace('_', ' ')}</span>
                        <span className="text-xs font-bold bg-white px-2 py-1 rounded-full border border-gray-200">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button onClick={() => setShowGraphModal(false)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Tracking Modal */}
      {showLeaveTrackingModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              <LeaveManagementSection allLeaves={allLeaves} />
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button onClick={() => setShowLeaveTrackingModal(false)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Table — Who is working on what */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Team Workload & Live Assignments</h2>
            <p className="text-xs text-gray-500 mt-0.5 tracking-tight">Real-time resource utilization across active enterprise projects</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowRebalanceModal(true)} 
              className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-100"
            >
              ⚖️ Rebalance Workload
            </button>
            <span className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full">Live Monitor</span>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white text-[11px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
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
                const utilColor = emp.utilizationPercentage >= 100 ? 'bg-red-500' :
                                  emp.utilizationPercentage >= 80 ? 'bg-orange-400' :
                                  emp.utilizationPercentage >= 50 ? 'bg-blue-400' : 'bg-emerald-400';
                return (
                  <>
                    <tr
                      key={emp.id}
                      className={`border-b border-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                      onClick={() => setExpandedEmployee(isExpanded ? null : emp.id)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{emp.name}</p>
                            {emp.onLeave ? (
                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-medium inline-block mt-0.5">🏖️ On Leave Now</span>
                            ) : emp.upcomingLeaves?.length > 0 ? (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-medium inline-block mt-0.5">
                                📅 Leave: {new Date(emp.upcomingLeaves[0].startDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})} – {new Date(emp.upcomingLeaves[0].endDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{emp.role}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                            <div className={`h-full ${utilColor} rounded-full`} style={{ width: `${Math.min(emp.utilizationPercentage, 100)}%` }}></div>
                          </div>
                          <span className={`text-sm font-bold ${emp.utilizationPercentage >= 100 ? 'text-red-600' : 'text-gray-700'}`}>
                            {emp.utilizationPercentage}%
                          </span>
                          <span className="text-xs text-gray-400">({emp.allocatedHours}/{emp.capacityHours}h)</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-sm font-bold ${emp.activeTaskCount > 3 ? 'text-red-600' : emp.activeTaskCount > 1 ? 'text-orange-500' : 'text-gray-700'}`}>
                          {emp.activeTaskCount} task{emp.activeTaskCount !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                            <div className={`h-full rounded-full ${emp.performanceScore >= 85 ? 'bg-emerald-500' : emp.performanceScore >= 70 ? 'bg-blue-500' : 'bg-red-400'}`}
                              style={{ width: `${emp.performanceScore}%` }}></div>
                          </div>
                          <span className="text-xs text-gray-600">{Math.round(emp.performanceScore)}%</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{Math.round(emp.onTimeDeliveryRate)}% on-time</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={emp.status} />
                          {burnoutData.find(b => b.employeeId === emp.id)?.riskLevel === 'High' && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">🔥 Risk</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && emp.activeTasks && (
                      <tr key={`${emp.id}-tasks`} className="bg-indigo-50/50 border-b border-indigo-100">
                        <td colSpan={6} className="px-8 py-3">
                          {emp.activeTasks.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No active tasks assigned.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {emp.activeTasks.map((task: any) => (
                                <div key={task.id} className="bg-white rounded-lg border border-indigo-100 p-3 shadow-sm">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-semibold text-slate-800 leading-tight">{task.title}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                      {task.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-indigo-500 mt-1 font-medium">📁 {task.project || 'No Project'}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <PriorityDot priority={task.priority} />
                                    <span className="text-xs text-gray-500">{task.priority}</span>
                                    <span className="text-xs text-gray-400 ml-auto">Due: {new Date(task.deadline).toLocaleDateString()}</span>
                                  </div>
                                  <div className="mt-2">
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                      <span>Progress</span>
                                      <span>{task.progressPercentage}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-200 rounded-full">
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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Leave Tracking & Compliance</h2>
          <p className="text-xs text-gray-500 mt-0.5">Comprehensive history and forward planning of team absences</p>
        </div>
        <div className="flex bg-gray-200/50 p-1 rounded-lg">
          <button 
            onClick={() => setTab('upcoming')}
            className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all ${tab === 'upcoming' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
          >Upcoming</button>
          <button 
            onClick={() => setTab('history')}
            className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all ${tab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
          >All Requests</button>
        </div>
      </div>
      <div className="overflow-auto max-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-100 sticky top-0 z-10">
            <tr>
              <th className="p-4 font-bold">Employee</th>
              <th className="p-4 font-bold">Duration</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold text-right">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(tab === 'upcoming' ? upcoming : allLeaves).map((leave, idx) => {
              const start = new Date(leave.startDate);
              const end = new Date(leave.endDate);
              const isCurrent = Date.now() >= start.getTime() && Date.now() <= end.getTime();

              return (
                <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${isCurrent ? 'bg-amber-50/50' : ''}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isCurrent ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                        {leave.employee?.name?.charAt(0) || leave.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{leave.employee?.name || leave.name}</p>
                        <p className="text-xs text-gray-500">{leave.employee?.role || leave.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600 font-medium">
                    {start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {leave.status}
                    </span>
                  </td>
                  <td className="p-4 text-right text-xs text-gray-500 italic">
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


