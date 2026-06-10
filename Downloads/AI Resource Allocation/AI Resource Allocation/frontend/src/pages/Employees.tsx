import { useEffect, useState } from 'react';

export default function Employees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'Developer', department: 'Engineering' });

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [newSkill, setNewSkill] = useState({ name: '', proficiencyLevel: 3 });

  const fetchEmployees = () => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(res => {
        const data = res.success ? res.data : res;
        setEmployees(Array.isArray(data) ? data : []);
      })
      .catch(e => {
        console.error('Employees fetch failed:', e);
        setEmployees([]);
      });
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, experienceLevel: 'Mid', weeklyCapacityHours: 40 })
    });
    setShowAddForm(false);
    fetchEmployees();
  };

  const handleEmployeeClick = async (id: string) => {
    setSelectedEmployeeId(id);
    try {
      const res = await fetch(`/api/employees/${id}`);
      const raw = await res.json();
      setProfileData(raw.success ? raw.data : raw);
    } catch (e) {
      console.error('Profile fetch failed:', e);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;
    await fetch(`/api/employees/${selectedEmployeeId}/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSkill)
    });
    setNewSkill({ name: '', proficiencyLevel: 3 });
    handleEmployeeClick(selectedEmployeeId);
    fetchEmployees(); 
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Employees</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all"
        >
          + Add Employee
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)' }}>
          <h2 className="text-sm font-bold text-white mb-4">Add New Employee</h2>
          <form onSubmit={handleAddEmployee} className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Name</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="rounded-lg px-3 py-2 text-sm w-44 text-white outline-none" style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)' }} placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Email</label>
              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="rounded-lg px-3 py-2 text-sm w-44 text-white outline-none" style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)' }} placeholder="john@company.com" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Role</label>
              <input required type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="rounded-lg px-3 py-2 text-sm w-32 text-white outline-none" style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)' }} placeholder="Developer" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700">Save</button>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 px-4 py-2 rounded-lg text-sm hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.06)' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {selectedEmployeeId && profileData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
            <div className="p-6 flex justify-between items-center shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <h2 className="text-xl font-black text-white">{profileData.name}</h2>
                <p className="text-slate-400 text-sm mt-0.5">{profileData.role} · {profileData.department} · {profileData.experienceLevel} Level</p>
              </div>
              <button onClick={() => { setSelectedEmployeeId(null); setProfileData(null); }} className="text-slate-500 hover:text-white text-xl font-bold p-2 transition-colors">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Top Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Workload', value: `${Math.round((profileData.currentAllocatedHours / Math.max(1, profileData.weeklyCapacityHours)) * 100)}%`, color: '#818cf8' },
                  { label: 'Active Projects', value: profileData.stats?.totalProjects || 0, color: '#6366f1' },
                  { label: 'Tasks In Progress', value: profileData.stats?.activeTasks || 0, color: '#f59e0b' },
                  { label: 'Completed Tasks', value: profileData.stats?.completedTasks || 0, color: '#10b981' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-slate-400 text-xs mb-1">{label}</p>
                    <p className="text-2xl font-black" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Skills Section */}
              <div className="p-5 rounded-xl" style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)' }}>
                <h3 className="text-sm font-bold text-white mb-3">Skills & Certifications</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {profileData.skills.map((s: any) => (
                    <span key={s.skill.id} className="px-3 py-1 rounded-full text-xs flex items-center gap-1 text-indigo-300" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
                      <span className="font-semibold">{s.skill.name}</span>
                      <span className="text-slate-500">L{s.proficiencyLevel}</span>
                      {s.yearsOfExperience > 0 && <span className="text-cyan-400 text-[10px] ml-1">{s.yearsOfExperience}y</span>}
                      {s.isCertified && <span className="text-amber-400 ml-1" title="Certified">★</span>}
                    </span>
                  ))}
                </div>
                <form onSubmit={handleAddSkill} className="flex gap-2 items-end p-3 rounded-lg" style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)' }}>
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Add New Skill</label>
                    <input required type="text" placeholder="e.g. React" value={newSkill.name} onChange={e => setNewSkill({...newSkill, name: e.target.value})} className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none" style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)' }} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Level (1-5)</label>
                    <input required type="number" min="1" max="5" value={newSkill.proficiencyLevel} onChange={e => setNewSkill({...newSkill, proficiencyLevel: parseInt(e.target.value)})} className="w-16 rounded-lg px-3 py-2 text-sm text-white outline-none" style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)' }} />
                  </div>
                  <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 font-semibold">Add Skill</button>
                </form>
              </div>

              {/* Assigned Tasks grouped by Project */}
              <div>
                <h3 className="text-lg font-bold mb-4">Active Task Assignments</h3>
                {profileData.assignedTasks && profileData.assignedTasks.length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(
                      profileData.assignedTasks.reduce((acc: any, task: any) => {
                        const projName = task.project?.name || "Unassigned Project";
                        if (!acc[projName]) acc[projName] = [];
                        acc[projName].push(task);
                        return acc;
                      }, {})
                    ).map(([projectName, tasks]: any) => (
                      <div key={projectName} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-100 p-3 border-b font-medium text-slate-800">📁 {projectName}</div>
                        <ul className="divide-y divide-gray-100">
                          {tasks.map((t: any) => (
                            <li key={t.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                              <div>
                                <p className="font-medium text-sm text-gray-800">{t.title}</p>
                                <p className="text-xs text-gray-500 mt-1">Due: {new Date(t.deadline).toLocaleDateString()} • {t.estimatedHours} hrs</p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {t.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic bg-white p-4 rounded border">No tasks assigned yet.</p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 text-sm font-semibold text-gray-600">Name</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Role</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Skills</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Workload</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map(emp => {
              const util = Math.round((emp.currentAllocatedHours / emp.weeklyCapacityHours) * 100);
              let statusColor = 'bg-blue-100 text-blue-700';
              let statusText = 'Balanced';
              if (util >= 100) { statusColor = 'bg-red-100 text-red-700'; statusText = 'Overloaded'; }
              else if (util >= 80) { statusColor = 'bg-yellow-100 text-yellow-700'; statusText = 'Moderate'; }
              else if (util < 50) { statusColor = 'bg-green-100 text-green-700'; statusText = 'Available'; }

              return (
                <tr key={emp.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleEmployeeClick(emp.id)}>
                  <td className="p-4 font-medium text-blue-600 hover:underline">{emp.name}</td>
                  <td className="p-4 text-gray-600">{emp.role}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {emp.skills.map((s: any) => (
                        <span key={s.skill.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {s.skill.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full ${util >= 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(util, 100)}%` }}></div>
                      </div>
                      <span className="text-sm text-gray-500">{util}%</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor}`}>
                      {statusText}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
