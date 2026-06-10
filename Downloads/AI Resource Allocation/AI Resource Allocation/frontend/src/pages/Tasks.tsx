import React, { useEffect, useState } from 'react';

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [projectData, setProjectData] = useState({ name: '', description: '' });
  const [taskData, setTaskData] = useState({ title: '', projectId: '', description: '', taskType: 'Development', complexity: 'Medium', estimatedHours: 10, deadline: '' });
  
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const [isParsing, setIsParsing] = useState(false);
  const [parseConfidence, setParseConfidence] = useState<number | null>(null);
  const [clarification, setClarification] = useState<string | null>(null);

  // Feedback specific states
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [pendingAssign, setPendingAssign] = useState<any>(null);
  const [overrideReason, setOverrideReason] = useState('Personal knowledge of employee');

  const [riskData, setRiskData] = useState<Record<string, any>>({});
  const [selectedRisk, setSelectedRisk] = useState<any>(null);

  // Multi-assign state
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [isMultiAssigning, setIsMultiAssigning] = useState(false);

  const fetchData = async () => {
    try {
      const tasksRes = await fetch('/api/tasks');
      const tasksRaw = await tasksRes.json();
      const tasksData = tasksRaw.success ? tasksRaw.data : tasksRaw;
      const tasksArray = Array.isArray(tasksData) ? tasksData : [];
      setTasks(tasksArray);

      const projectsRes = await fetch('/api/projects');
      const projectsRaw = await projectsRes.json();
      const projectsData = projectsRaw.success ? projectsRaw.data : projectsRaw;
      setProjects(Array.isArray(projectsData) ? projectsData : []);

      // Fetch risk for all tasks in bulk
      if (tasksArray.length > 0) {
        const riskRes = await fetch('/api/tasks/bulk-delay-risk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskIds: tasksArray.map((t: any) => t.id) })
        });
        const riskDataRaw = await riskRes.json();
        setRiskData(riskDataRaw.success ? riskDataRaw.data : riskDataRaw);
      }

      // Auto-select task from URL query param
      const params = new URLSearchParams(window.location.search);
      const taskId = params.get('taskId');
      if (taskId) {
        const task = tasksArray.find((t: any) => t.id === taskId);
        if (task) {
          setSelectedTask(task);
          
          // Load recommendations immediately
          const recRes = await fetch(`/api/tasks/${taskId}/recommend`, { method: 'POST' });
          const recData = await recRes.json();
          setRecommendations(recData);
          
          // Expand the project section so the task is visible
          if (task.projectId) {
            setExpandedProjects(prev => prev.includes(task.projectId) ? prev : [...prev, task.projectId]);
          }
        }
      }
    } catch (e) { 
      console.error('Fetch data failed:', e);
      setTasks([]);
      setProjects([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    });
    setShowAddProject(false);
    setProjectData({ name: '', description: '' });
    fetchData();
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    setShowAddTask(false);
    setTaskData({ title: '', projectId: '', description: '', taskType: 'Development', complexity: 'Medium', estimatedHours: 10, deadline: '' });
    setParseConfidence(null);
    setClarification(null);
    fetchData();
  };

  const handleParseTask = async () => {
    if (!taskData.description) return;
    setIsParsing(true);
    setClarification(null);
    try {
      const res = await fetch('/api/tasks/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: taskData.description })
      });
      if (res.ok) {
        const data = await res.json();
        setTaskData(prev => ({
          ...prev,
          title: data.title || prev.title,
          taskType: data.task_type || prev.taskType,
          complexity: data.complexity || prev.complexity,
          estimatedHours: data.estimated_hours || prev.estimatedHours,
          deadline: data.suggested_deadline || prev.deadline
        }));
        setParseConfidence(data.confidence);
        setClarification(data.clarification_needed);
      }
    } catch (e) { console.error(e); }
    setIsParsing(false);
  };

  const handleRecommend = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}/recommend`, { method: 'POST' });
    const data = await res.json();
    setRecommendations(data);
    setSelectedTask(tasks.find(t => t.id === taskId));
    setSelectedEmployees(new Set());
  };

  const toggleEmployeeSelect = (empId: string) => {
    setSelectedEmployees(prev => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  const handleMultiAssign = async () => {
    if (!selectedTask || selectedEmployees.size === 0) return;
    setIsMultiAssigning(true);
    const daysUntilDeadline = Math.max(1, Math.floor((new Date(selectedTask.deadline).getTime() - Date.now()) / 86400000));
    const totalHours = selectedTask.estimatedHours;
    const hoursPerEmployee = totalHours / selectedEmployees.size;
    const hoursPerDay = hoursPerEmployee / daysUntilDeadline;

    const assignments = Array.from(selectedEmployees).map(empId => ({
      employeeId: empId,
      allocatedHoursPerDay: Math.round(hoursPerDay * 10) / 10,
      totalAllocatedHours: Math.round(hoursPerEmployee * 10) / 10
    }));

    await fetch(`/api/tasks/${selectedTask.id}/multi-assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignments })
    });

    // Submit feedback for the first (primary) assigned employee
    if (recommendations.length > 0) {
      const primaryId = assignments[0].employeeId;
      const isTopPick = primaryId === recommendations[0]?.employeeId;
      await fetch(`/api/tasks/${selectedTask.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: isTopPick ? 'accepted' : 'overridden',
          recommendedEmployeeId: recommendations[0]?.employeeId,
          actualEmployeeId: primaryId,
          overrideReason: selectedEmployees.size > 1 ? 'Multi-employee allocation' : undefined
        })
      });
    }

    setIsMultiAssigning(false);
    setSelectedTask(null);
    setSelectedEmployees(new Set());
    fetchData();
  };

  const processAssignment = async (employeeId: string, isOverride: boolean, reason?: string) => {
    if (!selectedTask) return;
    
    // 1. Assign Task
    await fetch(`/api/tasks/${selectedTask.id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId })
    });

    // 2. Submit Feedback Event
    await fetch(`/api/tasks/${selectedTask.id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: isOverride ? 'overridden' : 'accepted',
        recommendedEmployeeId: recommendations[0].employeeId,
        actualEmployeeId: employeeId,
        overrideReason: reason
      })
    });

    setOverrideModalOpen(false);
    setSelectedTask(null);
    fetchData();
  };

  const handleComplete = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}/complete`, { method: 'POST' });
    fetchData();
  };

  const handleAssignClick = (rec: any, idx: number) => {
    if (idx === 0) {
      // Top recommendation -> direct accept
      processAssignment(rec.employeeId, false);
    } else {
      // Not top recommendation -> override
      setPendingAssign(rec);
      setOverrideModalOpen(true);
    }
  };

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Tasks & Projects</h1>
          <div className="flex gap-3">
            <button onClick={() => { setShowAddProject(!showAddProject); setShowAddTask(false); }} style={{ background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--t2)' }} className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80">
              New Project
            </button>
            <button onClick={() => { setShowAddTask(!showAddTask); setShowAddProject(false); }} style={{ background: 'var(--ac)', color: 'var(--ac-fg)' }} className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-85">
              New Task
            </button>
          </div>
        </div>

        {showAddProject && (
          <div className="p-6 rounded-xl shadow-sm" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--t1)' }}>Create Project</h2>
            <form onSubmit={handleAddProject} className="flex gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--t2)' }}>Project Name</label>
                <input required type="text" value={projectData.name} onChange={e => setProjectData({...projectData, name: e.target.value})} className="rounded-lg px-3 py-2 text-sm w-64 outline-none" style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)', color: 'var(--t1)' }} placeholder="e.g. Website Redesign" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Save</button>
                <button type="button" onClick={() => setShowAddProject(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-sub)', color: 'var(--t2)' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {showAddTask && (
          <div className="p-6 rounded-xl shadow-sm" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--t1)' }}>Create Task with AI</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--t2)' }}>Describe the task in plain English</label>
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  className="flex-1 rounded-lg px-3 py-2 text-sm w-full outline-none" style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)', color: 'var(--t1)' }}
                  placeholder="e.g. Build a REST API for user authentication using JWT and store sessions in Redis. Medium complexity backend work. Needed by Friday."
                  value={taskData.description}
                  onChange={e => setTaskData({...taskData, description: e.target.value})}
                />
                <button 
                  type="button" 
                  onClick={handleParseTask}
                  disabled={isParsing || !taskData.description}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {isParsing ? 'Parsing...' : 'Auto-Fill'}
                </button>
              </div>
              {clarification && (
                <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded border border-amber-200">AI needs clarification: {clarification}</p>
              )}
              {parseConfidence && !clarification && (
                <p className="text-xs text-green-600 mt-2">Parsed successfully with {Math.round(parseConfidence * 100)}% confidence</p>
              )}
            </div>

            <form onSubmit={handleAddTask} className="flex flex-wrap gap-4 items-end p-4 rounded-lg" style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)' }}>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--t2)' }}>Task Title</label>
                <input required type="text" value={taskData.title} onChange={e => setTaskData({...taskData, title: e.target.value})} className="rounded-lg px-3 py-2 text-sm w-64 outline-none" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--t1)' }} />
              </div>
              <div className="w-full">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--t2)' }}>Description</label>
                <textarea value={taskData.description} onChange={e => setTaskData({...taskData, description: e.target.value})} className="rounded-lg px-3 py-2 text-sm w-full h-16 outline-none" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--t1)' }} placeholder="Task details..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--t2)' }}>Project</label>
                <select required value={taskData.projectId} onChange={e => setTaskData({...taskData, projectId: e.target.value})} className="rounded-lg px-3 py-2 text-sm w-48 outline-none" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--t1)' }}>
                  <option value="" disabled>Select Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--t2)' }}>Est. Hours</label>
                <input required type="number" value={taskData.estimatedHours} onChange={e => setTaskData({...taskData, estimatedHours: parseInt(e.target.value)})} className="rounded-lg px-3 py-2 text-sm w-24 outline-none" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--t1)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--t2)' }}>Complexity</label>
                <select required value={taskData.complexity} onChange={e => setTaskData({...taskData, complexity: e.target.value})} className="rounded-lg px-3 py-2 text-sm w-32 outline-none" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--t1)' }}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>
              <div className="flex gap-2 ml-auto">
                <button type="submit" className="px-6 py-2 rounded-lg text-sm font-medium hover:opacity-85" style={{ background: 'var(--ac)', color: 'var(--ac-fg)' }}>Save Task</button>
                <button type="button" onClick={() => setShowAddTask(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', color: 'var(--t2)' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-auto pb-8">
          {projects.map(project => {
            const projectTasks = tasks.filter(t => t.projectId === project.id);
            if (projectTasks.length === 0) return null;
            
            const isExpanded = expandedProjects.includes(project.id);
            const completedCount = projectTasks.filter(t => t.status === 'Completed').length;
            const progressPct = Math.round((completedCount / projectTasks.length) * 100) || 0;

            return (
              <div key={project.id} className="rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md" style={{ border: '1px solid var(--card-border)' }}>
                <div
                  className="p-4 flex items-center justify-between cursor-pointer transition-colors hover:opacity-90"
                  style={{ background: 'var(--bg-sub)', borderBottom: '1px solid var(--card-border)' }}
                  onClick={() => toggleProject(project.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                      <svg className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: 'var(--t1)' }}>{project.name}</h3>
                      <p className="text-sm text-slate-400">{projectTasks.length} Tasks assigned</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{progressPct}%</p>
                      <p className="text-xs text-slate-500">Completed</p>
                    </div>
                    <div className="w-32 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--card-border)' }}>
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ background: 'var(--card)' }}>
                    <table className="w-full text-left border-collapse">
                      <thead className="text-xs uppercase tracking-wider text-slate-500" style={{ background: 'var(--bg-sub)', borderBottom: '1px solid var(--card-border)' }}>
                        <tr>
                          <th className="p-4 font-semibold">Title</th>
                          <th className="p-4 font-semibold">Status</th>
                          <th className="p-4 font-semibold">Assignee</th>
                          <th className="p-4 font-semibold">Risk Level</th>
                          <th className="p-4 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {projectTasks.map(task => {
                          const risk = riskData[task.id];
                          const riskColor = risk?.risk_level === 'high' ? 'bg-red-50 text-red-700 border-red-200' : 
                                            risk?.risk_level === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          
                          return (
                            <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="p-4">
                                <p className="font-semibold" style={{ color: 'var(--t1)' }}>{task.title}</p>
                                {task.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</p>}
                                <p className="text-xs text-slate-400 mt-1">{task.estimatedHours}h • Due: {new Date(task.deadline).toLocaleDateString()}</p>
                              </td>
                              <td className="p-4">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {task.status}
                                </span>
                              </td>
                              <td className="p-4">
                                {task.assignedEmployee ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                      {task.assignedEmployee.name.charAt(0)}
                                    </div>
                                    <span className="text-sm" style={{ color: 'var(--t2)' }}>{task.assignedEmployee.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-slate-500 italic">Unassigned</span>
                                )}
                              </td>
                              <td className="p-4">
                                {risk ? (
                                  <button 
                                    onClick={() => setSelectedRisk(risk)}
                                    className={`text-xs px-3 py-1 rounded-full font-bold uppercase border ${riskColor} hover:shadow-sm transition-all`}
                                    title={`${Math.round(risk.delay_probability * 100)}% Delay Risk`}
                                  >
                                    {risk.risk_level} Risk
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-600">-</span>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                {task.status === 'In Progress' ? (
                                  <div className="flex gap-2 justify-end">
                                    <button 
                                      onClick={() => handleComplete(task.id)}
                                      className="text-xs px-3 py-1.5 rounded-lg transition-all shadow-sm hover:text-green-600 hover:border-green-300" style={{ border: '1px solid var(--card-border)', color: 'var(--t2)' }}
                                    >
                                      Complete
                                    </button>
                                    <button
                                      onClick={() => handleRecommend(task.id)}
                                      className="text-xs px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1 hover:text-indigo-600 hover:border-indigo-300" style={{ border: '1px solid var(--card-border)', color: 'var(--t2)' }}
                                    >
                                      Reassign
                                    </button>
                                  </div>
                                ) : task.status === 'Completed' ? (
                                  <span className="text-xs text-emerald-600 font-medium flex justify-end items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Done
                                  </span>
                                ) : (
                                  <button 
                                    onClick={() => handleRecommend(task.id)}
                                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 flex items-center gap-1 ml-auto"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    Assign AI
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedTask && (
        <div className="w-[420px] rounded-xl flex flex-col overflow-auto shadow-lg shrink-0" style={{ border: '1px solid var(--card-border)', background: 'var(--card)' }}>
          {/* Header */}
          <div className="p-5 border-b border-white/[0.06] bg-indigo-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider mb-1">AI Analysis</p>
                <h2 className="text-lg font-bold" style={{ color: 'var(--t1)' }}>{selectedTask.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedTask.estimatedHours}h • {selectedTask.complexity} • Due {new Date(selectedTask.deadline).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-slate-500 hover:text-slate-300 text-xl font-bold">×</button>
            </div>
            <div className="mt-3 flex gap-2">
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{selectedTask.taskType}</span>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{selectedTask.priority} Priority</span>
            </div>
          </div>

          {/* Feasibility Summary */}
          {(() => {
            const daysLeft = Math.max(1, Math.floor((new Date(selectedTask.deadline).getTime() - Date.now()) / 86400000));
            const totalHours = selectedTask.estimatedHours;
            const topRec = recommendations[0];
            const topAvailPerDay = topRec ? Math.max(0, (topRec.weeklyCapacityHours - topRec.currentAllocatedHours) / 5) : 0;
            const topCanFinish = topAvailPerDay * daysLeft >= totalHours;
            return (
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--bg-sub)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Feasibility Check</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${topCanFinish ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                    {topCanFinish ? 'Achievable Solo' : 'Team Recommended'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg p-2" style={{ border: '1px solid var(--card-border)' }}>
                    <p className="text-base font-black" style={{ color: 'var(--t1)' }}>{totalHours}h</p>
                    <p className="text-[10px] text-slate-500 font-medium">Total Effort</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 p-2">
                    <p className="text-base font-black text-white">{daysLeft}d</p>
                    <p className="text-[10px] text-slate-500 font-medium">Days Left</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 p-2">
                    <p className="text-base font-black text-indigo-600">{Math.ceil(totalHours / Math.max(daysLeft * topAvailPerDay, 0.1))}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Min People</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Scoring Legend */}
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <p className="text-xs text-slate-400 font-medium mb-1.5">AI scoring weights:</p>
            <div className="flex gap-2 flex-wrap">
              {[['Availability','40%','blue'],['Skill Match','30%','indigo'],['Performance','20%','emerald'],['Deadline Fit','10%','orange']].map(([label, w, c]) => (
                <span key={label} className={`text-xs bg-${c}-50 text-${c}-700 px-2 py-0.5 rounded-full border border-${c}-100`}>{label} {w}</span>
              ))}
            </div>
          </div>

          {/* Candidates */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {recommendations.length === 0 && (
              <div className="text-center text-slate-500 py-8">
                <p className="text-sm">Analyzing candidates...</p>
              </div>
            )}
            {recommendations.slice(0, 5).map((rec, idx) => {
              const isTop = idx === 0;
              const scoreColor = rec.finalScore >= 70 ? 'text-emerald-600' : rec.finalScore >= 50 ? 'text-orange-500' : 'text-red-500';
              const availColor = rec.availabilityScore >= 70 ? 'bg-emerald-400' : rec.availabilityScore >= 30 ? 'bg-orange-400' : 'bg-red-400';
              const daysLeft = Math.max(1, Math.floor((new Date(selectedTask.deadline).getTime() - Date.now()) / 86400000));
              const availPerDay = Math.max(0, (rec.weeklyCapacityHours - rec.currentAllocatedHours) / 5);
              const canFinish = availPerDay * daysLeft >= selectedTask.estimatedHours;
              const isSelected = selectedEmployees.has(rec.employeeId);
              return (
                <div
                  key={rec.employeeId}
                  onClick={() => rec.deadlineCompatibilityScore > 0 && toggleEmployeeSelect(rec.employeeId)}
                  className={`rounded-xl border-2 p-4 transition-all cursor-pointer ${
                    isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md' :
                    isTop ? 'border-indigo-200 bg-indigo-50/30 shadow-sm' : 'border-white/[0.06]'
                  } ${rec.deadlineCompatibilityScore === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:border-indigo-300'}`
                }>
                  {/* Rank + Name */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                        isTop ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{idx + 1}</div>
                      <div>
                        <p className="font-bold text-white">{rec.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-slate-400">{rec.role}</span>
                          {rec.upcomingLeaves?.length > 0 && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">
                              Leave: {new Date(rec.upcomingLeaves[0].startDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} - {new Date(rec.upcomingLeaves[0].endDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black ${scoreColor}`}>{Math.round(rec.finalScore)}</p>
                      <p className="text-xs text-slate-500">/ 100 pts</p>
                    </div>
                  </div>

                  {/* Score bars */}
                  <div className="space-y-2 mb-3">
                    {[
                      { label: 'Availability', score: rec.availabilityScore, color: availColor, detail: `${rec.currentAllocatedHours}/${rec.weeklyCapacityHours}h used` },
                      { label: 'Skill Match', score: rec.skillMatchScore, color: 'bg-indigo-400', detail: `${rec.role}` },
                      { label: 'Performance', score: rec.performanceScore, color: rec.performanceScore >= 80 ? 'bg-emerald-400' : 'bg-orange-400', detail: `History` },
                      { label: 'Deadline Fit', score: rec.deadlineCompatibilityScore, color: rec.deadlineCompatibilityScore > 50 ? 'bg-blue-400' : 'bg-red-400', detail: rec.deadlineCompatibilityScore === 0 ? 'On Leave!' : 'OK' },
                    ].map(({ label, score, color, detail }) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>{label}</span>
                          <span className="font-semibold text-slate-200">{Math.round(score)}% <span className="font-normal text-slate-500">({detail})</span></span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full">
                          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(score, 100)}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bandwidth */}
                  <div className="mb-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-xs text-slate-500 font-medium">Daily Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${availPerDay >= 2 ? 'text-emerald-600' : availPerDay >= 1 ? 'text-orange-500' : 'text-red-500'}`}>
                        {availPerDay.toFixed(1)}h/day
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${canFinish ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                        {canFinish ? 'Solo OK' : 'Needs Team'}
                      </span>
                    </div>
                  </div>

                  {/* AI Explanation */}
                  <div className="mb-3">
                    <details className="group">
                      <summary className="text-xs text-indigo-600 font-semibold cursor-pointer hover:underline">Why recommended?</summary>
                      <div className="mt-2 text-xs text-slate-300 bg-white/[0.04] rounded-lg p-2 border border-gray-100 leading-relaxed">
                        <p className="mb-1"><strong>Summary:</strong> {rec.reasonSummary || rec.explanation}</p>
                        {rec.domainExpertBonus > 0 && <p className="text-emerald-600 font-medium flex items-center gap-1"><span>🏆</span> Domain Expert Bonus: +{rec.domainExpertBonus} pts</p>}
                        {rec.penaltyApplied && <p className="text-red-600 font-medium flex items-center gap-1">Penalty applied: Low skill match</p>}
                        <div className="mt-1 pt-1 border-t border-white/[0.06] text-[10px] text-slate-500">
                          <strong>Scoring:</strong> {rec.explanation}
                        </div>
                      </div>
                    </details>
                  </div>

                  <p className="text-[10px] text-center text-slate-500 mt-1">
                    {rec.deadlineCompatibilityScore === 0 ? 'On leave - cannot assign' : isSelected ? 'Selected for allocation' : 'Click to select'}
                  </p>
                </div>
              );
            })}

            {/* Allocation Plan */}
            {selectedEmployees.size > 0 && (() => {
              const daysLeft = Math.max(1, Math.floor((new Date(selectedTask.deadline).getTime() - Date.now()) / 86400000));
              const totalHours = selectedTask.estimatedHours;
              const selectedRecs = recommendations.filter(r => selectedEmployees.has(r.employeeId));
              const totalCapPerDay = selectedRecs.reduce((s, r) => s + Math.max(0, (r.weeklyCapacityHours - r.currentAllocatedHours) / 5), 0);
              const daysNeeded = totalHours / Math.max(totalCapPerDay, 0.1);
              const feasible = daysNeeded <= daysLeft;
              const hoursPerEmpPerDay = totalHours / selectedEmployees.size / daysLeft;
              return (
                <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Allocation Plan</p>
                  <div className="space-y-2 mb-4">
                    {selectedRecs.map(r => (
                      <div key={r.employeeId} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                        <span className="text-sm font-semibold">{r.name}</span>
                        <span className="text-xs text-slate-300">{hoursPerEmpPerDay.toFixed(1)}h/day × {daysLeft}d = {(totalHours / selectedEmployees.size).toFixed(1)}h</span>
                      </div>
                    ))}
                  </div>
                  <div className={`text-xs rounded-lg px-3 py-2 mb-4 font-semibold flex items-center gap-2 ${feasible ? 'bg-emerald-800 text-emerald-200' : 'bg-red-900 text-red-200'}`}>
                    {feasible
                      ? `Feasible - team completes in ~${Math.ceil(daysNeeded)} days (${daysLeft} days available)`
                      : `Not feasible - needs ~${Math.ceil(daysNeeded)} days but only ${daysLeft} available`}
                  </div>
                  <button
                    onClick={handleMultiAssign}
                    disabled={isMultiAssigning || !feasible}
                    className="w-full py-2.5 rounded-lg text-sm font-bold bg-indigo-500 hover:bg-indigo-400 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isMultiAssigning ? 'Assigning...' : `Assign ${selectedEmployees.size} Employee${selectedEmployees.size > 1 ? 's' : ''}`}
                  </button>
                  {!feasible && (
                    <button
                      onClick={handleMultiAssign}
                      disabled={isMultiAssigning}
                      className="w-full mt-2 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-300 transition-all"
                    >
                      Force Assign Anyway
                    </button>
                  )}
                </div>
              );
            })()}

            {recommendations.length > 5 && (
              <div className="pt-6 border-t border-white/10 mt-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Other Available Employees (Manager Override)</h3>
                <div className="space-y-2">
                  {recommendations.slice(5).map((rec, idx) => (
                    <div key={rec.employeeId} className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10/80 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white text-sm">{rec.name}</p>
                          {rec.explanation.includes('Domain Expert') && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">🏆 Expert</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{rec.role} • {rec.finalScore} pts • Util: {Math.round((rec.currentAllocatedHours/rec.weeklyCapacityHours)*100)}%</p>
                      </div>
                      <button
                        onClick={() => handleAssignClick(rec, idx + 5)}
                        disabled={rec.deadlineCompatibilityScore === 0}
                        className="text-xs border border-white/10 text-slate-200 px-3 py-1.5 rounded-lg hover:bg-white/5 font-semibold disabled:opacity-50 shadow-sm"
                      >
                        {rec.deadlineCompatibilityScore === 0 ? 'On Leave' : 'Assign (Override)'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {overrideModalOpen && pendingAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 w-96 shadow-xl">
            <h2 className="text-lg font-bold mb-2">Override AI Recommendation</h2>
            <p className="text-sm text-slate-300 mb-4">
              You chose <strong>{pendingAssign.name}</strong> instead of the top AI recommendation (<strong>{recommendations[0]?.name}</strong>). Please tell us why to help improve the AI.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Reason</label>
                <select 
                  className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                >
                  <option>Personal knowledge of employee</option>
                  <option>Workload not reflected in system</option>
                  <option>Skill not captured in profile</option>
                  <option>Team dynamics reason</option>
                  <option>Employee requested this task</option>
                  <option>Other (specify)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => processAssignment(pendingAssign.employeeId, true, overrideReason)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Confirm Assignment</button>
              <button onClick={() => setOverrideModalOpen(false)} className="flex-1 bg-white/[0.06] text-slate-200 py-2 rounded-lg text-sm font-medium hover:bg-white/10">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {selectedRisk && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 w-[500px] shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Delay Risk Analysis</h2>
                <p className="text-sm text-slate-400">{Math.round(selectedRisk.delay_probability * 100)}% Probability of Delay</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${
                selectedRisk.risk_level === 'high' ? 'bg-red-100 text-red-700' : 
                selectedRisk.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
              }`}>
                {selectedRisk.risk_level} Risk
              </span>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-200 mb-2">Top Risk Factors</h3>
              <div className="space-y-3">
                {selectedRisk.top_risk_factors.map((f: any, i: number) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-300 capitalize">{f.factor.replace('_', ' ')}</span>
                      <span className="text-slate-400">{Math.round(f.contribution * 100)}%</span>
                    </div>
                    <div className="w-full bg-white/[0.06] rounded-full h-1.5 mb-1">
                      <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${f.contribution * 100}%` }}></div>
                    </div>
                    <p className="text-xs text-slate-400">{f.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-200 mb-2">AI Recommended Actions</h3>
              <div className="space-y-2">
                {selectedRisk.recommended_actions.map((act: string, i: number) => (
                  <div key={i} className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-sm text-blue-800 cursor-pointer hover:bg-blue-100 transition-colors">
                    {act}
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setSelectedRisk(null)} className="w-full bg-white/[0.06] text-slate-200 py-2 rounded-lg text-sm font-medium hover:bg-white/10">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
