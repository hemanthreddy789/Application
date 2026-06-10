import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, MessageSquare, CheckSquare, User,
  Bell, LogOut, Settings, Palette, GitBranch,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const NAV_MAIN = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/workforce', icon: Users,           label: 'Workforce' },
  { to: '/chat',      icon: MessageSquare,   label: 'AI Copilot' },
];
const NAV_SEC = [
  { to: '/tasks',              icon: CheckSquare, label: 'Tasks'     },
  { to: '/sprint',             icon: GitBranch,   label: 'Sprints'   },
  { to: '/employee-dashboard', icon: User,        label: 'My Portal' },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':         'Dashboard',
  '/workforce':         'Workforce',
  '/chat':              'AI Copilot',
  '/tasks':             'Tasks',
  '/sprint':            'Sprints',
  '/settings':          'Settings',
  '/employee-dashboard':'My Portal',
};

export default function Layout() {
  const location = useLocation();
  const navigate  = useNavigate();

  /* mode: '' = light, 'dark' = dark */
  const [mode, setMode] = useState<'' | 'dark'>(() =>
    (localStorage.getItem('riq_mode') as '' | 'dark') ?? 'dark'
  );
  const [tpOpen, setTpOpen] = useState(false);
  const tpRef = useRef<HTMLDivElement>(null);

  /* Apply data-mode to <html> */
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode);
    localStorage.setItem('riq_mode', mode);
  }, [mode]);

  /* Close theme popup on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (tpRef.current && !tpRef.current.contains(e.target as Node)) setTpOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pageTitle = Object.entries(PAGE_TITLES).find(([p]) => location.pathname.startsWith(p))?.[1] ?? 'ResourceIQ';
  const isActive  = (to: string) => location.pathname === to;

  /* ── Sidebar icon ── */
  const SbIcon = ({ to, icon: Icon, label, onClick }: { to?: string; icon: any; label: string; onClick?: () => void }) => (
    <div
      className={`sb-ic${to && isActive(to) ? ' active' : ''}`}
      onClick={onClick ?? (() => to && navigate(to))}
      style={{ margin: '1px 0' }}
    >
      <Icon size={18} />
      <span className="sb-tooltip">{label}</span>
    </div>
  );

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: 'var(--bg)',
      fontFamily: "var(--font)",
      position: 'relative',
      transition: 'background 0.4s',
    }}>

      {/* Sky gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'var(--sky)',
      }} />

      {/* ══ SIDEBAR ══ */}
      <aside style={{
        width: 62, minWidth: 62,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '14px 0', gap: 2,
        zIndex: 10, position: 'relative',
        background: 'var(--sb-bg)',
        borderRight: '1px solid var(--sb-border)',
        transition: 'background 0.4s',
      }}>

        {/* Logo mark */}
        <div
          onClick={() => navigate('/dashboard')}
          style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'var(--t1)', color: 'var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, cursor: 'pointer', marginBottom: 20, flexShrink: 0,
            transition: 'background 0.3s',
          }}
        >
          R
        </div>

        {/* Main nav */}
        {NAV_MAIN.map(n => <SbIcon key={n.to} {...n} />)}

        {/* Separator */}
        <div style={{ width: 24, height: 1, background: 'var(--sb-border)', margin: '6px 0' }} />

        {/* Secondary nav */}
        {NAV_SEC.map(n => <SbIcon key={n.to} {...n} />)}

        {/* ── Bottom ── */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>

          {/* Theme picker */}
          <div ref={tpRef} style={{ position: 'relative' }}>
            <div className={`sb-ic${tpOpen ? ' active' : ''}`} onClick={() => setTpOpen(o => !o)}>
              <Palette size={18} />
              <span className="sb-tooltip">Theme</span>
            </div>

            {tpOpen && (
              <div style={{
                position: 'absolute', bottom: 0, left: 52,
                background: 'var(--card)',
                border: '1px solid var(--card-border)',
                borderRadius: 14, padding: '14px',
                zIndex: 300, minWidth: 160,
                boxShadow: 'var(--card-shadow-h)',
                animation: 'riseIn 0.18s ease',
              }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 10 }}>
                  Appearance
                </p>
                {([['', 'Light'], ['dark', 'Dark']] as const).map(([val, label]) => (
                  <div
                    key={val}
                    onClick={() => { setMode(val); setTpOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 8px', borderRadius: 8, cursor: 'pointer',
                      background: mode === val ? 'var(--bg-sub)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (mode !== val) (e.currentTarget as HTMLElement).style.background = 'var(--bg-sub)'; }}
                    onMouseLeave={e => { if (mode !== val) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      background: val === 'dark' ? '#0a0a0a' : 'linear-gradient(135deg,#f5f5f5,#d0d0d0)',
                      border: mode === val ? '2px solid var(--t1)' : '1.5px solid var(--card-border)',
                      boxShadow: mode === val ? '0 0 0 2px var(--bg-sub)' : 'none',
                    }} />
                    <span style={{ fontSize: 13, color: 'var(--t1)', fontWeight: mode === val ? 500 : 400 }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <SbIcon icon={Settings} label="Settings" to="/settings" />

          {/* Logout */}
          <div className="sb-ic" onClick={() => { sessionStorage.removeItem('riq_auth'); sessionStorage.removeItem('riq_role'); window.location.reload(); }}>
            <LogOut size={18} />
            <span className="sb-tooltip">Sign out</span>
          </div>

          {/* Avatar */}
          <div
            onClick={() => navigate('/settings')}
            style={{
              width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
              background: 'var(--t1)', color: 'var(--bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 600,
              fontFamily: 'var(--font-serif)',
              transition: 'background 0.3s',
            }}
          >
            {(sessionStorage.getItem('riq_role') || 'A')[0].toUpperCase()}
          </div>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* ── Topbar ── */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', flexShrink: 0,
          background: 'var(--bg)',
          borderBottom: '1px solid var(--sb-border)',
          transition: 'background 0.4s',
        }}>
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 20, fontWeight: 400,
            color: 'var(--t1)', letterSpacing: '-0.2px',
          }}>
            {pageTitle}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Bell */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '1px solid var(--card-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--t3)', cursor: 'pointer', position: 'relative',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-sub)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
              <Bell size={14} />
              <span style={{
                position: 'absolute', top: -3, right: -3,
                width: 14, height: 14, borderRadius: '50%',
                background: '#e53935', fontSize: 8, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, border: '2px solid var(--bg)',
              }}>3</span>
            </div>

            {/* Light/Dark quick toggle */}
            <div
              onClick={() => setMode(m => m === 'dark' ? '' : 'dark')}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '1px solid var(--card-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--t3)', cursor: 'pointer',
                transition: 'background 0.12s',
                fontSize: 14,
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-sub)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              title="Toggle light/dark"
            >
              {mode === 'dark' ? '☀' : '☽'}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <main style={{ flex: 1, overflow: 'auto', padding: '28px 30px', position: 'relative' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
