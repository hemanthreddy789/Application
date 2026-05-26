
export default function Login() {
  const handleLogin = () => {
    // Mock login simply reloads to trigger isAuthenticated=true in App.tsx (if modified, but it's hardcoded to true now)
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Allocator</h1>
          <p className="text-gray-500">Sign in to your workspace</p>
        </div>
        
        <div className="space-y-4">
          <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors">
            Login as Admin
          </button>
          <button onClick={handleLogin} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors">
            Login as Manager
          </button>
          <button onClick={handleLogin} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors">
            Login as Employee
          </button>
        </div>
      </div>
    </div>
  );
}
