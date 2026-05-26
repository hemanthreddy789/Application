import { useEffect, useState } from 'react';
import { 
  Brain, Users, FileText, CheckCircle, RefreshCw, 
  AlertTriangle, Plus, Trash2, ArrowRight, Zap, ShieldCheck, 
  DollarSign, Calendar, Github, Database 
} from 'lucide-react';

const COLORS = {
  indigo: '#6366f1',
  red: '#ef4444',
  orange: '#f97316',
  emerald: '#10b981',
  purple: '#a855f7',
  blue: '#3b82f6',
  slate: '#64748b'
};

export default function StrategyHub() {
  const [activeTab, setActiveTab] = useState<'whatif' | 'compliance' | 'integrations'>('whatif');
  
  // What-If Simulation State
  const [scenarioType, setScenarioType] = useState<'WIN_PROJECT' | 'BOB_QUITS' | 'HIRE_CONTRACTORS'>('WIN_PROJECT');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('Project Phoenix');
  const [projectTasks, setProjectTasks] = useState<any[]>([
    { title: 'Database Schema Design', taskType: 'Development', requiredSkills: 'Node.js, SQL', estimatedHours: 35 },
    { title: 'Frontend Admin Dashboard', taskType: 'Development', requiredSkills: 'React, TailwindCSS', estimatedHours: 40 }
  ]);
  const [contractors, setContractors] = useState<any[]>([
    { skillName: 'React', count: 1, weeklyHours: 40, hourlyRate: 75 }
  ]);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);

  // Compliance & Wellness State
  const [burnoutData, setBurnoutData] = useState<any>(null);
  const [biasData, setBiasData] = useState<any>(null);
  const [loadingReports, setLoadingReports] = useState<boolean>(false);

  // Integrations State
  const [integrationStatus, setIntegrationStatus] = useState<any>(null);
  const [syncingPlugin, setSyncingPlugin] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  // Fetch initial data
  useEffect(() => {
    fetch('/api/employees')
      .then(r => r.json())
      .then(res => {
        const data = res.success ? res.data : res;
        setEmployees(Array.isArray(data) ? data : []);
        if (data.length > 0) setSelectedEmployeeId(data[0].id);
      })
      .catch(console.error);

    loadReports();
    loadIntegrations();
  }, []);

  const loadReports = () => {
    setLoadingReports(true);
    Promise.all([
      fetch('/api/advanced/burnout-index').then(r => r.json()),
      fetch('/api/reports/bias-detection').then(r => r.json())
    ])
      .then(([burnoutRes, biasRes]) => {
        setBurnoutData(burnoutRes.success ? burnoutRes.data : burnoutRes);
        setBiasData(biasRes.success ? biasRes.data : biasRes);
        setLoadingReports(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingReports(false);
      });
  };

  const loadIntegrations = () => {
    fetch('/api/integrations/status')
      .then(r => r.json())
      .then(res => {
        setIntegrationStatus(res.success ? res.data : res);
      })
      .catch(console.error);
  };

  // Run What-If Simulation
  const runSimulation = () => {
    setSimulating(true);
    setSimError(null);
    setSimulationResult(null);

    let payload: any = { scenarioType };

    if (scenarioType === 'BOB_QUITS') {
      payload.params = { employeeId: selectedEmployeeId };
    } else if (scenarioType === 'WIN_PROJECT') {
      const parsedTasks = projectTasks.map(t => ({
        ...t,
        requiredSkills: t.requiredSkills.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '')
      }));
      payload.params = { projectName, tasks: parsedTasks };
    } else if (scenarioType === 'HIRE_CONTRACTORS') {
      payload.params = { contractors };
    }

    fetch('/api/advanced/scenario-planning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setSimulationResult(res.data);
        } else {
          setSimError(res.error || 'Simulation failed.');
        }
        setSimulating(false);
      })
      .catch(() => {
        setSimError('Simulation service currently offline.');
        setSimulating(false);
      });
  };

  // Sync integration plugin
  const triggerSync = (pluginKey: string, endpoint: string) => {
    setSyncingPlugin(pluginKey);
    const logKey = pluginKey.toUpperCase();
    setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Triggering ${logKey} synchronization...`, ...prev]);

    fetch(endpoint, { method: 'POST' })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setSyncLogs(prev => [
            `[${new Date().toLocaleTimeString()}] Success: ${logKey} sync completed successfully.`,
            `[${new Date().toLocaleTimeString()}] Sync response: ${JSON.stringify(res.data || res.message)}`,
            ...prev
          ]);
          loadIntegrations(); // reload statuses
        } else {
          setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Error: ${res.error || 'Sync failed.'}`, ...prev]);
        }
        setSyncingPlugin(null);
      })
      .catch(() => {
        setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Error: Network error executing sync for ${logKey}.`, ...prev]);
        setSyncingPlugin(null);
      });
  };

  // Manage custom task lists for Win Project
  const addTask = () => {
    setProjectTasks([...projectTasks, { title: 'New Task', taskType: 'Development', requiredSkills: '', estimatedHours: 20 }]);
  };

  const removeTask = (index: number) => {
    setProjectTasks(projectTasks.filter((_, i) => i !== index));
  };

  const updateTaskField = (index: number, field: string, value: any) => {
    const updated = [...projectTasks];
    updated[index][field] = value;
    setProjectTasks(updated);
  };

  // Manage contractor list
  const addContractor = () => {
    setContractors([...contractors, { skillName: 'React', count: 1, weeklyHours: 40, hourlyRate: 75 }]);
  };

  const removeContractor = (index: number) => {
    setContractors(contractors.filter((_, i) => i !== index));
  };

  const updateContractorField = (index: number, field: string, value: any) => {
    const updated = [...contractors];
    updated[index][field] = value;
    setContractors(updated);
  };



  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Brain className="text-indigo-600 w-7 h-7" /> Enterprise Strategy & Planning Hub
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Conduct dynamic What-If simulations, monitor AI fairness audits, and administer real-time external syncing.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
          {[
            { id: 'whatif', label: '⚖️ What-If Simulator' },
            { id: 'compliance', label: '🛡️ Compliance & Wellness' },
            { id: 'integrations', label: '🌐 Integrations Hub' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      // TAB 1: WHAT-IF SIMULATOR
      {/* ======================================================== */}
      {activeTab === 'whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Panel */}
          <div className="lg:col-span-4 bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800">Select Simulation Scenario</h2>
              <p className="text-xs text-gray-400 mt-0.5">Configure operational hypothesis parameters</p>
            </div>

            <div className="p-5 space-y-5">
              {/* Scenario Type Selection */}
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">Scenario Hypothesis</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'WIN_PROJECT', title: '🏆 Win Dynamic Project', desc: 'Add new tasks and model allocation and budgets' },
                    { id: 'BOB_QUITS', title: '🚨 Key Employee Departure', desc: 'Simulate developer leaving and auto-reassign tasks' },
                    { id: 'HIRE_CONTRACTORS', title: '👷 Capacity Sourcing', desc: 'Inject temporary contractor hours to offload bottlenecks' }
                  ].map(sc => (
                    <button
                      key={sc.id}
                      onClick={() => { setScenarioType(sc.id as any); setSimulationResult(null); }}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        scenarioType === sc.id
                          ? 'border-indigo-500 bg-indigo-50/40 text-indigo-950 font-bold'
                          : 'border-gray-200 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-xs leading-none font-bold text-slate-800">{sc.title}</p>
                      <p className="text-[10px] text-gray-500 mt-1 leading-tight font-medium">{sc.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Param Inputs */}
              <div className="border-t border-gray-100 pt-4 space-y-4">
                {scenarioType === 'BOB_QUITS' && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1.5"> Departing Employee </label>
                    <select
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white font-medium text-slate-700 focus:outline-indigo-500"
                      value={selectedEmployeeId}
                      onChange={e => setSelectedEmployeeId(e.target.value)}
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>
                      ))}
                    </select>
                  </div>
                )}

                {scenarioType === 'WIN_PROJECT' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1.5">Project Name</label>
                      <input
                        type="text"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-indigo-500"
                        value={projectName}
                        onChange={e => setProjectName(e.target.value)}
                        placeholder="Project Phoenix"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Tasks to Allocate</label>
                        <button onClick={addTask} className="text-indigo-600 hover:text-indigo-800 text-[10px] font-black flex items-center gap-1">
                          <Plus size={12} /> ADD TASK
                        </button>
                      </div>
                      <div className="space-y-2 max-h-56 overflow-auto pr-1">
                        {projectTasks.map((task, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-2 relative">
                            <button onClick={() => removeTask(idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                              <Trash2 size={12} />
                            </button>
                            <input
                              type="text"
                              value={task.title}
                              onChange={e => updateTaskField(idx, 'title', e.target.value)}
                              className="bg-transparent border-b border-gray-200 w-4/5 text-xs font-semibold focus:outline-none focus:border-indigo-500 pb-0.5"
                              placeholder="Task Title"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[8px] font-black text-gray-400 uppercase">Estimated Hours</label>
                                <input
                                  type="number"
                                  value={task.estimatedHours}
                                  onChange={e => updateTaskField(idx, 'estimatedHours', parseInt(e.target.value) || 0)}
                                  className="w-full border border-gray-200 bg-white rounded-lg px-2 py-0.5 text-xs focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[8px] font-black text-gray-400 uppercase">Required Skills (CSV)</label>
                                <input
                                  type="text"
                                  value={task.requiredSkills}
                                  onChange={e => updateTaskField(idx, 'requiredSkills', e.target.value)}
                                  className="w-full border border-gray-200 bg-white rounded-lg px-2 py-0.5 text-xs focus:outline-none"
                                  placeholder="React, SQL"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {scenarioType === 'HIRE_CONTRACTORS' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Injected Capacity</label>
                      <button onClick={addContractor} className="text-indigo-600 hover:text-indigo-800 text-[10px] font-black flex items-center gap-1">
                        <Plus size={12} /> ADD CONTRACTOR
                      </button>
                    </div>
                    <div className="space-y-2 max-h-56 overflow-auto pr-1">
                      {contractors.map((con, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-2 relative">
                          <button onClick={() => removeContractor(idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                            <Trash2 size={12} />
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[8px] font-black text-gray-400 uppercase">Skill Specialty</label>
                              <input
                                type="text"
                                value={con.skillName}
                                onChange={e => updateContractorField(idx, 'skillName', e.target.value)}
                                className="w-full border border-gray-200 bg-white rounded-lg px-2 py-0.5 text-xs focus:outline-none"
                                placeholder="React"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-gray-400 uppercase">Hourly Rate ($)</label>
                              <input
                                type="number"
                                value={con.hourlyRate}
                                onChange={e => updateContractorField(idx, 'hourlyRate', parseInt(e.target.value) || 0)}
                                className="w-full border border-gray-200 bg-white rounded-lg px-2 py-0.5 text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-gray-400 uppercase">Count</label>
                              <input
                                type="number"
                                value={con.count}
                                onChange={e => updateContractorField(idx, 'count', parseInt(e.target.value) || 0)}
                                className="w-full border border-gray-200 bg-white rounded-lg px-2 py-0.5 text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-gray-400 uppercase">Weekly Hours</label>
                              <input
                                type="number"
                                value={con.weeklyHours}
                                onChange={e => updateContractorField(idx, 'weeklyHours', parseInt(e.target.value) || 0)}
                                className="w-full border border-gray-200 bg-white rounded-lg px-2 py-0.5 text-xs focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Run Trigger */}
              <button
                onClick={runSimulation}
                disabled={simulating}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {simulating ? (
                  <>
                    <RefreshCw className="animate-spin w-4 h-4" /> Computing Scenarios...
                  </>
                ) : (
                  <>
                    <Zap size={16} /> Run What-If Simulation
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-8 space-y-6">
            {simError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-700 text-sm">
                <p className="font-bold flex items-center gap-2">
                  <AlertTriangle size={16} /> Simulation Service Warning
                </p>
                <p className="mt-1">{simError}</p>
              </div>
            )}

            {!simulationResult && !simulating && !simError && (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-slate-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-50">
                  <Brain size={28} />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">No Active Simulation</h3>
                <p className="text-gray-400 text-sm max-w-sm mx-auto mt-1 leading-relaxed">
                  Select a hypothesis on the left control panel, configure parameters, and click run to calculate workforce impacts.
                </p>
              </div>
            )}

            {simulating && (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm animate-pulse">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="font-bold text-slate-800 text-base">Running Machine Learning Simulation</h3>
                <p className="text-gray-400 text-xs mt-1">Re-solving resource mapping indexes, traversing leave arrays, and calculating cost variances...</p>
              </div>
            )}

            {simulationResult && (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* AI Impact Advisor */}
                <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex items-start gap-4 shadow-md">
                  <span className="text-3xl mt-0.5">🤖</span>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Strategic Decision Recommendation</p>
                    <h3 className="font-bold text-lg leading-snug mt-0.5">{simulationResult.scenario}</h3>
                    <p className="text-sm text-slate-300 mt-2 leading-relaxed font-medium">{simulationResult.impact}</p>
                    <p className="text-xs text-indigo-300 font-semibold bg-indigo-950/70 border border-indigo-800/40 p-3 rounded-xl mt-3 leading-relaxed">
                      💡 {simulationResult.recommendation}
                    </p>
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Utilization comparison chart */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-slate-800 text-sm mb-4">Utilization Shift Impact</h3>
                    <div className="flex items-center justify-around h-36">
                      <div className="text-center">
                        <p className="text-xs text-gray-400 font-bold uppercase">Before</p>
                        <p className="text-4xl font-extrabold text-slate-700 mt-1">{simulationResult.workloadDiff.currentAvgUtilization}</p>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">Team Avg</p>
                      </div>
                      <ArrowRight size={24} className="text-slate-300 animate-pulse" />
                      <div className="text-center">
                        <p className="text-xs text-gray-400 font-bold uppercase">Simulated</p>
                        <p className={`text-4xl font-extrabold mt-1 ${
                          parseInt(simulationResult.workloadDiff.scenarioAvgUtilization) > 95 ? 'text-red-500' : 'text-indigo-600'
                        }`}>{simulationResult.workloadDiff.scenarioAvgUtilization}</p>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">Team Avg</p>
                      </div>
                    </div>
                  </div>

                  {/* Bottleneck Risks card */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-slate-800 text-sm mb-3">Capacity Constraints & Warnings</h3>
                    
                    {/* Departures Bottlenecks */}
                    {scenarioType === 'BOB_QUITS' && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2.5 bg-red-50 rounded-lg border border-red-100 text-xs">
                          <span className="text-red-700 font-semibold">Orphaned Tasks</span>
                          <span className="bg-red-200 text-red-800 font-black px-2 py-0.5 rounded-full">{simulationResult.orphanedTasks.length}</span>
                        </div>
                        <div className="max-h-24 overflow-auto space-y-1">
                          {simulationResult.overloadRisks.map((risk: string, i: number) => (
                            <div key={i} className="text-xs text-orange-700 bg-orange-50 p-2 rounded border border-orange-100 leading-tight">
                              ⚠️ {risk}
                            </div>
                          ))}
                          {simulationResult.overloadRisks.length === 0 && (
                            <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-100">
                              ✅ No new personnel will be pushed into overload.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* New Wins Bottlenecks */}
                    {scenarioType === 'WIN_PROJECT' && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2.5 bg-indigo-50 rounded-lg border border-indigo-100 text-xs">
                          <span className="text-indigo-700 font-semibold">Project Staffing Budget</span>
                          <span className="font-black text-indigo-950">${simulationResult.projectedBudget.toLocaleString()}</span>
                        </div>
                        <div className="max-h-24 overflow-auto space-y-1">
                          {simulationResult.bottlenecks.map((bot: string, i: number) => (
                            <div key={i} className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-100 leading-tight">
                              🚨 {bot}
                            </div>
                          ))}
                          {simulationResult.skillsGap.length > 0 && (
                            <div className="text-xs text-orange-700 bg-orange-50 p-2 rounded border border-orange-100 leading-tight">
                              ⚠️ Skills Gap Deficit: {simulationResult.skillsGap.join(', ')}
                            </div>
                          )}
                          {simulationResult.bottlenecks.length === 0 && simulationResult.skillsGap.length === 0 && (
                            <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-100">
                              ✅ Roster has perfect capacity to absorb this project!
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contractor Sourcing Bottlenecks */}
                    {scenarioType === 'HIRE_CONTRACTORS' && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2.5 bg-emerald-50 rounded-lg border border-emerald-100 text-xs">
                          <span className="text-emerald-700 font-semibold">Weekly contractor cost</span>
                          <span className="font-black text-emerald-950">${simulationResult.weeklyCost.toLocaleString()}</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-gray-100 rounded-lg text-xs leading-relaxed text-slate-600">
                          🎯 Contractors resolved and offloaded <span className="font-bold text-indigo-600">{simulationResult.totalOffloadedHours}h</span> of active bottleneck engineering hours from core staff.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details Table */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-sm">Simulated Task Mapping Details</h3>
                    <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Allocation Report</span>
                  </div>

                  {/* CASE A: Win Project Assignments */}
                  {scenarioType === 'WIN_PROJECT' && (
                    <table className="w-full text-left">
                      <thead className="bg-white text-[9px] uppercase tracking-widest text-gray-400 border-b border-gray-100 font-black">
                        <tr>
                          <th className="p-3 font-bold">Hypothetical Task</th>
                          <th className="p-3 font-bold">Estimated Load</th>
                          <th className="p-3 font-bold">Simulated Assignee</th>
                          <th className="p-3 font-bold text-right">Standard Rate Billing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs">
                        {simulationResult.assignments.map((as: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-800">{as.taskTitle}</td>
                            <td className="p-3 font-medium text-slate-600">{as.estimatedHours}h</td>
                            <td className="p-3">
                              <span className={`font-bold ${as.assignedTo.includes('Unassigned') ? 'text-red-500' : 'text-indigo-600'}`}>
                                👤 {as.assignedTo}
                              </span>
                              <span className="text-gray-400 text-[10px] font-medium ml-1">({as.role})</span>
                            </td>
                            <td className="p-3 text-right font-bold text-slate-700">${as.simulatedCost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* CASE B: Key Employee Departure Orphaned Tasks */}
                  {scenarioType === 'BOB_QUITS' && (
                    <table className="w-full text-left">
                      <thead className="bg-white text-[9px] uppercase tracking-widest text-gray-400 border-b border-gray-100 font-black">
                        <tr>
                          <th className="p-3 font-bold">Orphaned Task</th>
                          <th className="p-3 font-bold">Load</th>
                          <th className="p-3 font-bold">Recommended Replacement</th>
                          <th className="p-3 font-bold">Match Score</th>
                          <th className="p-3 font-bold text-right">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs">
                        {simulationResult.orphanedTasks.map((task: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-800">{task.taskTitle}</td>
                            <td className="p-3 font-medium text-slate-600">{task.estimatedHours}h</td>
                            <td className="p-3 font-bold text-indigo-600">👤 {task.recommendedReplacementName}</td>
                            <td className="p-3">
                              <span className={`font-black px-2 py-0.5 rounded-full ${
                                task.matchScore >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {task.matchScore}%
                              </span>
                            </td>
                            <td className="p-3 text-right text-gray-500 italic max-w-xs truncate leading-normal" title={task.reason}>
                              {task.reason}
                            </td>
                          </tr>
                        ))}
                        {simulationResult.orphanedTasks.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-gray-400 italic">No pending tasks to reassign.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}

                  {/* CASE C: Inject Contractor Capacity offloading */}
                  {scenarioType === 'HIRE_CONTRACTORS' && (
                    <table className="w-full text-left">
                      <thead className="bg-white text-[9px] uppercase tracking-widest text-gray-400 border-b border-gray-100 font-black">
                        <tr>
                          <th className="p-3 font-bold">Offloaded Task</th>
                          <th className="p-3 font-bold">Estimated Hours</th>
                          <th className="p-3 font-bold">Offloaded From</th>
                          <th className="p-3 font-bold text-right">Contractor Category Specialty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs">
                        {simulationResult.offloadedTasks.map((task: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-800">{task.taskTitle}</td>
                            <td className="p-3 font-medium text-slate-600">{task.estimatedHours}h</td>
                            <td className="p-3 font-bold text-red-600">👤 {task.offloadedFrom} (Overloaded)</td>
                            <td className="p-3 text-right font-black text-indigo-600 uppercase tracking-wider text-[10px]">
                              👷 {task.contractorSkill} Contractor
                            </td>
                          </tr>
                        ))}
                        {simulationResult.offloadedTasks.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-gray-400 italic">
                              No tasks matched contractor specialties for offloading overloaded personnel.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      // TAB 2: COMPLIANCE & WELLNESS
      {/* ======================================================== */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {loadingReports ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
              <RefreshCw className="animate-spin w-8 h-8 text-indigo-500 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">Fetching active fairness audits and fatigue scores...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Burnout Risks */}
              <div className="lg:col-span-7 bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
                  <div>
                    <h2 className="font-bold text-slate-800">Fatigue & Burnout Risk Audit</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Calculated by weekly loads, meeting density, and recovery buffers</p>
                  </div>
                  <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full uppercase">Health Monitor</span>
                </div>

                <div className="p-5 space-y-4">
                  {burnoutData?.highRiskEmployees?.map((emp: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 flex flex-col md:flex-row gap-4 items-start shadow-sm">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{emp.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-medium">
                              <span className="text-rose-600 font-bold uppercase tracking-wider text-[10px] bg-rose-100 px-1.5 py-0.5 rounded">High Burnout Risk</span>
                              <span>Score: {emp.compositeBurnoutScore}/100</span>
                            </div>
                          </div>
                        </div>

                        {/* Audit Details */}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-600 bg-white border border-rose-50 p-2 rounded-lg">
                          <div>⏳ Weeks over 90%: <span className="font-bold text-slate-800">{emp.factors.consecutiveWeeksOver90Pct}w</span></div>
                          <div>🏖️ PTO taken last 6mo: <span className="font-bold text-slate-800">{emp.factors.ptoTakenLast6MonthsDays} days</span></div>
                          <div>📅 Projects shared: <span className="font-bold text-slate-800">{emp.factors.concurrentProjectsCount}</span></div>
                          <div>🎯 Missed delivery freq: <span className="font-bold text-slate-800">{emp.factors.lateDeliveryFrequencyPct}%</span></div>
                        </div>
                      </div>

                      {/* Prescriptive Interventions */}
                      <div className="md:w-56 space-y-2">
                        <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest leading-none">Mandated Manager Actions</p>
                        {emp.recommendedInterventions.map((act: string, idx: number) => (
                          <div key={idx} className="text-xs bg-white text-rose-950 p-2 rounded-lg border border-rose-100 font-semibold shadow-inner leading-normal flex items-start gap-1">
                            <span>✨</span> {act}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {burnoutData?.highRiskEmployees?.length === 0 && (
                    <div className="text-center py-12 text-gray-400 italic">
                      <p className="text-3xl mb-1">🎉</p>
                      <p className="text-xs">No active staff flags high fatigue ratios this cycle.</p>
                    </div>
                  )}

                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-100 text-xs font-semibold text-slate-500 flex justify-between items-center mt-4">
                    <span>Average Composite Organization Fatigue Index:</span>
                    <span className="text-slate-800 font-bold bg-white px-2 py-0.5 border rounded-lg">{burnoutData?.systemAverageBurnoutScore || 42}/100</span>
                  </div>
                </div>
              </div>

              {/* Right Column: AI Compliance & Bias */}
              <div className="lg:col-span-5 bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
                  <div>
                    <h2 className="font-bold text-slate-800">AI Fairness & Parity Audit</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Demographic Disparate Impact Ratios (perfect target = 1.0)</p>
                  </div>
                  <ShieldCheck size={24} className="text-emerald-500 animate-pulse" />
                </div>

                <div className="p-5 space-y-6">
                  {biasData && (
                    <>
                      {/* Metric Gauges */}
                      <div className="space-y-4">
                        {[
                          { label: 'Gender Parity Ratio', val: biasData.fairnessMetrics.disparateImpactRatioGender, color: COLORS.emerald },
                          { label: 'Age Cohort parity Ratio', val: biasData.fairnessMetrics.disparateImpactRatioAgeGroup, color: COLORS.indigo },
                          { label: 'Location Parity Ratio', val: biasData.fairnessMetrics.disparateImpactRatioLocation, color: COLORS.purple }
                        ].map((m, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-700">
                              <span>{m.label}</span>
                              <span style={{ color: m.color }}>{m.val}</span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-1000" 
                                style={{ 
                                  width: `${Math.min(m.val * 100, 100)}%`,
                                  backgroundColor: m.color 
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* under recommended candidates & override anomalies */}
                      <div className="space-y-3 pt-4 border-t border-gray-100">
                        <div>
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">Under-Recommended Personnel Flag</p>
                          {biasData.fairnessMetrics.underRecommendedCandidates.map((cand: any, idx: number) => (
                            <div key={idx} className="p-3 bg-orange-50/50 border border-orange-100 text-xs rounded-xl">
                              <p className="font-bold text-slate-800">👤 {cand.name} <span className="font-medium text-gray-400">(Skill Match: {cand.skillMatchAvg})</span></p>
                              <p className="text-orange-700 font-semibold mt-1">⚠️ Recommendation Rate: {cand.recommendationRate} — {cand.reason}</p>
                            </div>
                          ))}
                        </div>

                        <div>
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">Override Pattern Anomalies</p>
                          {biasData.fairnessMetrics.overrideAnomalies.map((anom: any, idx: number) => (
                            <div key={idx} className="p-3 bg-red-50/40 border border-red-100 text-xs rounded-xl">
                              <p className="font-bold text-slate-800">📊 {anom.group}</p>
                              <p className="text-red-700 font-semibold mt-1">🚨 Override Rate: {anom.overrideRate} (vs System Average: {anom.systemAvg})</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Compliance Status */}
                      <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-xs font-semibold leading-relaxed flex items-start gap-3 shadow-inner">
                        <CheckCircle className="text-emerald-500 w-5 h-5 shrink-0" />
                        <div>
                          <p className="font-black uppercase tracking-wider text-[9px] text-emerald-700">Audit Status: {biasData.complianceAuditStatus}</p>
                          <p className="mt-1 leading-normal font-medium">{biasData.summary}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      // TAB 3: INTEGRATIONS HUB
      {/* ======================================================== */}
      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-500">
          {/* Plugin Roster */}
          <div className="lg:col-span-8 bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800">Active Tooling Adapters</h2>
              <p className="text-xs text-gray-400 mt-0.5">Integration hooks for continuous engineering sync pipelines</p>
            </div>

            <div className="divide-y divide-gray-100 p-5 space-y-4">
              {[
                { 
                  key: 'jira', 
                  title: 'Jira Issue Tracker Webhook', 
                  icon: Database,
                  color: 'bg-blue-50 text-blue-600',
                  desc: 'Syncs task statuses, scope variations, and backlog items dynamically.',
                  endpoint: '/api/integrations/webhooks/jira'
                },
                { 
                  key: 'calendar', 
                  title: 'Google / MS Calendar Adapter', 
                  icon: Calendar,
                  color: 'bg-purple-50 text-purple-600',
                  desc: 'Ingests Out-of-Office (OOO) blocks and factors meeting density into capacity.',
                  endpoint: '/api/integrations/sync/calendar'
                },
                { 
                  key: 'hris', 
                  title: 'Workday / HRIS Roster sync', 
                  icon: Users,
                  color: 'bg-emerald-50 text-emerald-600',
                  desc: 'Syncs developer lists, salaries, role changes, and compliance directories.',
                  endpoint: '/api/integrations/sync/hris'
                },
                { 
                  key: 'github', 
                  title: 'GitHub commits Tracker', 
                  icon: Github,
                  color: 'bg-slate-900 text-white',
                  desc: 'Monitors commit speeds and alerts managers on stalled deliverables (0 commits / 14d).',
                  endpoint: '/api/integrations/sync/github'
                }
              ].map(plugin => {
                const status = integrationStatus?.[plugin.key] || { name: plugin.title, health: 'Healthy' };
                const isSyncing = syncingPlugin === plugin.key;
                
                return (
                  <div key={plugin.key} className="p-4 rounded-xl border border-gray-100 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-sm transition-all duration-300">
                    <div className="flex gap-4 items-center">
                      <div className={`w-10 h-10 rounded-xl ${plugin.color} flex items-center justify-center font-bold shadow-inner shrink-0`}>
                        <plugin.icon size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm leading-snug">{plugin.title}</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-normal max-w-md">{plugin.desc}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            status.health === 'Healthy' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            Plugin Status: {status.health}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => triggerSync(plugin.key, plugin.endpoint)}
                      disabled={isSyncing || !!syncingPlugin}
                      className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm"
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw className="animate-spin w-3 h-3" /> Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={12} /> Sync Now
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sync logs and exports */}
          <div className="lg:col-span-4 space-y-6">
            {/* Sync Console */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                <h3 className="font-bold text-white text-xs tracking-wider uppercase">Live Integration Console</h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                  <span className="text-[9px] font-bold text-emerald-400 tracking-wider">ONLINE</span>
                </div>
              </div>
              <div className="p-4 h-48 overflow-auto font-mono text-[10px] leading-relaxed text-indigo-200 space-y-1.5 scrollbar-thin">
                {syncLogs.length === 0 ? (
                  <p className="text-slate-500 italic">No sync commands executed this session. Logs will stream here in real-time.</p>
                ) : (
                  syncLogs.map((log, idx) => (
                    <p key={idx} className={log.includes('Error') ? 'text-red-400' : log.includes('Success') ? 'text-emerald-400 font-bold' : ''}>
                      {log}
                    </p>
                  ))
                )}
              </div>
            </div>

            {/* Document Exports Card */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-5 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm">Strategic Reports Directory</h3>
              <p className="text-xs text-gray-400 mt-1 leading-normal">
                Download structured compliance metrics or invoice estimates generated by AI models.
              </p>
              
              <div className="space-y-2 pt-2">
                <a
                  href="/api/advanced/export/executive-summary"
                  target="_blank"
                  className="w-full text-left p-3 rounded-xl border border-gray-200 hover:bg-slate-50 flex items-center gap-3 transition-all text-xs font-bold text-slate-800"
                >
                  <FileText className="text-indigo-500 shrink-0" size={18} />
                  <div>
                    <p className="leading-none">Download Executive Roadmap Report</p>
                    <p className="text-[9px] text-gray-400 mt-1 font-medium">Text payload • Snapshot metadata audit</p>
                  </div>
                </a>

                <a
                  href="/api/advanced/export/billing"
                  target="_blank"
                  className="w-full text-left p-3 rounded-xl border border-gray-200 hover:bg-slate-50 flex items-center gap-3 transition-all text-xs font-bold text-slate-800"
                >
                  <DollarSign className="text-emerald-500 shrink-0" size={18} />
                  <div>
                    <p className="leading-none">Export Financial Staffing CSV</p>
                    <p className="text-[9px] text-gray-400 mt-1 font-medium">Comma Separated Values • standard billing rates</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
