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
    <div className="auth-container">
      <div className="w-full max-w-lg animate-fade-in-up">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 animate-float"
              style={{
                background: 'linear-gradient(135deg, #10B981, #06B6D4)',
                boxShadow: '0 0 40px rgba(16,185,129,0.7), 0 0 80px rgba(6,182,212,0.4)',
              }}
            >
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-2">
            Submission Complete! 🎉
          </h1>
          <p className="text-gray-400 max-w-sm mx-auto text-sm leading-relaxed">
            {submission?.autoSubmitReason
              ? `Your answers were automatically submitted. Reason: ${submission.autoSubmitReason}`
              : 'Your answers have been successfully submitted. Thank you for participating in IntelliPitch!'}
          </p>
        </div>

        {/* Stats */}
        <div className="glass-card p-6 mb-6">
          <h2 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Submission Summary</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Integrity Score */}
            <div className="text-center p-3 rounded-xl bg-white/5">
              <Shield className="w-5 h-5 mx-auto mb-1" style={{ color: integrityColor }} />
              <p className="text-2xl font-extrabold" style={{ color: integrityColor }}>
                {integrityScore}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Integrity</p>
            </div>

            {/* Answers */}
            <div className="text-center p-3 rounded-xl bg-white/5">
              <CheckCircle className="w-5 h-5 mx-auto mb-1 text-blue-400" />
              <p className="text-2xl font-extrabold text-blue-400">
                {answeredCount}/{config?.questions?.length || 0}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Answered</p>
            </div>

            {/* Time */}
            <div className="text-center p-3 rounded-xl bg-white/5">
              <Clock className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
              <p className="text-sm font-bold text-cyan-400 leading-tight">{submittedAt}</p>
              <p className="text-xs text-gray-500 mt-0.5">Submitted</p>
            </div>
          </div>

          {/* Answers preview */}
          {submission?.answers && submission.answers.length > 0 && config && (
            <div className="space-y-3">
              {config.questions.map((q, idx) => {
                const ans = submission.answers.find((a) => a.questionIndex === idx);
                return (
                  <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-semibold text-gray-300">Q{idx + 1}: {q.title}</p>
                      {ans && (
                        <span className="badge badge-blue text-xs">{ans.wordCount} words</span>
                      )}
                    </div>
                    {ans ? (
                      <p className="text-xs text-gray-400 line-clamp-2">{ans.text}</p>
                    ) : (
                      <p className="text-xs text-gray-600 italic">Not answered</p>
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
          className="btn-primary w-full flex items-center justify-center gap-2 py-4"
        >
          <Home className="w-5 h-5" />
          Go to Home
        </button>

        <p className="text-center text-xs text-gray-600 mt-4">
          Results will be announced by IEEE SB MCET · ieee@mcet.in
        </p>
      </div>
    </div>
  );
}
