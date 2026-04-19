import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFlowGuard } from '@/hooks/useFlowGuard';
import { createSubmission, getConfig } from '@/lib/firestore';
import {
  Loader2, Clock, Shield, AlertTriangle, ChevronRight, ArrowRight,
  Timer, Maximize, Eye, RotateCcw
} from 'lucide-react';
import Header from '@/components/Header';
import { useModal } from '@/context/ModalContext';

const RULES = [
  {
    icon: <Clock className="w-5 h-5 text-blue-400" />,
    title: 'Time-Governed Questions',
    desc: 'Each question has a strict timer (Q1: 2min, Q2: 2min, Q3: 3min). When time runs out, your answer is auto-saved.',
  },
  {
    icon: <ChevronRight className="w-5 h-5 text-cyan-400" />,
    title: 'One-Way Navigation',
    desc: 'You cannot go back to a previous question. Each question must be answered before moving forward.',
  },
  {
    icon: <Eye className="w-5 h-5 text-purple-400" />,
    title: 'Tab Switching Detected',
    desc: 'Switching browser tabs is monitored. Doing so will trigger a warning. Three violations = auto-submission.',
  },
  {
    icon: <Maximize className="w-5 h-5 text-green-400" />,
    title: 'Stay in Fullscreen',
    desc: 'The competition runs in fullscreen mode. Exiting fullscreen is treated as a violation.',
  },
  {
    icon: <RotateCcw className="w-5 h-5 text-amber-400" />,
    title: 'Refresh-Safe Timer',
    desc: 'Timer state is saved server-side. Refreshing the page will resume exactly where you left off.',
  },
  {
    icon: <Shield className="w-5 h-5 text-red-400" />,
    title: 'Auto Submission',
    desc: 'After the final question timer expires — or upon 3 anti-cheat violations — your answers are submitted automatically.',
  },
];

import { useConfig } from '@/context/ConfigContext';

export default function GuidelinesPage() {
  const { user } = useAuth();
  const { config: globalConfig } = useConfig();
  const { loading } = useFlowGuard({ requiredStep: 'guidelines' });
  const { showModal } = useModal();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleStart = async () => {
    if (!user || !agreed) return;
    setError('');
    setStarting(true);

    try {
      const config = globalConfig || await getConfig();

      if (!config.eventLive) {
        setError('The event is not live yet. Please wait for the organizers to start it.');
        setStarting(false);
        return;
      }
      if (!config.allowSubmission) {
        setError('Submissions are currently disabled. Please contact the organizer.');
        setStarting(false);
        return;
      }

      const participant = { name: user.displayName || '', email: user.email || '' };
      await createSubmission(
        user.uid,
        participant.name,
        participant.email,
        config.questions.map(q => q.timer)
      );

      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Fullscreen not supported or denied — continue anyway
      }

      navigate('/competition');
    } catch {
      showModal({
        title: 'Launch Failed',
        message: 'Failed to start the competition. Please check your connection and try again.',
        type: 'error'
      });
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div className="w-full max-w-lg animate-fade-in-up">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container py-12 font-inter">
      <Header />
      <div className="w-full max-w-2xl animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-black text-violet-400 uppercase tracking-[0.2em] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Initialisation Step 02
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">Competition Protocol</h1>
          <p className="text-gray-500 text-sm font-medium">Read carefully. These rules are enforced by the AI Guard engine.</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-5 mb-8 flex items-center gap-4 backdrop-blur-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-amber-200/80 text-xs font-semibold leading-relaxed">
            This is a proctored session. All digital footprints (tab switches, exits) are monitored. 3 Violations trigger an immediate terminal lock.
          </p>
        </div>

        <div className="glass-card p-10 mb-10 space-y-8">
          {RULES.map((rule, idx) => (
            <div key={idx} className="flex items-start gap-6 pb-8 border-b border-white/5 last:border-0 last:pb-0">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
                {rule.icon}
              </div>
              <div className="pt-1">
                <h3 className="font-black text-white text-base uppercase tracking-tight mb-2">{rule.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed font-medium">{rule.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="glass-card p-6">
            <h2 className="font-black text-white text-[11px] mb-4 flex items-center gap-2 uppercase tracking-widest opacity-60">
              <Timer className="w-3.5 h-3.5 text-blue-400" /> Transcription Specs
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Minimum Words', value: '30 per phase' },
                { label: 'Maximum Words', value: '350 per phase' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-gray-700 tracking-widest">{item.label}</span>
                  <span className="text-xs font-black text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="font-black text-white text-[11px] mb-4 flex items-center gap-2 uppercase tracking-widest opacity-60">
              <Shield className="w-3.5 h-3.5 text-violet-400" /> Integrity Metrics
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Tab Latency', value: '-10% per s' },
                { label: 'Max ERR', value: '3/3' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-gray-700 tracking-widest">{item.label}</span>
                  <span className="text-xs font-black text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <label className="flex items-start gap-4 cursor-pointer mb-8 select-none group">
          <div className="relative flex items-center">
            <input
              id="agree-checkbox"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="peer h-5 w-5 opacity-0 absolute"
            />
            <div className="h-5 w-5 border-2 border-white/10 rounded-md bg-white/5 peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all flex items-center justify-center">
              {agreed && <ChevronRight className="w-3 h-3 text-white" />}
            </div>
          </div>
          <span className="text-gray-400 text-xs leading-relaxed font-medium group-hover:text-gray-300 transition-colors">
            By enabling this toggle, I confirm my cognitive sync with the protocol. I acknowledge that the AI Guard engine's decisions are final.
          </span>
        </label>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest text-center">
            ⚠️ ERR: {error}
          </div>
        )}

        <button
          id="start-competition-btn"
          onClick={handleStart}
          disabled={starting || !agreed}
          className="btn-primary w-full flex items-center justify-center gap-3 py-5 text-sm font-black uppercase tracking-[0.2em] rounded-2xl disabled:opacity-30 disabled:grayscale transition-all"
        >
          {starting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Syncing...</>
          ) : (
            <>Start Pitching <ArrowRight className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </div>
  );
}
