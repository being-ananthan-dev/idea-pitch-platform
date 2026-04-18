'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useFlowGuard } from '@/hooks/useFlowGuard';
import { createSubmission, getConfig } from '@/lib/firestore';
import {
  Loader2, Clock, Shield, AlertTriangle, ChevronRight,
  Timer, Maximize, Eye, RotateCcw
} from 'lucide-react';
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

export default function GuidelinesPage() {
  const { user } = useAuth();
  const { loading } = useFlowGuard({ requiredStep: 'guidelines' });
  const { showModal } = useModal();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleStart = async () => {
    if (!user || !agreed) return;
    setError('');
    setStarting(true);

    try {
      const config = await getConfig();

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

      // Create submission document (server timestamp governs the timer)
      const participant = { name: user.displayName || '', email: user.email || '' };
      await createSubmission(
        user.uid,
        participant.name,
        participant.email,
        config.questions.map(q => q.timer)
      );

      // Request fullscreen
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Fullscreen not supported or denied — continue anyway
      }

      router.push('/competition');
    } catch (err) {
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
    <div className="min-h-screen bg-bg py-20 px-4 md:py-28">
      <div className="container-narrow animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 badge badge-blue mb-6 px-4 py-1.5 uppercase tracking-widest font-bold text-[10px]">
            <span>Step 2 of 3</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Competition Guidelines</h1>
          <p className="text-gray-400 text-lg max-w-lg mx-auto leading-relaxed">Please read carefully before starting. These rules are strictly enforced by our proctoring engine.</p>
        </div>

        {/* Warning Banner */}
        <div className="rounded-3xl border border-amber-500/20 bg-amber-950/20 p-6 mb-10 flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <p className="text-amber-300 text-sm md:text-base font-medium leading-relaxed">
            This is a proctored competition. Your actions are monitored server-side. Violations are logged and will affect your final integrity score.
          </p>
        </div>

        {/* Rules */}
        <div className="glass-card p-8 md:p-12 mb-10 space-y-8">
          {RULES.map((rule, idx) => (
            <div key={idx} className="flex items-start gap-6 pb-8 border-b border-white/5 last:border-0 last:pb-0">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-white/10 transition-colors">
                {rule.icon}
              </div>
              <div>
                <h3 className="font-bold text-white text-base mb-1.5">{rule.title}</h3>
                <p className="text-gray-400 text-sm md:text-base leading-relaxed">{rule.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Answer Requirements */}
        <div className="glass-card p-10 mb-10">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            <Timer className="w-5 h-5 text-blue-400" /> Administrative Logic
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Minimum words', value: '30 words', color: 'text-green-400' },
              { label: 'Maximum words', value: '1,000 words', color: 'text-red-400' },
              { label: 'Auto-save', value: 'Instant & Persistent', color: 'text-blue-400' },
              { label: 'Violations Limit', value: '3 Deviations', color: 'text-amber-400' },
            ].map((item) => (
              <div key={item.label} className="p-5 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{item.label}</p>
                <p className={`text-base font-bold mt-1 ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Integrity Score */}
        <div className="glass-card p-10 mb-10">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
            <Shield className="w-5 h-5 text-cyan-400" /> Integrity Score Calculation
          </h2>
          <p className="text-gray-400 text-base leading-relaxed mb-6">
            Our algorithm measures your focus. High scores indicate high professionalism and preparation.
          </p>
          <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 font-mono text-cyan-300 text-sm text-center tracking-tight">
            100 − (Tab Switches × 10) − (Fullscreen Exit × 15)
          </div>
        </div>

        {/* Agreement */}
        <label className="flex items-start gap-4 cursor-pointer mb-12 select-none group">
          <div className="mt-1 relative flex items-center justify-center">
            <input
              id="agree-checkbox"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="peer h-5 w-5 border-2 border-white/20 rounded-md bg-transparent checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer appearance-none"
            />
            <div className="absolute text-white scale-0 peer-checked:scale-100 transition-transform pointer-events-none">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-gray-300 text-sm md:text-base leading-relaxed hover:text-white transition-colors">
            I understand that starting the competition will trigger **proctored mode** and my time will be monitored server-side. I agree to abide by all platform rules.
          </span>
        </label>

        {error && (
          <div className="mb-8 p-5 rounded-2xl bg-red-950/20 border border-red-500/30 text-red-300 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" /> {error}
          </div>
        )}

        <button
          id="start-competition-btn"
          onClick={handleStart}
          disabled={starting || !agreed}
          className="btn-primary w-full flex items-center justify-center gap-3 py-5 text-lg font-black tracking-tight shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100 group"
        >
          {starting ? (
            <><Loader2 className="w-6 h-6 animate-spin" /> Preparing Launch...</>
          ) : (
            <>Launch Pitch Terminal <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" /></>
          )}
        </button>
      </div>
    </div>
  );
}
