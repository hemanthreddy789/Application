import { useState } from 'react';
import { Shield, Users, User } from 'lucide-react';

const ROLES = [
  { id: 'admin',    label: 'Admin',    desc: 'Full access',    icon: Shield },
  { id: 'manager',  label: 'Manager',  desc: 'Team access',    icon: Users  },
  { id: 'employee', label: 'Employee', desc: 'Portal access',  icon: User   },
];

export default function Login() {
  const [email,    setEmail]    = useState('admin@resourceiq.com');
  const [password, setPassword] = useState('');
  const [role,     setRole]     = useState('admin');
  const [remember, setRemember] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      sessionStorage.setItem('riq_role', role);
      sessionStorage.setItem('riq_auth', '1');
      window.location.reload();
    }, 700);
  };

  const fi: React.CSSProperties = {
    width: '100%', height: 44,
    background: '#fafafa', border: '1px solid rgba(0,0,0,0.07)',
    borderRadius: 10, padding: '0 15px',
    fontSize: 14, color: '#0a0a0a', outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      background: '#ffffff',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Sky background */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 90% 55% at 50% -5%,
            rgba(251,140,50,0.20) 0%,
            rgba(251,180,100,0.10) 30%,
            rgba(200,185,240,0.08) 60%,
            transparent 100%),
          radial-gradient(ellipse 60% 40% at 85% 20%,
            rgba(200,185,255,0.12) 0%, transparent 70%)
        `,
      }} />

      {/* ── Floating pill nav ── */}
      <div style={{
        position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
        width: 'min(900px, 94vw)', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 100,
        boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 15, fontWeight: 500, color: '#0a0a0a' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: '#1a1a2e', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>R</div>
          ResourceIQ
        </div>
        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {['Platform', 'For Teams', 'Pricing'].map(l => (
            <span key={l} style={{ fontSize: 13, color: '#888', cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
        {/* CTA */}
        <button
          onClick={handleLogin}
          style={{
            height: 36, padding: '0 20px',
            background: '#1a1a2e', color: '#fff',
            border: 'none', borderRadius: 100,
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.85')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
        >
          Sign in →
        </button>
      </div>

      {/* ── Hero ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 24px', marginTop: 20,
      }}>
        <p style={{ fontSize: 12, letterSpacing: '0.8px', color: '#888', fontWeight: 400, marginBottom: 20 }}>
          INDIA'S WORKFORCE AI PLATFORM
        </p>
        <h1 style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 'clamp(42px, 6vw, 68px)',
          fontWeight: 400, lineHeight: 1.1,
          color: '#0a0a0a', letterSpacing: '-1px',
          textAlign: 'center', marginBottom: 16,
        }}>
          Allocate smarter.<br />Grow faster.
        </h1>
        <p style={{
          fontSize: 16, color: '#888', lineHeight: 1.7,
          fontWeight: 300, maxWidth: 480, textAlign: 'center', marginBottom: 40,
        }}>
          AI-powered resource management, leave intelligence & policy insights — built for Indian enterprises.
        </p>

        {/* ── Login card ── */}
        <div style={{
          width: 'min(420px, 92vw)',
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.07)',
          borderRadius: 24,
          boxShadow: '0 2px 6px rgba(0,0,0,0.05), 0 12px 40px rgba(0,0,0,0.10)',
          padding: '36px 36px 30px',
        }}>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 24, fontWeight: 400, color: '#0a0a0a', marginBottom: 4 }}>
            Welcome back.
          </h2>
          <p style={{ fontSize: 13, color: '#888', fontWeight: 300, marginBottom: 24 }}>Sign in to your workspace</p>

          {/* Role selector */}
          <p style={{ fontSize: 10, fontWeight: 600, color: '#888', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>Sign in as</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 18 }}>
            {ROLES.map(r => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                  background: role === r.id ? '#f0f0f0' : '#fafafa',
                  border: role === r.id ? '1.5px solid #0a0a0a' : '1px solid rgba(0,0,0,0.07)',
                  transition: 'all 0.15s', fontFamily: "'DM Sans', system-ui, sans-serif",
                }}
              >
                <r.icon size={15} color={role === r.id ? '#0a0a0a' : '#888'} />
                <span style={{ fontSize: 12, fontWeight: role === r.id ? 500 : 400, color: role === r.id ? '#0a0a0a' : '#888' }}>
                  {r.label}
                </span>
              </button>
            ))}
          </div>

          {/* Email */}
          <div style={{ marginBottom: 13 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#888', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 7 }}>
              Work email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@fristine.in"
              style={fi}
              onFocus={e => { e.target.style.borderColor = '#0a0a0a'; e.target.style.boxShadow = '0 0 0 3px rgba(10,10,10,0.06)'; }}
              onBlur={e =>  { e.target.style.borderColor = 'rgba(0,0,0,0.07)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#888', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 7 }}>
              Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={fi}
              onFocus={e => { e.target.style.borderColor = '#0a0a0a'; e.target.style.boxShadow = '0 0 0 3px rgba(10,10,10,0.06)'; }}
              onBlur={e =>  { e.target.style.borderColor = 'rgba(0,0,0,0.07)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#888', cursor: 'pointer', fontWeight: 300 }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                style={{ accentColor: '#1a1a2e' }} />
              Remember me
            </label>
            <span style={{ fontSize: 12, color: '#888', cursor: 'pointer', fontWeight: 400 }}>Forgot password?</span>
          </div>

          {/* Sign-in button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%', height: 44,
              background: loading ? 'rgba(26,26,46,0.6)' : '#1a1a2e',
              color: '#fff', border: 'none', borderRadius: 100,
              fontSize: 14, fontWeight: 500, cursor: loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 0.15s, transform 0.1s',
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.opacity = '0.88'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            onMouseDown={e =>  { (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
            onMouseUp={e =>    { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            {loading ? (
              <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            ) : 'Sign in to ResourceIQ'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#888', fontWeight: 300 }}>
            New here?{' '}
            <span style={{ color: '#3a3a3a', cursor: 'pointer', fontWeight: 400 }}>Request access →</span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #c0c0c0; }
      `}</style>
    </div>
  );
}
