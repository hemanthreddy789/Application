import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Trash2, Mic, MicOff, ExternalLink, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveInsights, VizCard, INSIGHTS_STORAGE_KEY } from './AIInsights';
import type { Visualization } from './AIInsights';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  ts: number;
  hasInsights?: boolean;
}

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

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hello! I am Fristine Assistant — your intelligent AI companion for Fristine Infotech Pvt Ltd.', ts: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [liveInsights, setLiveInsights] = useState<{ prompt: string; items: Visualization[] } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load latest insights group for split-screen
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
        body: JSON.stringify({ question: msg, history }),
      });
      const data = await res.json();
      const hasInsights = data.visualizations && data.visualizations.length > 0;
      if (hasInsights) saveInsights(data.visualizations, msg);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.answer,
        ts: Date.now(),
        hasInsights,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Connection error. Please try again.', ts: Date.now() }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const toggleMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setInput(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        recognition.stop();
        setListening(false);
        sendMessage(transcript);
      }
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', text: 'Chat cleared. How can I help you?', ts: Date.now() }]);
  };

  // Shared chat panel JSX
  const chatPanel = (
    <div className={`flex flex-col h-[calc(100vh-80px)] transition-all duration-300 ${liveInsights ? 'w-[400px] shrink-0' : 'flex-1 max-w-4xl mx-auto'}`}>
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-800 text-white px-5 py-4 rounded-t-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-bold text-lg shadow-md">F</div>
          <div>
            <div className="font-bold text-lg leading-tight">Fristine Assistant</div>
            <div className="text-blue-300 text-xs">Powered by Gemini · Full App Access</div>
          </div>
        </div>
        <button onClick={clearChat} title="Clear chat" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-5 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow font-bold text-white text-sm">F</div>
            )}
            <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
              m.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
            }`}>
              <div className="space-y-0.5">{renderText(m.text)}</div>
              <div className={`text-xs mt-2 ${m.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              {m.hasInsights && (
                <button
                  onClick={() => navigate('/ai-insights')}
                  className="mt-2 flex items-center gap-1.5 text-xs bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  <ExternalLink size={11} /> View in AI Insights
                </button>
              )}
            </div>
            {m.role === 'user' && (
              <div className="w-8 h-8 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow text-xs font-semibold text-gray-600">You</div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow font-bold text-white text-sm">F</div>
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-indigo-500" />
              <span className="text-sm text-gray-500">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 rounded-b-2xl shadow-lg">
        <div className="flex items-center gap-2 border border-gray-200 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent bg-gray-50">
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-300"
            placeholder=""
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            disabled={loading}
          />
          <button
            onClick={toggleMic}
            title={listening ? 'Stop listening' : 'Speak'}
            className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
              listening
                ? 'bg-red-500 text-white animate-pulse'
                : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            {listening ? <MicOff size={17} /> : <Mic size={17} />}
          </button>
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white rounded-lg transition-colors flex-shrink-0"
          >
            {loading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex h-[calc(100vh-80px)] gap-4 transition-all duration-300`}>
      {/* LEFT — AI Insights live panel (only when visualizations exist) */}
      {liveInsights && (
        <div className="flex-1 flex flex-col h-[calc(100vh-80px)] overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
          {/* Panel header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles size={17} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-sm leading-tight">AI Insights</div>
                <div className="text-indigo-200 text-xs italic truncate max-w-xs">"{liveInsights.prompt}"</div>
              </div>
            </div>
            <button
              onClick={() => setLiveInsights(null)}
              className="text-white/60 hover:text-white text-lg leading-none transition-colors"
              title="Dismiss panel"
            >✕</button>
          </div>

          {/* Visualizations */}
          <div className="flex-1 overflow-y-auto bg-slate-50 p-5 space-y-4">
            {/* KPI row */}
            {liveInsights.items.filter(v => v.type === 'kpi').length > 0 && (
              <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {liveInsights.items.filter(v => v.type === 'kpi').map(v => (
                  <VizCard key={v.id} viz={v} />
                ))}
              </div>
            )}
            {/* Charts / tables */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {liveInsights.items.filter(v => v.type !== 'kpi').map(v => (
                <VizCard key={v.id} viz={v} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RIGHT — Chat */}
      {chatPanel}
    </div>
  );
}
