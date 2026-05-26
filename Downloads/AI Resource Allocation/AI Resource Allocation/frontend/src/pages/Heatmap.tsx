import { useEffect, useState } from 'react';

export default function Heatmap() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [burnoutData, setBurnoutData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/employees').then(res => res.json()).then(setEmployees).catch(console.error);
    fetch('/v1/analytics/burnout').then(res => res.json()).then(data => setBurnoutData(Array.isArray(data) ? data : [])).catch(console.error);
  }, []);

  const weeks = ['Current Week', 'Next Week', 'Week 3', 'Week 4'];

  const getHeatmapColor = (utilization: number) => {
    if (utilization >= 100) return 'bg-red-500 text-white';
    if (utilization >= 80) return 'bg-yellow-400 text-yellow-900';
    if (utilization >= 50) return 'bg-blue-400 text-white';
    return 'bg-green-400 text-white';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Workload Heatmap</h1>
        <button 
          onClick={() => window.location.href = '/?rebalance=true'} 
          className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-100"
        >
          ⚖️ Rebalance Workload
        </button>
      </div>
      
      <div className="bg-white p-6 rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr>
              <th className="p-3 border text-left bg-gray-50 font-semibold text-gray-700">Employee</th>
              {weeks.map(w => <th key={w} className="p-3 border bg-gray-50 font-semibold text-gray-700">{w}</th>)}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const util = Math.round((emp.currentAllocatedHours / emp.weeklyCapacityHours) * 100);
              return (
                <tr key={emp.id}>
                  <td className="p-3 border text-left font-medium">
                    {emp.name} <span className="text-xs text-gray-400 ml-2">{emp.role}</span>
                    {burnoutData.find(b => b.employeeId === emp.id)?.riskLevel === 'High' && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold ml-2">🔥 Burnout</span>
                    )}
                  </td>
                  {/* Mocking future weeks with random variations */}
                  <td className={`p-3 border ${getHeatmapColor(util)}`}>{util}%</td>
                  <td className={`p-3 border ${getHeatmapColor(util * 0.9)}`}>{Math.round(util * 0.9)}%</td>
                  <td className={`p-3 border ${getHeatmapColor(util * 0.7)}`}>{Math.round(util * 0.7)}%</td>
                  <td className={`p-3 border ${getHeatmapColor(util * 1.1)}`}>{Math.round(util * 1.1)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4 text-sm mt-4">
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-400 rounded"></div> Available (&lt;50%)</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-400 rounded"></div> Balanced (50-80%)</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-400 rounded"></div> Moderate (80-100%)</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded"></div> Overloaded (&gt;100%)</div>
      </div>
    </div>
  );
}
