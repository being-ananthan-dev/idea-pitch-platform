'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  getAllSubmissions,
  saveEvaluation,
  getEvaluationsForSubmission,
  isJudge,
} from '@/lib/firestore';
import { Submission, Evaluation, EvaluationScores } from '@/types';
import {
  Loader2, Shield, Star, Send, ChevronDown, ChevronUp, LogOut, CheckCircle
} from 'lucide-react';

const SCORE_CRITERIA = [
  { key: 'innovation' as keyof EvaluationScores, label: 'Innovation', desc: 'How novel and creative is the idea?' },
  { key: 'feasibility' as keyof EvaluationScores, label: 'Feasibility', desc: 'Is the solution practically implementable?' },
  { key: 'impact' as keyof EvaluationScores, label: 'Impact', desc: 'What is the potential societal/economic impact?' },
  { key: 'clarity' as keyof EvaluationScores, label: 'Clarity', desc: 'How well-articulated and clear are the answers?' },
];

const QUESTION_TITLES = ['Problem Statement', 'Proposed Solution', 'Impact & Innovation'];

interface EvaluationFormState {
  scores: EvaluationScores;
  remarks: string;
  saving: boolean;
  saved: boolean;
}

const defaultScores = (): EvaluationScores => ({
  innovation: 5,
  feasibility: 5,
  impact: 5,
  clarity: 5,
});

export default function JudgePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, EvaluationFormState>>({});
  const [existingEvals, setExistingEvals] = useState<Record<string, Evaluation>>({});

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const ok = await isJudge(user.email || '');
      setAuthorized(ok);
      if (!ok) { setLoading(false); return; }

      const subs = await getAllSubmissions();
      const submitted = subs.filter((s) => s.status === 'submitted' || s.status === 'locked');
      setSubmissions(submitted);

      // Load existing evaluations for this judge
      const evalMap: Record<string, Evaluation> = {};
      await Promise.all(
        submitted.map(async (sub) => {
          const evals = await getEvaluationsForSubmission(sub.uid);
          const myEval = evals.find((e) => e.judgeId === user.uid);
          if (myEval) evalMap[sub.uid] = myEval;
        })
      );
      setExistingEvals(evalMap);

      // Initialize form states
      const initialForms: Record<string, EvaluationFormState> = {};
      submitted.forEach((sub) => {
        const existing = evalMap[sub.uid];
        initialForms[sub.uid] = {
          scores: existing?.scores ?? defaultScores(),
          remarks: existing?.remarks ?? '',
          saving: false,
          saved: !!existing,
        };
      });
      setForms(initialForms);
      setLoading(false);
    };
    check();
  }, [user]);

  const updateScore = (uid: string, key: keyof EvaluationScores, val: number) => {
    setForms((prev) => ({
      ...prev,
      [uid]: {
        ...prev[uid],
        scores: { ...prev[uid].scores, [key]: val },
        saved: false,
      },
    }));
  };

  const updateRemarks = (uid: string, val: string) => {
    setForms((prev) => ({
      ...prev,
      [uid]: { ...prev[uid], remarks: val, saved: false },
    }));
  };

  const handleSaveEvaluation = async (sub: Submission) => {
    if (!user) return;
    const form = forms[sub.uid];
    if (!form) return;

    setForms((prev) => ({ ...prev, [sub.uid]: { ...prev[sub.uid], saving: true } }));

    const total = Object.values(form.scores).reduce((a, b) => a + b, 0);
    await saveEvaluation({
      submissionId: sub.uid,
      judgeId: user.uid,
      judgeName: user.displayName || '',
      scores: form.scores,
      total,
      remarks: form.remarks,
    });

    setForms((prev) => ({
      ...prev,
      [sub.uid]: { ...prev[sub.uid], saving: false, saved: true },
    }));
  };

  // ─── Auth / Loading ───────────────────────────────────────────────────────

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
        <div className="glass-card p-10 text-center max-w-sm">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Judge Access Only</h1>
          <p className="text-gray-400 text-sm mb-6">
            You are not registered as a judge. Contact the admin.
          </p>
          <button onClick={() => router.replace('/')} className="btn-secondary w-full">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-black/30 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">💡</span>
            <span className="font-bold gradient-text">IntelliPitch</span>
            <span className="badge badge-blue">Judge Panel</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-400 hidden sm:block">{user.displayName}</div>
            <button onClick={signOut} className="text-gray-400 hover:text-white transition-colors p-2">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl font-extrabold text-white mb-1">Evaluate Submissions</h1>
          <p className="text-gray-400 text-sm">
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''} available ·{' '}
            {Object.values(forms).filter((f) => f.saved).length} evaluated
          </p>
        </div>

        {submissions.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Star className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">No submitted entries yet. Check back later.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub, idx) => {
              const isOpen = expanded === sub.uid;
              const form = forms[sub.uid];
              if (!form) return null;
              const total = Object.values(form.scores).reduce((a, b) => a + b, 0);
              const integrityColor = sub.integrityScore >= 70 ? 'text-green-400' : sub.integrityScore >= 40 ? 'text-amber-400' : 'text-red-400';

              return (
                <div key={sub.uid} className={`glass-card overflow-hidden transition-all duration-300 ${form.saved ? 'border-green-500/20' : ''}`}>
                  {/* Submission Header */}
                  <button
                    id={`judge-toggle-${idx}`}
                    onClick={() => setExpanded(isOpen ? null : sub.uid)}
                    className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {sub.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{sub.name}</p>
                        <p className="text-gray-500 text-xs">{sub.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className={`text-xs font-bold ${integrityColor}`}>
                        🛡️ {sub.integrityScore}
                      </div>
                      {form.saved && (
                        <div className="badge badge-green">
                          <CheckCircle className="w-3 h-3" /> Evaluated
                        </div>
                      )}
                      {form.saved && (
                        <div className="badge badge-blue font-bold">{total}/40</div>
                      )}
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isOpen && (
                    <div className="border-t border-white/5 p-6 space-y-8 animate-fade-in">
                      {/* Answers */}
                      <div>
                        <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                          <span>📋</span> Submitted Answers
                        </h3>
                        <div className="space-y-4">
                          {QUESTION_TITLES.map((title, qi) => {
                            const ans = sub.answers?.find((a) => a.questionIndex === qi);
                            return (
                              <div key={qi} className="p-4 rounded-xl bg-white/5 border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-semibold text-blue-300">Q{qi + 1}: {title}</p>
                                  {ans && <span className="badge badge-blue">{ans.wordCount} words</span>}
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                  {ans?.text || (
                                    <span className="text-gray-600 italic">No answer submitted</span>
                                  )}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Scoring */}
                      <div>
                        <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-400" /> Score This Submission
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-5">
                          {SCORE_CRITERIA.map(({ key, label, desc }) => (
                            <div key={key} className="p-4 rounded-xl bg-white/5 border border-white/5">
                              <div className="flex justify-between items-center mb-1">
                                <p className="font-semibold text-white text-sm">{label}</p>
                                <span className="text-2xl font-extrabold text-blue-400 w-10 text-center">
                                  {form.scores[key]}
                                </span>
                              </div>
                              <p className="text-gray-500 text-xs mb-3">{desc}</p>
                              <input
                                id={`score-${sub.uid}-${key}`}
                                type="range"
                                min={0}
                                max={10}
                                step={1}
                                value={form.scores[key]}
                                onChange={(e) => updateScore(sub.uid, key, Number(e.target.value))}
                                className="w-full accent-blue-500"
                              />
                              <div className="flex justify-between text-xs text-gray-600 mt-1">
                                <span>0</span><span>5</span><span>10</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Total */}
                        <div className="mt-4 p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 flex items-center justify-between">
                          <span className="text-gray-300 text-sm font-medium">Total Score</span>
                          <span className="text-3xl font-extrabold gradient-text">{total} <span className="text-lg text-gray-500">/ 40</span></span>
                        </div>

                        {/* Remarks */}
                        <div className="mt-4">
                          <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                            Remarks / Feedback
                          </label>
                          <textarea
                            id={`remarks-${sub.uid}`}
                            value={form.remarks}
                            onChange={(e) => updateRemarks(sub.uid, e.target.value)}
                            placeholder="Optional feedback for the organizer..."
                            className="input-field resize-none"
                            rows={3}
                          />
                        </div>

                        {/* Save Button */}
                        <button
                          id={`save-eval-${idx}`}
                          onClick={() => handleSaveEvaluation(sub)}
                          disabled={form.saving}
                          className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                        >
                          {form.saving ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                          ) : form.saved ? (
                            <><CheckCircle className="w-4 h-4" /> Update Evaluation</>
                          ) : (
                            <><Send className="w-4 h-4" /> Save Evaluation</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
