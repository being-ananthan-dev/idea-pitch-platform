'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getSubmission, getConfig } from '@/lib/firestore';
import { Submission, Config } from '@/types';
import { Loader2, CheckCircle, Home, Shield, Clock } from 'lucide-react';
import { useModal } from '@/context/ModalContext';

export default function ThankYouPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { showModal } = useModal();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }

    const load = async () => {
      try {
        const [sub, cfg] = await Promise.all([getSubmission(user.uid), getConfig()]);
        
        if (!sub || (sub.status !== 'submitted' && sub.status !== 'locked')) {
          router.replace('/'); return;
        }
        setSubmission(sub);
        setConfig(cfg);
        setLoading(false);
      } catch (err) {
        showModal({
          title: 'Error',
          message: 'Failed to load submission details. Please try again.',
          type: 'error'
        });
        router.replace('/');
      }
    };
    load();
  }, [user, authLoading, router, showModal]);

  // Disable back button
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const preventBack = () => window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', preventBack);
    return () => window.removeEventListener('popstate', preventBack);
  }, []);

  if (loading || authLoading) {
    return (
      <div className="min-h-[100dvh] bg-bg grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const integrityScore = submission?.integrityScore ?? 100;
  const integrityColor =
    integrityScore >= 80 ? '#10B981' : integrityScore >= 50 ? '#F59E0B' : '#EF4444';

  const submittedAt = submission?.submittedAt
    ? new Date((submission.submittedAt as any).toMillis()).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  const answeredCount = submission?.answers?.length ?? 0;

  return (
    <div className="min-h-screen bg-bg py-20 px-4 md:py-32">
      <div className="container-narrow animate-fade-in-up">
        {/* Success Icon */}
        <div className="text-center mb-16">
          <div className="relative inline-block">
            <div
              className="w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-float"
              style={{
                background: 'linear-gradient(135deg, #10B981, #06B6D4)',
                boxShadow: '0 0 50px rgba(16,185,129,0.5), 0 0 100px rgba(6,182,212,0.3)',
              }}
            >
              <CheckCircle className="w-14 h-14 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Submission Complete! 🎉
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto text-lg leading-relaxed opacity-90">
            {submission?.autoSubmitReason
              ? `Your session has concluded. Reason: ${submission.autoSubmitReason}`
              : 'Your innovative solutions have been securely committed to the evaluation engine. Great job!'}
          </p>
        </div>

        {/* Stats */}
        <div className="glass-card p-6 mb-6">
          <h2 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Submission Summary</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Integrity Score */}
            <div className="text-center p-5 rounded-2xl bg-white/5 border border-white/5">
              <Shield className="w-6 h-6 mx-auto mb-2" style={{ color: integrityColor }} />
              <p className="text-3xl font-black" style={{ color: integrityColor }}>
                {integrityScore}
              </p>
              <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest">Integrity</p>
            </div>

            {/* Answers */}
            <div className="text-center p-5 rounded-2xl bg-white/5 border border-white/5">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <p className="text-3xl font-black text-blue-400">
                {answeredCount}/{config?.questions?.length || 0}
              </p>
              <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest">Answered</p>
            </div>

            {/* Time */}
            <div className="text-center p-5 rounded-2xl bg-white/5 border border-white/5">
              <Clock className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
              <p className="text-xs font-black text-cyan-400 leading-tight truncate">{submittedAt.split(',')[0]}</p>
              <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest">Submitted</p>
            </div>
          </div>

          {/* Answers preview */}
          {submission?.answers && submission.answers.length > 0 && config && (
            <div className="space-y-4">
              {config.questions.map((q, idx) => {
                const ans = submission.answers.find((a) => a.questionIndex === idx);
                return (
                  <div key={idx} className="p-6 rounded-[20px] bg-white/5 border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-bold text-gray-300">Q{idx + 1}: {q.title}</p>
                      {ans && (
                        <span className="badge badge-blue px-2 py-0.5 text-[10px] font-bold">{ans.wordCount} words</span>
                      )}
                    </div>
                    {ans ? (
                      <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">{ans.text}</p>
                    ) : (
                      <p className="text-sm text-gray-600 italic">Not answered</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Violations summary if any */}
        {(submission?.tabSwitchCount ?? 0) + (submission?.fullscreenExitCount ?? 0) > 0 && (
          <div className="glass-card p-4 mb-6 border-amber-500/20 bg-amber-950/10">
            <p className="text-amber-300 text-sm font-semibold mb-2">Violations Recorded</p>
            <div className="flex gap-4 text-sm text-gray-400">
              <span>Tab Switches: <strong className="text-amber-400">{submission?.tabSwitchCount}</strong></span>
              <span>Fullscreen Exits: <strong className="text-amber-400">{submission?.fullscreenExitCount}</strong></span>
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          id="go-home-btn"
          onClick={() => router.replace('/home')}
          className="btn-primary w-full flex items-center justify-center gap-3 py-5 text-lg font-black tracking-tight shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all group"
        >
          <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Return to Hub
        </button>

        <p className="text-center text-xs text-gray-600 mt-4">
          Results will be announced by IEEE SB MCET · ieee@mcet.in
        </p>
      </div>
    </div>
  );
}
