'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Timestamp } from 'firebase/firestore';
import {
  getSubmission,
  getConfig,
  advanceQuestion,
  submitSubmission,
  updateViolationCount,
  saveAnswer,
} from '@/lib/firestore';
import { Submission, Config } from '@/types';
import Timer from '@/components/Timer';
import ProgressBar from '@/components/ProgressBar';
import WordCounter, { countWords } from '@/components/WordCounter';
import ViolationBanner from '@/components/ViolationBanner';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { Loader2, Save, ArrowRight, Send } from 'lucide-react';
import { useModal } from '@/context/ModalContext';

// Removed hardcoded QUESTIONS array — now fetched from Firestore config
const DRAFT_KEY = (uid: string, qi: number) => `intellipitch_draft_${uid}_q${qi}`;

export default function CompetitionPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [minWordError, setMinWordError] = useState('');
  const { showModal } = useModal();

  // Refs for stable callback refs in interval/event handlers
  const answerRef = useRef('');
  const submissionRef = useRef<Submission | null>(null);
  const configRef = useRef<Config | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);

  // ─── Anti-Cheat ───────────────────────────────────────────────────────────

  const handleViolation = useCallback(
    async (type: 'tab_switch' | 'fullscreen_exit', total: number) => {
      if (!user || !submission) return;
      const sub = submissionRef.current;
      if (!sub) return;
      const tabs = type === 'tab_switch' ? sub.tabSwitchCount + 1 : sub.tabSwitchCount;
      const fs = type === 'fullscreen_exit' ? sub.fullscreenExitCount + 1 : sub.fullscreenExitCount;
      // Update ref immediately
      submissionRef.current = { ...sub, tabSwitchCount: tabs, fullscreenExitCount: fs };
      setSubmission((prev) =>
        prev ? { ...prev, tabSwitchCount: tabs, fullscreenExitCount: fs } : prev
      );
      await updateViolationCount(user.uid, tabs, fs);
    },
    [user, submission]
  );

  const handleAutoSubmit = useCallback(
    async (reason: string) => {
      if (submittingRef.current || !user || !submissionRef.current || !configRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      const sub = submissionRef.current;
      const qi = sub.questionIndex;
      const draft = answerRef.current;
      const wc = countWords(draft);
      await submitSubmission(
        user.uid,
        draft,
        wc,
        sub.tabSwitchCount,
        sub.fullscreenExitCount,
        reason
      );
      // Save to localStorage as backup
      if (typeof window !== 'undefined') {
        localStorage.setItem(DRAFT_KEY(user.uid, qi), draft);
      }
      router.replace('/thankyou');
    },
    [user, router]
  );

  const {
    tabSwitchCount,
    fullscreenExitCount,
    lastViolationType,
    showBanner,
    dismissBanner,
    initCounts,
  } = useAntiCheat({
    uid: user?.uid || '',
    name: user?.displayName || '',
    onViolation: handleViolation,
    onAutoSubmit: handleAutoSubmit,
    maxViolations: 3,
    enabled: !loading && !submitting,
  });

  // ─── Load Submission & Config ─────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const [sub, cfg] = await Promise.all([getSubmission(user.uid), getConfig()]);

        if (!sub) { router.replace('/guidelines'); return; }
        if (sub.status === 'submitted' || sub.status === 'locked') {
          router.replace('/thankyou'); return;
        }

        submissionRef.current = sub;
        configRef.current = cfg;
        setSubmission(sub);
        setConfig(cfg);

        // Restore draft from localStorage
        const draftKey = DRAFT_KEY(user.uid, sub.questionIndex);
        const savedDraft = typeof window !== 'undefined' ? localStorage.getItem(draftKey) : null;
        // Also check stored answers in Firestore
        const storedAnswer = sub.answers?.find((a) => a.questionIndex === sub.questionIndex);
        const initialText = savedDraft || storedAnswer?.text || '';
        setAnswer(initialText);
        answerRef.current = initialText;

        // Restore violation counts
        initCounts(sub.tabSwitchCount, sub.fullscreenExitCount);
      } catch (err) {
        console.error('Failed to load competition state', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, router, initCounts]);

  // ─── Auto-save draft to localStorage on each keystroke ───────────────────

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    // Enforce word limit: don't allow typing if word count > max
    const wc = countWords(text);
    const max = configRef.current?.maxWords ?? 350;
    if (wc > max && text.length > answerRef.current.length) return; // block adding more

    setAnswer(text);
    answerRef.current = text;
    setMinWordError('');

    // Auto-save to localStorage with debounce
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus('saving');
    autoSaveTimerRef.current = setTimeout(() => {
      if (user) {
        const qi = submissionRef.current?.questionIndex ?? 0;
        localStorage.setItem(DRAFT_KEY(user.uid, qi), text);
      }
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    }, 800);
  };

  // ─── Timer expire handler ─────────────────────────────────────────────────

  const handleTimerExpire = useCallback(async () => {
    if (submittingRef.current || !user || !submissionRef.current || !configRef.current) return;
    const sub = submissionRef.current;
    const qi = sub.questionIndex;
    const draft = answerRef.current;
    const wc = countWords(draft);
    const totalQ = configRef.current.questions.length;

    if (qi < totalQ - 1) {
      // Advance to next question
      const nextQi = qi + 1;
      await advanceQuestion(user.uid, nextQi, draft, wc);
      // Clear localStorage for this question, set next
      localStorage.removeItem(DRAFT_KEY(user.uid, qi));

      const updatedSub = await getSubmission(user.uid);
      if (updatedSub) {
        submissionRef.current = updatedSub;
        setSubmission(updatedSub);
        // Restore draft for next question if any
        const nextDraft = localStorage.getItem(DRAFT_KEY(user.uid, nextQi)) || '';
        setAnswer(nextDraft);
        answerRef.current = nextDraft;
        setMinWordError('');
      }
    } else {
      // Final question expired — auto submit
      await handleAutoSubmit('Timer expired on final question');
    }
  }, [user, handleAutoSubmit]);

  // ─── Manual Next / Submit ─────────────────────────────────────────────────

  const handleNext = async () => {
    if (!user || !submission || !config) return;
    const qi = submission.questionIndex;
    const draft = answerRef.current;
    const wc = countWords(draft);
    const min = config.minWords ?? 30;
    const totalQ = config.questions.length;

    if (wc < min) {
      setMinWordError(`Please write at least ${min} words before proceeding. Current: ${wc} words.`);
      return;
    }

    setSubmitting(true);
    submittingRef.current = true;

    if (qi < totalQ - 1) {
      const nextQi = qi + 1;
      await advanceQuestion(user.uid, nextQi, draft, wc);
      localStorage.removeItem(DRAFT_KEY(user.uid, qi));

      const updatedSub = await getSubmission(user.uid);
      if (updatedSub) {
        submissionRef.current = updatedSub;
        setSubmission(updatedSub);
        const nextDraft = localStorage.getItem(DRAFT_KEY(user.uid, nextQi)) || '';
        setAnswer(nextDraft);
        answerRef.current = nextDraft;
        setMinWordError('');
      }
      setSubmitting(false);
      submittingRef.current = false;
    } else {
      // Final submit
      await submitSubmission(
        user.uid,
        draft,
        wc,
        tabSwitchCount,
        fullscreenExitCount
      );
      localStorage.removeItem(DRAFT_KEY(user.uid, qi));
      router.replace('/thankyou');
    }
  };

  // ─── Disable back navigation ──────────────────────────────────────────────

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const preventBack = () => window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', preventBack);
    return () => window.removeEventListener('popstate', preventBack);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading || !submission || !config) {
    return (
      <div className="min-h-[100dvh] bg-bg grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const qi = submission.questionIndex;
  const question = config.questions[qi];
  const allowedTime = question?.timer ?? 120;
  const isLastQuestion = qi === config.questions.length - 1;
  const wc = countWords(answer);
  const integrityScore = Math.max(0, 100 - tabSwitchCount * 10 - fullscreenExitCount * 15);
  const totalViolations = tabSwitchCount + fullscreenExitCount;

  if (!question) return null; // Safety check

  return (
    <div className="h-[100dvh] bg-bg flex flex-col overflow-hidden">
      {/* Anti-cheat Banner */}
      {showBanner && lastViolationType && (
        <ViolationBanner
          count={totalViolations}
          maxCount={3}
          type={lastViolationType}
          onDismiss={dismissBanner}
        />
      )}

      {/* Top Bar */}
      <header className="border-b border-white/5 bg-black/30 backdrop-blur-md px-4 sm:px-8 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-lg">💡</span>
            <span className="font-bold text-sm gradient-text hidden sm:block">IntelliPitch</span>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2">
            <Timer
              questionStartTime={submission.questionStartTime as Timestamp}
              allowedTime={allowedTime}
              onExpire={handleTimerExpire}
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400">
            {autoSaveStatus !== 'idle' && (
              <span className={`flex items-center gap-1 ${autoSaveStatus === 'saving' ? 'text-gray-500' : 'text-green-400'}`}>
                <Save className="w-3 h-3" />
                {autoSaveStatus === 'saving' ? 'Auto-saving...' : 'Saved'}
              </span>
            )}
            {/* Integrity */}
            <div className={`badge ${integrityScore >= 70 ? 'badge-green' : integrityScore >= 40 ? 'badge-yellow' : 'badge-red'}`}>
              🛡️ {integrityScore}
            </div>
            {/* Violations */}
            {totalViolations > 0 && (
              <div className="badge badge-red">
                ⚠️ {totalViolations}/3
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 main-container py-6 md:py-10 flex flex-col gap-6 overflow-hidden">
        {/* Progress */}
        <div className="animate-fade-in">
          <ProgressBar 
            currentQuestion={qi} 
            total={config.questions.length} 
            labels={config.questions.map(q => q.title)}
          />
        </div>

        {/* Question Card */}
        <div className="glass-card p-6 md:p-8 animate-fade-in-up flex-1 flex flex-col gap-5 min-h-0">
          {/* Question Header */}
          <div className="shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{question.emoji}</span>
              <span className="badge badge-blue">Question {qi + 1} of {config.questions.length}</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">{question.title}</h2>
            <div className="text-gray-300 leading-relaxed text-sm bg-white/5 rounded-xl p-3 border border-white/5 max-h-[100px] overflow-y-auto">
              {question.prompt}
            </div>
          </div>

          {/* Answer Textarea */}
          <div className="flex flex-col flex-1 min-h-0">
            <label className="text-xs font-medium text-gray-400 mb-1.5 flex items-center justify-between uppercase tracking-wider px-1">
              <span>Your Answer</span>
              <span>Min {config.minWords} · Max {config.maxWords}</span>
            </label>
            <textarea
              id={`answer-q${qi}`}
              value={answer}
              onChange={handleAnswerChange}
              disabled={submitting}
              placeholder={`Start typing your answer here...`}
              className="input-field resize-none flex-1 leading-relaxed text-base"
              style={{ fontFamily: 'var(--font-inter)' }}
            />
            <div className="shrink-0 mt-2">
              <WordCounter text={answer} min={config.minWords} max={config.maxWords} />
            </div>

            {minWordError && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5 shrink-0">
                ⚠️ {minWordError}
              </p>
            )}
          </div>

          {/* Submit / Next Button */}
          <div className="flex justify-end shrink-0">
            <button
              id={isLastQuestion ? 'submit-btn' : `next-q${qi}-btn`}
              onClick={handleNext}
              disabled={submitting}
              className="group relative overflow-hidden flex items-center gap-2 px-8 py-3 font-bold text-sm rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin relative z-10" /> <span className="relative z-10">{isLastQuestion ? 'Submitting...' : 'Saving...'}</span></>
              ) : isLastQuestion ? (
                <><Send className="w-4 h-4 relative z-10" /> <span className="relative z-10">Submit Answers</span></>
              ) : (
                <><span className="relative z-10">Next Question</span> <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </div>
        </div>

        {/* Bottom hint */}
        <p className="text-center text-xs text-gray-600 pb-2">
          ⚠️ Do not switch tabs or exit fullscreen · Timer runs server-side · Answers auto-save
        </p>
      </main>
    </div>
  );
}
