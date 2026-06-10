import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Send, Loader2, Trash2, Mic, MicOff, Sparkles, MessageSquare, X, ChevronDown,
  BarChart3, Navigation, AlertTriangle, Activity, UserPlus, CalendarDays,
  GitBranch, Clock, ArrowLeftRight, FileText, DollarSign, Map, Building2,
  Shield, Users, CheckSquare, ArrowLeft, Command,
  Volume2, VolumeX, Languages,
} from 'lucide-react';
import { saveInsights, WorkspaceRenderer, INSIGHTS_STORAGE_KEY } from './AIInsights';
import type { Visualization } from './AIInsights';

/* ─── types ─── */
interface Message {
  role: 'user' | 'assistant';
  text: string;
  ts: number;
  hasInsights?: boolean;
  isNav?: boolean;
}

/* ─── Prompt catalog ─── */
const PROMPT_GROUPS = [
  {
    label: 'People & Risk',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
    prompts: [
      { text: 'Show overloaded employees',       icon: AlertTriangle },
      { text: "What's my team's burnout risk?",  icon: Activity },
      { text: 'Who can take on more work?',      icon: UserPlus },
      { text: 'Visualize workforce risks',       icon: Shield },
    ],
  },
  {
    label: 'Leave & Availability',
    color: '#22d3ee',
    bg: 'rgba(34,211,238,0.07)',
    border: 'rgba(34,211,238,0.18)',
    prompts: [
      { text: 'Who is on leave next week?',              icon: CalendarDays },
      { text: 'Show me team availability this week',     icon: Users },
      { text: 'Approve leave and rebalance workload',    icon: CheckSquare },
      { text: 'Show cost impact of current absences',   icon: DollarSign },
    ],
  },
  {
    label: 'Projects & Capacity',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.07)',
    border: 'rgba(34,197,94,0.18)',
    prompts: [
      { text: 'Which projects are at risk?',           icon: AlertTriangle },
      { text: 'Show upcoming deadline risks',          icon: Clock },
      { text: 'Analyze capacity issues',              icon: BarChart3 },
      { text: 'Generate a resource allocation plan',  icon: GitBranch },
    ],
  },
  {
    label: 'Sprint & Milestones',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.07)',
    border: 'rgba(167,139,250,0.2)',
    prompts: [
      { text: 'Show sprint status for all projects',  icon: GitBranch },
      { text: "What's in the sprint backlog?",        icon: AlertTriangle },
      { text: 'Which sprint milestone is at risk?',   icon: Clock },
      { text: 'Open sprint board',                    icon: Navigation },
    ],
  },
  {
    label: 'Reports & Actions',
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.07)',
    border: 'rgba(129,140,248,0.2)',
    prompts: [
      { text: 'Show everything affecting Engineering', icon: Building2 },
      { text: 'Create redistribution plan',           icon: ArrowLeftRight },
      { text: 'Generate weekly workforce report',     icon: FileText },
      { text: 'Open capacity planning',               icon: Map },
    ],
  },
] as const;

/* ─── text renderer ─── */
function renderText(text: string) {
  return text.split('\n').map((line, i) => {
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    if (line.match(/^[-*]\s/))
      return <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: line.replace(/^[-*]\s/, '') }} />;
    if (line.match(/^\d+\.\s/))
      return <li key={i} className="ml-4 list-decimal" dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s/, '') }} />;
    if (line.trim() === '') return <div key={i} className="h-1.5" />;
    return <p key={i} dangerouslySetInnerHTML={{ __html: line }} />;
  });
}

/* ─── Input bar ─── */
function InputBar({
  inputRef, value, onChange, onKeyDown, onSend, onMic,
  loading, listening, interimText, compact = false,
  ttsEnabled, onToggleTts, ttsPlaying, sttLang, onLangChange, langs,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onMic: () => void;
  loading: boolean;
  listening: boolean;
  interimText: string;
  compact?: boolean;
  ttsEnabled?: boolean;
  onToggleTts?: () => void;
  ttsPlaying?: boolean;
  sttLang?: string;
  onLangChange?: (lang: string) => void;
  langs?: { code: string; label: string }[];
}) {
  return (
    <div className="flex flex-col rounded-2xl transition-all"
      style={{
        background: listening ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.05)',
        border: listening ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
        boxShadow: listening
          ? '0 0 0 3px rgba(239,68,68,0.1), 0 8px 32px rgba(0,0,0,0.3)'
          : '0 8px 32px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(20px)',
      }}>
      {/* Voice indicator strip */}
      {listening && (
        <div className="flex items-center gap-2.5 px-4 pt-3 pb-2" style={{ borderBottom: '1px solid rgba(239,68,68,0.12)' }}>
          <div className="flex items-end gap-0.5 h-4 shrink-0">
            {[2, 4, 6, 8, 10, 8, 6, 4, 2].map((h, i) => (
              <div key={i} className="w-0.5 rounded-full bg-red-500"
                style={{
                  height: h,
                  animation: `pulse-bar 0.5s ease-in-out ${i * 0.06}s infinite alternate`,
                  animationPlayState: interimText ? 'running' : 'paused',
                  opacity: interimText ? 0.9 : 0.35,
                }} />
            ))}
          </div>
          <span className="text-xs font-semibold">
            {interimText
              ? <span className="text-red-400">{interimText.startsWith('Transcrib') ? interimText : `Capturing — "${interimText.slice(0, 40)}${interimText.length > 40 ? '…' : ''}"`}</span>
              : <span className="text-slate-500 italic">Recording… tap mic to stop</span>}
          </span>
        </div>
      )}
      <div className={`flex items-center gap-2 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
        {/* Mic */}
        <button onClick={onMic}
          title={listening ? 'Stop recording' : 'Record voice (Sarvam AI)'}
          className="flex items-center justify-center shrink-0 rounded-xl transition-all"
          style={{
            width: compact ? 28 : 34, height: compact ? 28 : 34,
            background: listening ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
            border: listening ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.08)',
            color: listening ? '#f87171' : '#475569',
          }}>
          {listening ? <MicOff size={compact ? 12 : 15} /> : <Mic size={compact ? 12 : 15} />}
        </button>

        {/* TTS toggle */}
        {!compact && onToggleTts && (
          <button onClick={onToggleTts}
            title={ttsEnabled ? 'Disable voice response' : 'Enable voice response'}
            className="flex items-center justify-center shrink-0 rounded-xl transition-all"
            style={{
              width: 34, height: 34,
              background: ttsEnabled ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.05)',
              border: ttsEnabled ? '1px solid rgba(34,211,238,0.3)' : '1px solid rgba(255,255,255,0.08)',
              color: ttsEnabled ? (ttsPlaying ? '#22d3ee' : '#67e8f9') : '#475569',
            }}>
            {ttsEnabled
              ? <Volume2 size={14} className={ttsPlaying ? 'animate-pulse' : ''} />
              : <VolumeX size={14} />}
          </button>
        )}

        {/* Language selector */}
        {!compact && langs && onLangChange && (
          <div className="relative shrink-0">
            <select
              value={sttLang}
              onChange={e => onLangChange(e.target.value)}
              title="STT/TTS language"
              className="appearance-none rounded-xl text-xs font-semibold outline-none cursor-pointer pr-5 pl-2 py-1.5"
              style={{
                background: 'rgba(129,140,248,0.1)',
                border: '1px solid rgba(129,140,248,0.25)',
                color: '#818cf8',
                height: 34,
              }}>
              {langs.map(l => <option key={l.code} value={l.code} style={{ background: 'var(--card)' }}>{l.label}</option>)}
            </select>
            <Languages size={10} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: '#818cf8', pointerEvents: 'none' }} />
          </div>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          className={`flex-1 bg-transparent outline-none ${compact ? 'text-xs' : 'text-sm'}`}
          style={{ color: listening && interimText ? '#94a3b8' : '#e2e8f0' }}
          placeholder={listening ? 'Recording… tap mic to stop' : compact ? 'Ask anything…' : 'Ask anything about your workforce…'}
          value={listening ? (value + (interimText ? (value ? ' ' : '') + interimText : '')) : value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          readOnly={listening}
          disabled={loading}
        />

        {/* Send */}
        <button onClick={onSend}
          disabled={loading || (!value.trim() && !interimText)}
          className="flex items-center justify-center shrink-0 rounded-xl transition-all"
          style={{
            width: compact ? 28 : 36, height: compact ? 28 : 36,
            background: (value.trim() || interimText) && !loading
              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
              : 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            opacity: loading || (!value.trim() && !interimText) ? 0.4 : 1,
            boxShadow: (value.trim() || interimText) && !loading ? '0 0 16px rgba(99,102,241,0.4)' : 'none',
          }}>
          {loading
            ? <Loader2 size={compact ? 12 : 14} className="animate-spin text-indigo-400" />
            : <Send size={compact ? 12 : 14} color={(value.trim() || interimText) && !loading ? '#fff' : '#475569'} />}
        </button>
      </div>
    </div>
  );
}

/* ─── Welcome screen — command center hero ─── */
function WelcomeScreen({ onSend }: { onSend: (text: string) => void }) {
  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      {/* Hero section */}
      <div className="relative flex flex-col items-center justify-center pt-10 pb-6 px-6 text-center overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(30px)' }} />
          <div className="absolute top-20 left-1/4 w-40 h-40 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)', filter: 'blur(20px)' }} />
          <div className="absolute top-16 right-1/4 w-32 h-32 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)', filter: 'blur(20px)' }} />
        </div>

        {/* Logo orb */}
        <div className="relative mb-5 z-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              boxShadow: '0 0 0 1px rgba(99,102,241,0.4), 0 0 40px rgba(99,102,241,0.35), 0 0 80px rgba(99,102,241,0.15)',
            }}>
            <Sparkles size={28} color="#fff" />
          </div>
          {/* Orbit ring */}
          <div className="absolute inset-0 rounded-2xl border animate-pulse"
            style={{ border: '1px solid rgba(99,102,241,0.3)', transform: 'scale(1.15)' }} />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-black leading-tight mb-2 z-10" style={{ letterSpacing: '-0.02em' }}>
          <span className="gradient-text">ResourceIQ Copilot</span>
        </h1>
        <p className="text-slate-400 text-sm mb-5 z-10 max-w-md leading-relaxed">
          AI-First Workforce Intelligence Platform. Ask in natural language — get live data, instant analysis, and automated actions.
        </p>

      </div>

      {/* Prompt grid */}
      <div className="px-6 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <Command size={12} color="#475569" />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Quick Actions</span>
          <div className="flex-1 h-px" style={{ background: 'var(--bg-sub)' }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PROMPT_GROUPS.map(group => (
            <div key={group.label} className="rounded-2xl overflow-hidden"
              style={{ background: group.bg, border: `1px solid ${group.border}`, backdropFilter: 'blur(20px)' }}>
              {/* Group header */}
              <div className="flex items-center gap-2 px-4 py-2.5"
                style={{ borderBottom: `1px solid ${group.border}` }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: group.color, boxShadow: `0 0 6px ${group.color}` }} />
                <span className="text-xs font-bold" style={{ color: group.color }}>{group.label}</span>
              </div>
              {/* Prompts */}
              <div className="p-2 space-y-1">
                {group.prompts.map(({ text, icon: Icon }) => (
                  <button key={text} onClick={() => onSend(text)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all group"
                    style={{ background: 'transparent' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${group.color}10`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <Icon size={13} style={{ color: group.color, flexShrink: 0, opacity: 0.8 }} />
                    <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors leading-snug">{text}</span>
                    <Send size={10} className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: group.color }} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN CHAT COMPONENT
══════════════════════════════════════════════════════════════ */
export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [liveInsights, setLiveInsights] = useState<{ prompt: string; items: Visualization[] } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [sttLang, setSttLang] = useState('en-IN');
  const bottomRef = useRef<HTMLDivElement>(null);
  const floatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const floatInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const [interimText, setInterimText] = useState('');

  const LANGS = [
    { code: 'en-IN', label: 'EN' },
    { code: 'hi-IN', label: 'HI' },
    { code: 'te-IN', label: 'TE' },
    { code: 'ta-IN', label: 'TA' },
    { code: 'kn-IN', label: 'KN' },
    { code: 'bn-IN', label: 'BN' },
    { code: 'mr-IN', label: 'MR' },
    { code: 'gu-IN', label: 'GU' },
    { code: 'ml-IN', label: 'ML' },
  ];

  const isWelcome = messages.length === 0 && !loading;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (chatOpen) {
      floatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnread(0);
    }
  }, [messages, chatOpen]);

  const loadLatestInsights = () => {
    const raw: Visualization[] = JSON.parse(localStorage.getItem(INSIGHTS_STORAGE_KEY) || '[]');
    if (raw.length === 0) { setLiveInsights(null); return; }
    const latest = raw[0];
    const group = raw.filter(v => v.createdAt === latest.createdAt);
    setLiveInsights({ prompt: latest.prompt || '', items: group });
  };

  useEffect(() => {
    loadLatestInsights();
    window.addEventListener('fristine-insights-updated', loadLatestInsights);
    return () => window.removeEventListener('fristine-insights-updated', loadLatestInsights);
  }, []);

  /* ─── TTS playback via Sarvam ─── */
  const speakText = async (text: string) => {
    if (!ttsEnabled || !text) return;
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
    setTtsPlaying(true);
    try {
      const res = await fetch('/api/sarvam/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.replace(/\*\*/g, '').slice(0, 500), languageCode: 'en-IN', speaker: 'meera' }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const { audioBase64 } = await res.json();
      if (audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
        ttsAudioRef.current = audio;
        audio.onended = () => { setTtsPlaying(false); ttsAudioRef.current = null; };
        audio.onerror = () => setTtsPlaying(false);
        await audio.play();
      } else {
        setTtsPlaying(false);
      }
    } catch {
      setTtsPlaying(false);
    }
  };

  /* ─── Send ─── */
  const sendMessage = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    const userMsg: Message = { role: 'user', text: msg, ts: Date.now() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    try {
      const history = nextMessages.map(m => ({ role: m.role, text: m.text }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: msg, history, currentPage: location.pathname }),
      });
      const data = await res.json();

      // Navigation intent
      if (data.navigationTarget) {
        const target = data.navigationTarget as string;
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: data.answer || `Navigating to ${target}…`,
          ts: Date.now(),
          isNav: true,
        }]);
        setTimeout(() => navigate(target), 800);
        return;
      }

      const hasInsights = data.visualizations && data.visualizations.length > 0;
      if (hasInsights) {
        saveInsights(data.visualizations, msg);
        setChatOpen(false);
      }
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer, ts: Date.now(), hasInsights }]);
      if (liveInsights && !chatOpen) setUnread(u => u + 1);
      speakText(data.answer);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Connection error. Please try again.', ts: Date.now() }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
      floatInputRef.current?.focus();
    }
  };

  /* ─── Voice — Browser Web Speech API (no API key needed) ─── */
  const toggleMic = () => {
    // Stop if already listening
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setInterimText('');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Your browser does not support voice input. Please use Chrome or Edge.', ts: Date.now() }]);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = sttLang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setListening(true);
      setInput('');
      setInterimText('');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (interim) setInterimText(interim);
      if (final) {
        setInterimText('');
        setInput(final.trim());
      }
    };

    recognition.onend = () => {
      setListening(false);
      setInterimText('');
      // Auto-send if we got text
      setInput(prev => {
        if (prev.trim()) {
          setTimeout(() => sendMessage(prev.trim()), 50);
        }
        return prev;
      });
    };

    recognition.onerror = (event: any) => {
      setListening(false);
      setInterimText('');
      if (event.error === 'not-allowed') {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Microphone access was denied. Please allow microphone permission in your browser settings.', ts: Date.now() }]);
      } else if (event.error !== 'no-speech') {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Voice input error: ' + event.error + '. Please try again.', ts: Date.now() }]);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const clearChat = () => {
    setMessages([]);
    setLiveInsights(null);
    localStorage.removeItem(INSIGHTS_STORAGE_KEY);
  };

  /* ─── Message bubbles ─── */
  const MessageList = ({ compact = false }: { compact?: boolean }) => (
    <>
      {messages.map((m, i) => (
        <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          {m.role === 'assistant' && (
            <div className={`${compact ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 font-black text-white`}
              style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow: '0 0 12px rgba(99,102,241,0.35)' }}>
              R
            </div>
          )}
          <div className={`${compact ? 'max-w-[88%] px-3 py-2 text-xs' : 'max-w-[76%] px-4 py-3 text-sm'} rounded-2xl leading-relaxed ${m.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
            style={m.role === 'user'
              ? { background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: '#ffffff', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }
              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'var(--t1)' }}>
            <div className="space-y-0.5">{renderText(m.text)}</div>
            {m.hasInsights && (
              <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg w-fit"
                style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                <BarChart3 size={10} /> Workspace generated ↗
              </div>
            )}
            {m.isNav && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg w-fit"
                style={{ background: 'rgba(34,211,238,0.12)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}>
                <Navigation size={10} /> Navigating…
              </div>
            )}
            {!compact && (
              <p className="text-[10px] mt-1.5 opacity-30">
                {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          {m.role === 'user' && (
            <div className={`${compact ? 'w-6 h-6 text-[9px]' : 'w-8 h-8 text-[10px]'} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-slate-300`}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              You
            </div>
          )}
        </div>
      ))}
      {loading && (
        <div className="flex gap-2 justify-start">
          <div className={`${compact ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'} rounded-xl flex items-center justify-center flex-shrink-0 font-black text-white`}
            style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>R</div>
          <div className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} rounded-2xl rounded-bl-sm flex items-center gap-2.5`}
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            {/* Thinking dots */}
            <div className="flex gap-1">
              {[0, 0.2, 0.4].map((delay, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                  style={{ animation: `pulse-bar 0.8s ease-in-out ${delay}s infinite alternate` }} />
              ))}
            </div>
            <span className={`${compact ? 'text-xs' : 'text-sm'} text-indigo-300 font-medium`}>
              {loading ? 'Analyzing your workforce data…' : ''}
            </span>
          </div>
        </div>
      )}
    </>
  );

  /* ─── Quick prompts strip (compact horizontal) ─── */
  const QuickPrompts = ({ compact = false }: { compact?: boolean }) => {
    const quick = [
      'Show overloaded employees', 'Who is on leave next week?',
      'Which projects are at risk?', 'Show sprint status',
      "What's in the sprint backlog?", 'Analyze capacity issues',
      'Visualize workforce risks', 'Create redistribution plan',
    ];
    return (
      <div className={`flex gap-1.5 overflow-x-auto no-scrollbar ${compact ? 'px-2 pt-1.5 pb-1' : 'px-4 pt-2 pb-1'}`}>
        {quick.map(s => (
          <button key={s} onClick={() => sendMessage(s)}
            className={`${compact ? 'text-[9px] px-2 py-1' : 'text-xs px-2.5 py-1.5'} rounded-full whitespace-nowrap transition-all font-medium shrink-0`}
            style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.1)'; }}>
            {s}
          </button>
        ))}
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════
     MODE 1: FULL-SCREEN CHAT (no insights)
  ══════════════════════════════════════════════════════ */
  if (!liveInsights) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden"
        style={{ border: '1px solid var(--card-border)', background: 'var(--bg)', borderRadius: 0 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(13,13,26,0.95) 0%, rgba(30,27,75,0.6) 50%, rgba(13,13,26,0.95) 100%)',
            borderBottom: '1px solid var(--card-border)',
            backdropFilter: 'blur(20px)',
          }}>
          <div className="flex items-center gap-3">
            {/* Back to welcome button — only show when in conversation */}
            {!isWelcome && (
              <button onClick={clearChat}
                className="p-1.5 rounded-xl transition-colors text-slate-500 hover:text-slate-300"
                style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)' }}
                title="New conversation">
                <ArrowLeft size={14} />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-white leading-tight">ResourceIQ Copilot</p>
              <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
                Gemini Live · {isWelcome ? '16 actions ready' : `${messages.length} messages`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isWelcome && (
              <button onClick={clearChat} title="New conversation"
                className="p-2 rounded-xl transition-colors text-slate-500 hover:text-slate-300"
                style={{ background: 'var(--bg-sub)', border: '1px solid var(--card-border)' }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        {isWelcome
          ? <WelcomeScreen onSend={sendMessage} />
          : (
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4" style={{ background: 'var(--bg)' }}>
              <MessageList />
              <div ref={bottomRef} />
            </div>
          )}

        {/* Quick prompts (conversation mode only) */}
        {!isWelcome && (
          <div style={{ background: 'rgba(8,8,18,0.9)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <QuickPrompts />
          </div>
        )}

        {/* Input bar */}
        <div className="px-4 py-3 shrink-0"
          style={{ background: 'var(--bg)', borderTop: isWelcome ? '1px solid var(--card-border)' : 'none' }}>
          {isWelcome && (
            <p className="text-center text-[10px] text-slate-600 mb-2 flex items-center justify-center gap-1.5">
              <Command size={9} /> Type a query or click any action above
            </p>
          )}
          <InputBar
            inputRef={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            onSend={() => sendMessage(input)}
            onMic={toggleMic}
            loading={loading}
            listening={listening}
            interimText={interimText}
            ttsEnabled={ttsEnabled}
            onToggleTts={() => { setTtsEnabled(v => !v); if (ttsAudioRef.current) { ttsAudioRef.current.pause(); setTtsPlaying(false); } }}
            ttsPlaying={ttsPlaying}
            sttLang={sttLang}
            onLangChange={setSttLang}
            langs={LANGS}
          />
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════
     MODE 2: FULL-SCREEN WORKSPACE + FLOATING CHAT
  ══════════════════════════════════════════════════════ */
  return (
    <div className="relative w-full h-[calc(100vh-80px)] overflow-hidden">

      {/* Workspace panel */}
      <div className="w-full h-full flex flex-col rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--card-border)', background: 'var(--bg)' }}>

        {/* Workspace header */}
        <div className="relative flex items-center justify-between px-6 py-4 shrink-0 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 40%, #7c3aed 70%, #4f46e5 100%)', backgroundSize: '200% 100%' }}>
          {/* Shimmer overlay */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)', animation: 'shimmer 3s linear infinite', backgroundSize: '200% 100%' }} />
          <div className="flex items-center gap-3 z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <p className="font-black text-white text-base leading-tight">AI Workspace</p>
              <p className="text-indigo-200 text-xs italic truncate max-w-sm">"{liveInsights.prompt}"</p>
            </div>
          </div>
          <div className="flex items-center gap-2 z-10">
            <button onClick={() => setChatOpen(o => !o)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>
              <MessageSquare size={12} /> Chat
              {unread > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">{unread}</span>
              )}
            </button>
            <button onClick={() => { setLiveInsights(null); localStorage.removeItem(INSIGHTS_STORAGE_KEY); }}
              className="p-2 rounded-xl transition-all hover:bg-white/20"
              style={{ color: 'rgba(255,255,255,0.7)' }} title="Back to chat">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Workspace content */}
        <div className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--bg)' }}>
          <WorkspaceRenderer items={liveInsights.items} />
        </div>
      </div>

      {/* Floating chat bubble */}
      {!chatOpen && (
        <button onClick={() => { setChatOpen(true); setUnread(0); }}
          className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white font-black text-lg hover:scale-110 transition-transform z-50"
          style={{
            background: 'linear-gradient(135deg,#6366f1,#a855f7)',
            boxShadow: '0 8px 32px rgba(99,102,241,0.5), 0 0 0 1px rgba(99,102,241,0.4)',
          }}>
          <MessageSquare size={22} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center"
              style={{ border: '2px solid #080812' }}>
              {unread}
            </span>
          )}
        </button>
      )}

      {/* Floating chat panel */}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] h-[520px] flex flex-col rounded-2xl shadow-2xl overflow-hidden z-50"
          style={{ background: 'var(--card)', border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 40px rgba(99,102,241,0.1)' }}>

          {/* Widget header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(13,13,26,1) 0%, rgba(30,27,75,0.5) 100%)', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow: '0 0 12px rgba(99,102,241,0.4)' }}>
                <Sparkles size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">ResourceIQ Copilot</p>
                <p className="text-[10px] flex items-center gap-1" style={{ color: '#34d399' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  Online · Gemini Live
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={clearChat}
                className="p-1.5 rounded-lg transition-colors text-slate-500 hover:text-slate-300"
                style={{ background: 'var(--bg-sub)' }}>
                <Trash2 size={12} />
              </button>
              <button onClick={() => setChatOpen(false)}
                className="p-1.5 rounded-lg transition-colors text-slate-500 hover:text-slate-300"
                style={{ background: 'var(--bg-sub)' }}>
                <ChevronDown size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ background: 'var(--bg)' }}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                <Sparkles size={20} color="#475569" />
                <p className="text-xs text-slate-600">Ask anything about your workforce</p>
              </div>
            )}
            <MessageList compact />
            <div ref={floatBottomRef} />
          </div>

          {/* Quick prompts */}
          <div style={{ background: 'var(--card)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <QuickPrompts compact />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2" style={{ background: 'var(--card)' }}>
            <InputBar
              inputRef={floatInputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              onSend={() => sendMessage(input)}
              onMic={toggleMic}
              loading={loading}
              listening={listening}
              interimText={interimText}
              compact
              ttsEnabled={ttsEnabled}
              ttsPlaying={ttsPlaying}
            />
          </div>
        </div>
      )}
    </div>
  );
}

