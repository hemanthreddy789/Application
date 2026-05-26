import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { Briefcase, Calendar, Award, Clock, AlertCircle, CheckCircle2, TrendingUp, Sparkles, Check } from 'lucide-react';

const COLOR_MAP: Record<string, string> = {
  overloaded: '#ef4444',
  high: '#f97316',
  moderate: '#3b82f6',
  available: '#10b981',
  off: '#e5e7eb',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-3 text-sm w-48">
      <p className="font-bold text-slate-800">{d?.day_label}</p>
      <p className="text-gray-500 text-xs mt-0.5">{d?.weekday}</p>
      <div className="mt-2 flex justify-between items-center">
        <span className="text-xs text-gray-500 font-medium">Load Level</span>
        <span className="font-bold text-sm" style={{ color: COLOR_MAP[d?.color] || '#6b7280' }}>
          {Math.round(d?.predicted_capacity)}%
        </span>
      </div>
    </div>
  );
};

export default function EmployeeDashboard() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [profile, setProfile] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editProgress, setEditProgress] = useState<number>(0);
  const [updating, setUpdating] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  // Fetch all employees to populate selector
  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(res => {
        const data = res.success ? res.data : res;
        setEmployees(Array.isArray(data) ? data : []);
        if (data.length > 0) {
          setSelectedEmployeeId(data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch profile and forecast details when selected employee changes
  useEffect(() => {
    if (!selectedEmployeeId) return;
    fetchEmployeeDetails(selectedEmployeeId);
  }, [selectedEmployeeId]);

  const fetchEmployeeDetails = async (id: string) => {
    setLoading(true);
    try {
      // 1. Profile with tasks, skills, leaves
      const profileRes = await fetch(`/api/employees/${id}`);
      const profileData = await profileRes.json();
      setProfile(profileData.success ? profileData.data : profileData);

      // 2. 28-day AI Forecast
      const forecastRes = await fetch(`/api/employees/${id}/forecast`);
      const forecastData = await forecastRes.json();
      const actualForecast = forecastData.success ? forecastData.data : forecastData;
      if (actualForecast && actualForecast.forecast) {
        actualForecast.forecast = actualForecast.forecast.map((d: any) => ({
          ...d,
          day_label: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          weekday: new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' }),
          color: d.predicted_capacity > 100 ? 'overloaded' : d.predicted_capacity > 80 ? 'high' : d.predicted_capacity > 50 ? 'moderate' : 'available',
        }));
      }
      setForecast(actualForecast);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (taskId: string) => {
    setUpdating(taskId);
    setFeedbackMsg('');
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          progressPercentage: editProgress
        })
      });

      if (response.ok) {
        setFeedbackMsg('Task updated successfully!');
        setEditingTaskId(null);
        // Refresh employee data to show new workload and status
        await fetchEmployeeDetails(selectedEmployeeId);
      } else {
        setFeedbackMsg('Error updating task.');
      }
    } catch (e) {
      console.error(e);
      setFeedbackMsg('Network error.');
    } finally {
      setUpdating(null);
      setTimeout(() => setFeedbackMsg(''), 3000);
    }
  };

  const startEditing = (task: any) => {
    setEditingTaskId(task.id);
    setEditStatus(task.status);
    setEditProgress(task.progressPercentage);
  };

  if (employees.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const utilization = profile ? Math.round((profile.currentAllocatedHours / profile.weeklyCapacityHours) * 100) : 0;
  
  let workloadAdvice = 'You are available for new projects.';
  let meterColor = 'bg-emerald-500';
  let meterTextColor = 'text-emerald-600';
  let meterBg = 'bg-emerald-50';
  
  if (utilization >= 100) {
    workloadAdvice = 'Warning: Overloaded. Please discuss rebalancing with your manager.';
    meterColor = 'bg-red-500';
    meterTextColor = 'text-red-600';
    meterBg = 'bg-red-50';
  } else if (utilization >= 80) {
    workloadAdvice = 'Capacity near limits. High effort level.';
    meterColor = 'bg-amber-500';
    meterTextColor = 'text-amber-600';
    meterBg = 'bg-amber-50';
  } else if (utilization >= 50) {
    workloadAdvice = 'Balanced and productive workload.';
    meterColor = 'bg-blue-500';
    meterTextColor = 'text-blue-600';
    meterBg = 'bg-blue-50';
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      
      {/* Simulation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-900 text-white rounded-2xl shadow-xl gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl flex items-center justify-center text-white">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold">Simulated Employee Login</h2>
            <p className="text-xs text-slate-400">Select any employee to view their tailored personal portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400">LOGGED IN AS:</span>
          <select
            className="bg-slate-800 border border-slate-700 text-white text-sm font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer w-64"
            value={selectedEmployeeId}
            onChange={e => setSelectedEmployeeId(e.target.value)}
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} — {emp.role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading || !profile ? (
        <div className="flex items-center justify-center h-80 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500 font-medium">Fetching Portal Data...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-500">
          
          {/* LEFT COLUMN: Profile & Skills & Capacity */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Profile Glass Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-8 -mt-8 opacity-50 blur-lg"></div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl relative border-2 border-indigo-500">
                  {profile.name.split(' ').map((n: string) => n[0]).join('')}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">{profile.name}</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">{profile.role} • {profile.department}</p>
                  <span className="inline-block mt-2 text-[10px] bg-slate-100 border text-slate-600 px-2 py-0.5 rounded-full font-bold">
                    ID: {profile.employeeCode}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t pt-4">
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Level</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{profile.experienceLevel}</p>
                </div>
                <div className="text-center border-x">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Rating</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">⭐ {profile.qualityRating?.toFixed(1) || '4.0'}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">On-Time</p>
                  <p className="text-sm font-bold text-emerald-600 mt-0.5">{Math.round(profile.onTimeDeliveryRate || 90)}%</p>
                </div>
              </div>
            </div>

            {/* Weekly Capacity Ring Meter */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-800">Capacity Allocation</h4>
                <Clock size={16} className="text-gray-400" />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 mb-4">
                <div>
                  <p className="text-xs text-gray-400 font-medium">Assigned Load</p>
                  <p className="text-xl font-black text-slate-800 mt-1">{profile.currentAllocatedHours} hrs</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-medium">Weekly Limit</p>
                  <p className="text-sm font-bold text-gray-600 mt-1">{profile.weeklyCapacityHours} hrs</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Utilization Level</span>
                  <span className={`font-bold ${meterTextColor}`}>{utilization}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${meterColor}`} style={{ width: `${Math.min(utilization, 100)}%` }}></div>
                </div>
              </div>

              {/* Workload Advisor */}
              <div className={`mt-4 p-3 rounded-xl border flex items-start gap-2.5 text-xs font-semibold leading-normal ${meterBg} border-transparent`}>
                <AlertCircle size={16} className={`shrink-0 ${meterTextColor} mt-0.5`} />
                <p className={meterTextColor}>{workloadAdvice}</p>
              </div>
            </div>

            {/* Daily Bandwidth Card */}
            {(() => {
              const availableHoursPerDay = Math.max(0, Math.round(((profile.weeklyCapacityHours - profile.currentAllocatedHours) / 5) * 10) / 10);
              const totalHoursPerDay = Math.round(profile.weeklyCapacityHours / 5);
              const usedHoursPerDay = Math.max(0, totalHoursPerDay - availableHoursPerDay);
              const pct = Math.min(100, Math.round((usedHoursPerDay / totalHoursPerDay) * 100));
              const color = availableHoursPerDay >= 3 ? 'emerald' : availableHoursPerDay >= 1 ? 'orange' : 'red';
              const taskAssignments = (profile as any).taskAssignments || [];
              return (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-slate-800">Daily Bandwidth</h4>
                    <TrendingUp size={18} className="text-indigo-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className={`rounded-xl p-3 text-center bg-${color}-50 border border-${color}-100`}>
                      <p className={`text-2xl font-black text-${color}-600`}>{availableHoursPerDay}h</p>
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5">Available Today</p>
                    </div>
                    <div className="rounded-xl p-3 text-center bg-slate-50 border border-slate-100">
                      <p className="text-2xl font-black text-slate-700">{totalHoursPerDay}h</p>
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5">Daily Capacity</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Today's Utilization</span>
                      <span className="font-bold text-slate-700">{pct}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-${color}-500 transition-all`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                  {taskAssignments.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Allocations</p>
                      {taskAssignments.filter((a: any) => a.task?.status !== 'Completed').map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                          <span className="text-xs text-slate-700 font-medium truncate max-w-[130px]">{a.task?.title || 'Task'}</span>
                          <span className="text-xs font-bold text-indigo-600 shrink-0 ml-2">{a.allocatedHoursPerDay}h/day</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Skill Badges Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-800">My Expertise</h4>
                <Award size={18} className="text-indigo-500" />
              </div>

              {profile.skills && profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s: any) => (
                    <div 
                      key={s.skill.id}
                      className="bg-indigo-50/50 border border-indigo-100/50 text-indigo-950 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span>{s.skill.name}</span>
                      <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                        L{s.proficiencyLevel}
                      </span>
                      {s.isCertified && (
                        <span className="text-amber-500 font-bold" title="Certified Expert">★</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-xs italic">No skills registered yet.</p>
              )}
            </div>

            {/* My Leaves Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-800">Time Off & Calendar</h4>
                <Calendar size={18} className="text-indigo-500" />
              </div>

              {profile.leaves && profile.leaves.length > 0 ? (
                <div className="space-y-2.5">
                  {profile.leaves.map((l: any) => (
                    <div key={l.id} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{l.leaveType} Leave</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(l.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — {new Date(l.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${l.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {l.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-xs italic">No leaves scheduled currently.</p>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Active Tasks & 28-day forecast */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* My Assigned Tasks Section */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">Task Allocations</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Update task status and logs directly as they progress</p>
                </div>
                {feedbackMsg && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 animate-fade-in">
                    {feedbackMsg}
                  </span>
                )}
              </div>

              {profile.assignedTasks && profile.assignedTasks.length > 0 ? (
                <div className="space-y-4">
                  {profile.assignedTasks.map((t: any) => {
                    const isEditing = editingTaskId === t.id;
                    const taskAlloc = ((profile as any).taskAssignments || []).find((a: any) => a.taskId === t.id);
                    const daysLeft = Math.max(1, Math.floor((new Date(t.deadline).getTime() - Date.now()) / 86400000));
                    return (
                      <div 
                        key={t.id}
                        className={`p-5 rounded-2xl border transition-all duration-300 ${isEditing ? 'border-indigo-500 bg-indigo-50/10 shadow-lg' : 'border-gray-100 hover:border-indigo-100 hover:bg-slate-50/20'}`}
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold bg-slate-100 border text-slate-600 px-2 py-0.5 rounded-full uppercase">
                                {t.taskType}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${t.priority === 'Urgent' || t.priority === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                                {t.priority}
                              </span>
                              {t.status === 'Completed' && (
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                  <CheckCircle2 size={10} /> Completed
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 text-base mt-2">{t.title}</h4>
                            {t.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{t.description}</p>
                            )}
                            
                            <div className="flex items-center gap-4 mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex-wrap">
                              <span className="flex items-center gap-1"><Briefcase size={12} /> {t.project?.name || 'Assigned Project'}</span>
                              <span className="flex items-center gap-1"><Clock size={12} /> {t.estimatedHours} Hours Est</span>
                              <span className="flex items-center gap-1"><Calendar size={12} /> Due {new Date(t.deadline).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1 text-slate-500">⏱ {daysLeft}d left</span>
                            </div>
                            {taskAlloc && (
                              <div className="mt-3 flex items-center gap-2 flex-wrap">
                                <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
                                  <Clock size={10} /> {taskAlloc.allocatedHoursPerDay}h/day allocated
                                </div>
                                <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full">
                                  Total: {taskAlloc.totalAllocatedHours}h
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {!isEditing ? (
                              <button 
                                onClick={() => startEditing(t)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                              >
                                Edit Progress
                              </button>
                            ) : (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleUpdateTask(t.id)}
                                  disabled={updating === t.id}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1 shadow-sm shadow-indigo-100"
                                >
                                  {updating === t.id ? 'Saving...' : 'Save'} <Check size={12} />
                                </button>
                                <button 
                                  onClick={() => setEditingTaskId(null)}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Task Edit Area / Slider Panel */}
                        {isEditing && (
                          <div className="mt-5 pt-5 border-t border-dashed border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-300">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Change Status</label>
                              <div className="flex gap-2">
                                {['Not Started', 'In Progress', 'Blocked', 'Completed'].map(st => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => {
                                      setEditStatus(st);
                                      if (st === 'Completed') setEditProgress(100);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${editStatus === st ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'}`}
                                  >
                                    {st}
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Progress percentage</label>
                                <span className="text-xs font-black text-indigo-600">{editProgress}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={editProgress} 
                                onChange={e => {
                                  const val = parseInt(e.target.value);
                                  setEditProgress(val);
                                  if (val === 100) setEditStatus('Completed');
                                  else if (val > 0 && editStatus === 'Not Started') setEditStatus('In Progress');
                                }}
                                className="w-full accent-indigo-600 cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
                              />
                            </div>
                          </div>
                        )}

                        {/* Static Progress Indicator */}
                        {!isEditing && (
                          <div className="mt-4 pt-4 border-t border-gray-50 space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              <span>Work Completion Progress</span>
                              <span className="text-slate-800">{t.progressPercentage}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${t.status === 'Completed' ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${t.progressPercentage}%` }}></div>
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 border rounded-2xl border-dashed">
                  <span className="text-4xl">😴</span>
                  <h4 className="font-bold text-slate-800 mt-3">You're All Clear!</h4>
                  <p className="text-xs text-gray-500 mt-1">No active tasks are assigned to you for the week.</p>
                </div>
              )}
            </div>

            {/* AI Capacity 28-day line chart forecast */}
            {forecast && forecast.forecast && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-slate-800">My 28-Day Capacity Forecast</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Machine Learning calculated load level prediction based on active timelines</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl">
                    <TrendingUp size={14} /> AI Forecast Model V{forecast.modelVersion}
                  </div>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecast.forecast} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="personalForecastGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="day_label" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis domain={[0, 150]} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={100} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={2} label={{ position: 'top', value: 'MAX CAPACITY', fill: '#f43f5e', fontSize: 9, fontWeight: 'black' }} />
                      <Area type="monotone" dataKey="predicted_capacity" stroke="#4f46e5" strokeWidth={3} fill="url(#personalForecastGrad)" 
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (payload.predicted_capacity < 100) return <></>;
                          return <circle key={payload.date} cx={cx} cy={cy} r={4.5} fill="#f43f5e" stroke="white" strokeWidth={2} />;
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
