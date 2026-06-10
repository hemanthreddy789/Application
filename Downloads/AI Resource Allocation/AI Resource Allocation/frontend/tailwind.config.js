/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg)',
        foreground: 'var(--t1)',
        glass: 'var(--card)',
        'glass-border': 'var(--card-border)',
        primary:  { DEFAULT: '#1a1a2e', foreground: '#ffffff' },
        accent:   { DEFAULT: '#1a1a2e' },
        neon:     { blue: '#818cf8', purple: '#c084fc', cyan: '#22d3ee', green: '#34d399', amber: '#fbbf24', red: '#f87171' },
        surface:  { 1: 'var(--bg-sub)', 2: 'var(--card)', 3: 'var(--card)' },
        success: '#10b981',
        warning: '#f59e0b',
        danger:  '#ef4444',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-shine': 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.04) 100%)',
        'neon-glow': 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glass': 'var(--card-shadow)',
        'neon-sm': '0 0 12px rgba(99,102,241,0.2)',
        'neon':    '0 0 24px rgba(99,102,241,0.2)',
        'neon-lg': '0 0 40px rgba(99,102,241,0.2)',
        'neon-purple': '0 0 24px rgba(168,85,247,0.2)',
        'card': 'var(--card-shadow)',
      },
      animation: {
        'float':          'float 6s ease-in-out infinite',
        'float-delayed':  'float 6s ease-in-out 2s infinite',
        'float-slow':     'float 9s ease-in-out 1s infinite',
        'pulse-glow':     'pulse-glow 2s ease-in-out infinite',
        'pulse-glow-purple': 'pulse-glow-purple 2s ease-in-out infinite',
        'gradient-x':     'gradient-x 4s ease infinite',
        'shimmer':        'shimmer 2.5s linear infinite',
        'orbit':          'orbit 8s linear infinite',
        'orbit-reverse':  'orbit 12s linear reverse infinite',
        'scan':           'scan 3s ease-in-out infinite',
        'fadeInUp':       'fadeInUp 0.5s ease forwards',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px) translateX(0px)' },
          '33%':     { transform: 'translateY(-20px) translateX(10px)' },
          '66%':     { transform: 'translateY(10px) translateX(-8px)' },
        },
        'pulse-glow': {
          '0%,100%': { boxShadow: '0 0 12px rgba(99,102,241,0.3)' },
          '50%':     { boxShadow: '0 0 32px rgba(99,102,241,0.7), 0 0 64px rgba(99,102,241,0.3)' },
        },
        'pulse-glow-purple': {
          '0%,100%': { boxShadow: '0 0 12px rgba(168,85,247,0.3)' },
          '50%':     { boxShadow: '0 0 32px rgba(168,85,247,0.7), 0 0 64px rgba(168,85,247,0.3)' },
        },
        'gradient-x': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%':     { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        orbit: {
          '0%':   { transform: 'rotate(0deg) translateX(60px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(60px) rotate(-360deg)' },
        },
        scan: {
          '0%,100%': { opacity: '0.3', transform: 'scaleX(0.8)' },
          '50%':     { opacity: '1',   transform: 'scaleX(1)' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backdropBlur: { xs: '2px' },
      fontFamily: {
        sans:  ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
