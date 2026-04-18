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
    <div className="auth-container py-12">
      <div className="w-full max-w-2xl animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Step 2 of 3
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Competition Guidelines</h1>
          <p className="text-gray-400 text-sm">Read carefully before starting. These rules are strictly enforced.</p>
        </div>

        {/* Warning Banner */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-amber-300 text-sm font-medium">
            This is a proctored competition. All actions are monitored. Violations are logged and may affect your score.
          </p>
        </div>

        {/* Rules */}
        <div className="glass-card p-6 mb-6 space-y-5">
          {RULES.map((rule, idx) => (
            <div key={idx} className="flex items-start gap-4 pb-5 border-b border-white/5 last:border-0 last:pb-0">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                {rule.icon}
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">{rule.title}</h3>
                <p className="text-gray-400 text-sm mt-1 leading-relaxed">{rule.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Answer Requirements */}
        <div className="glass-card p-6 mb-6">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Timer className="w-4 h-4 text-blue-400" /> Answer Requirements
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Minimum words', value: '30 words', color: 'text-green-400' },
              { label: 'Maximum words', value: '350 words', color: 'text-red-400' },
              { label: 'Auto-save', value: 'Every question change', color: 'text-blue-400' },
              { label: 'Violations to submit', value: '3', color: 'text-amber-400' },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg bg-white/5">
                <p className="text-gray-500 text-xs">{item.label}</p>
                <p className={`font-bold mt-0.5 ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Integrity Score */}
        <div className="glass-card p-6 mb-6">
          <h2 className="font-bold text-white mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" /> Integrity Score
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Your submission will include an{' '}
            <span className="text-cyan-300 font-semibold">Integrity Score</span> calculated as:
          </p>
          <div className="mt-3 p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/20 font-mono text-cyan-300 text-sm text-center">
            Score = 100 − (Tab Switches × 10) − (Fullscreen Exits × 15)
          </div>
        </div>

        {/* Agreement */}
        <label className="flex items-start gap-3 cursor-pointer mb-6 select-none">
          <input
            id="agree-checkbox"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-4 h-4 accent-blue-500"
          />
          <span className="text-gray-300 text-sm leading-relaxed">
            I have read and understood all the guidelines. I agree to abide by the competition rules and acknowledge that violations may lead to disqualification.
          </span>
        </label>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-500/40 text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        <button
          id="start-competition-btn"
          onClick={handleStart}
          disabled={starting || !agreed}
          className="group relative overflow-hidden w-full flex items-center justify-center gap-3 py-4 text-base font-bold rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          {starting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Starting Competition...</>
          ) : (
            <><Maximize className="w-5 h-5 relative z-10" /> <span className="relative z-10">Launch Pitch Terminal</span><ChevronRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" /></>
          )}
        </button>
      </div>
    </div>
  );
}
