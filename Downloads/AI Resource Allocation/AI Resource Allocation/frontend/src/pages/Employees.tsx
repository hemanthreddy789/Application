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
          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          + Add Employee
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Add New Employee (Dummy Data)</h2>
          <form onSubmit={handleAddEmployee} className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48" placeholder="john@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input required type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32" placeholder="Developer" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Save</button>
              <button type="button" onClick={() => setShowAddForm(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {selectedEmployeeId && profileData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-gray-50 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-white p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{profileData.name}</h2>
                <p className="text-gray-500">{profileData.role} • {profileData.department} • {profileData.experienceLevel} Level</p>
              </div>
              <button onClick={() => { setSelectedEmployeeId(null); setProfileData(null); }} className="text-gray-400 hover:text-gray-800 text-xl font-bold p-2">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Top Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                  <p className="text-gray-500 text-sm">Workload</p>
                  <p className="text-2xl font-bold text-blue-600">{Math.round((profileData.currentAllocatedHours / profileData.weeklyCapacityHours) * 100)}%</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                  <p className="text-gray-500 text-sm">Active Projects</p>
                  <p className="text-2xl font-bold text-indigo-600">{profileData.stats?.totalProjects || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                  <p className="text-gray-500 text-sm">Tasks In Progress</p>
                  <p className="text-2xl font-bold text-amber-600">{profileData.stats?.activeTasks || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                  <p className="text-gray-500 text-sm">Completed Tasks</p>
                  <p className="text-2xl font-bold text-green-600">{profileData.stats?.completedTasks || 0}</p>
                </div>
              </div>

              {/* Skills Section */}
              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <h3 className="text-lg font-bold mb-4">Skills & Certifications</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {profileData.skills.map((s: any) => (
                    <span key={s.skill.id} className="bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      <span className="font-medium">{s.skill.name}</span>
                      <span className="text-gray-400">L{s.proficiencyLevel}</span>
                      {s.yearsOfExperience > 0 && <span className="text-blue-500 text-xs ml-1 bg-blue-50 px-1.5 rounded">{s.yearsOfExperience}y exp</span>}
                      {s.isCertified && <span className="text-amber-500 ml-1" title="Certified">★</span>}
                    </span>
                  ))}
                </div>
                <form onSubmit={handleAddSkill} className="flex gap-2 items-end bg-gray-50 p-3 rounded-lg border border-gray-200 mt-4">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Add New Skill</label>
                    <input required type="text" placeholder="e.g. React" value={newSkill.name} onChange={e => setNewSkill({...newSkill, name: e.target.value})} className="w-full border rounded p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Level (1-5)</label>
                    <input required type="number" min="1" max="5" value={newSkill.proficiencyLevel} onChange={e => setNewSkill({...newSkill, proficiencyLevel: parseInt(e.target.value)})} className="w-16 border rounded p-2 text-sm" />
                  </div>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 font-medium">Add Skill</button>
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
