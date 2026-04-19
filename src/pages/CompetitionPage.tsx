import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Loader2, Save, ArrowRight, Send, LogOut } from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfig } from '@/context/ConfigContext';

const DRAFT_KEY = (uid: string, qi: number) => `intellipitch_draft_${uid}_q${qi}`;

export default function CompetitionPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { config: globalConfig } = useConfig();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [minWordError, setMinWordError] = useState('');
  const { showModal } = useModal();

  const answerRef = useRef('');
  const submissionRef = useRef<Submission | null>(null);
  const configRef = useRef<Config | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);

  // Direction state for framing slide animations (left or right)
  const [slideDirection, setSlideDirection] = useState(1);

  const handleViolation = useCallback(
    async (type: 'tab_switch' | 'fullscreen_exit', _total: number) => {
      // hook handles local state + direct atomic firestore update
      // we only need to sync the local submissionRef for UI consistency
      if (!submissionRef.current) return;
      const penalty = type === 'tab_switch' ? 10 : 15;
      const updated = {
        ...submissionRef.current,
        tabSwitchCount: submissionRef.current.tabSwitchCount + (type === 'tab_switch' ? 1 : 0),
        fullscreenExitCount: submissionRef.current.fullscreenExitCount + (type === 'fullscreen_exit' ? 1 : 0),
        integrityScore: Math.max(0, submissionRef.current.integrityScore - penalty)
      };
      submissionRef.current = updated;
      setSubmission(updated);
    },
    []
  );

  const handleAutoSubmit = useCallback(
    async (reason: string) => {
      if (submittingRef.current || !user || !submissionRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      
      const draft = answerRef.current;
      const wc = countWords(draft);
      
      try {
        await submitSubmission(user.uid, draft, wc, reason);
        localStorage.removeItem(DRAFT_KEY(user.uid, submissionRef.current.questionIndex));
        navigate('/thankyou', { replace: true });
      } catch (err) {
        console.error('Final auto-submit failed', err);
        setSubmitting(false);
        submittingRef.current = false;
      }
    },
    [user, navigate]
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

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [sub, cfg] = await Promise.all([
          getSubmission(user.uid),
          globalConfig ? Promise.resolve(globalConfig) : getConfig()
        ]);
        if (!sub) { navigate('/guidelines', { replace: true }); return; }
        if (sub.status === 'submitted' || sub.status === 'locked') {
          navigate('/thankyou', { replace: true }); return;
        }
        submissionRef.current = sub;
        configRef.current = cfg as Config;
        setSubmission(sub);
        setConfig(cfg as Config);
        const draftKey = DRAFT_KEY(user.uid, sub.questionIndex);
        const savedDraft = typeof window !== 'undefined' ? localStorage.getItem(draftKey) : null;
        const storedAnswer = sub.answers?.find((a) => a.questionIndex === sub.questionIndex);
        const initialText = savedDraft || storedAnswer?.text || '';
        setAnswer(initialText);
        answerRef.current = initialText;
        initCounts(sub.tabSwitchCount, sub.fullscreenExitCount);
      } catch (err) {
        console.error('Failed to load competition state', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, navigate, initCounts, globalConfig]);

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const wc = countWords(text);
    const max = configRef.current?.maxWords ?? 350;
    if (wc > max && text.length > answerRef.current.length) return;
    
    setAnswer(text);
    answerRef.current = text;
    setMinWordError('');
    
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus('saving');
    
    autoSaveTimerRef.current = setTimeout(async () => {
      if (user) {
        const qi = submissionRef.current?.questionIndex ?? 0;
        // Sync to local for reliability
        localStorage.setItem(DRAFT_KEY(user.uid, qi), text);
        // Sync to Firestore for "Cyber Strong" persistence
        try {
          await saveAnswer(user.uid, qi, text, wc);
          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus('idle'), 2000);
        } catch (err) {
          console.error('Auto-save to firestore failed', err);
          setAutoSaveStatus('idle'); // fail silently but stay idle
        }
      }
    }, 1200);
  };

  const handleTimerExpire = useCallback(async () => {
    if (submittingRef.current || !user || !submissionRef.current || !configRef.current) return;
    const sub = submissionRef.current;
    const qi = sub.questionIndex;
    const draft = answerRef.current;
    const wc = countWords(draft);
    const totalQ = configRef.current.questions.length;
    if (qi < totalQ - 1) {
      const nextQi = qi + 1;
      setSlideDirection(1); // Slide right
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
    } else {
      await handleAutoSubmit('Timer expired on final question');
    }
  }, [user, handleAutoSubmit]);

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
      setSlideDirection(1);
      
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
      await submitSubmission(user.uid, draft, wc);
      localStorage.removeItem(DRAFT_KEY(user.uid, qi));
      navigate('/thankyou', { replace: true });
    }
  };

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const preventBack = () => window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', preventBack);
    return () => window.removeEventListener('popstate', preventBack);
  }, []);

  if (loading || !submission || !config) {
    return (
      <div className="min-h-[100dvh] bg-[#030712] grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const qi = submission.questionIndex;
  const question = config.questions[qi];
  const allowedTime = question?.timer ?? 120;
  const isLastQuestion = qi === config.questions.length - 1;
  
  // Local calc should match firestore.ts logic for UI consistency
  const integrityScore = Math.max(0, 100 - (tabSwitchCount * 10) - (fullscreenExitCount * 15));
  const totalViolations = tabSwitchCount + fullscreenExitCount;

  if (!question) return null;

  // Slide Animation Variants
  const variants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? 50 : -50,
        opacity: 0,
        scale: 0.98
      };
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        x: direction < 0 ? 50 : -50,
        opacity: 0,
        scale: 0.98
      };
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="h-[100dvh] bg-[#030712] flex flex-col overflow-hidden relative"
    >
      {/* Background Mesh */}
      <div className="absolute inset-0 bg-mesh pointer-events-none opacity-50"></div>

      {showBanner && lastViolationType && (
        <ViolationBanner
          count={totalViolations}
          maxCount={3}
          type={lastViolationType}
          onDismiss={dismissBanner}
        />
      )}

      <header className="border-b border-white/5 bg-[#010309]/80 backdrop-blur-3xl px-4 sm:px-8 py-3 relative z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-sm shadow-lg shadow-blue-500/20">💡</div>
            <span className="font-black text-[10px] tracking-tighter text-white uppercase italic hidden md:block">Pitch Terminal v2.0</span>
          </div>
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <Timer
              questionStartTime={submission.questionStartTime as Timestamp}
              allowedTime={allowedTime}
              onExpire={handleTimerExpire}
            />
          </div>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 font-black">
            {autoSaveStatus !== 'idle' && (
              <motion.span 
                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`hidden sm:flex items-center gap-1.5 text-[9px] uppercase tracking-widest ${autoSaveStatus === 'saving' ? 'text-gray-500' : 'text-emerald-400'}`}
              >
                <div className={`w-1 h-1 rounded-full ${autoSaveStatus === 'saving' ? 'bg-gray-500 animate-pulse' : 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                {autoSaveStatus === 'saving' ? 'Syncing' : 'Buffered'}
              </motion.span>
            )}
            <div className={`badge ${integrityScore >= 70 ? 'badge-green' : integrityScore >= 40 ? 'badge-yellow' : 'badge-red'} scale-90 sm:scale-100 font-mono text-[10px]`}>
              {integrityScore}%
            </div>
            {totalViolations > 0 && (
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.3 }} className="badge badge-red scale-100 sm:scale-110 font-mono text-[11px]">ERR: {totalViolations}/3</motion.div>
            )}
            <button 
              onClick={signOut}
              className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all ml-1"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 main-container py-8 md:py-12 flex flex-col gap-6 overflow-hidden relative z-10">
        
        {/* Progress Bar Container */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <ProgressBar
            currentQuestion={qi}
            total={config.questions.length}
            labels={config.questions.map(q => q.title)}
          />
        </motion.div>

        {/* Question Area Container */}
        <div className="relative flex-1 min-h-0 w-full max-w-4xl mx-auto">
          <AnimatePresence initial={false} custom={slideDirection} mode="wait">
            <motion.div
              key={qi} // Animate on question index change
              custom={slideDirection}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
              className="absolute inset-0 w-full h-full glass-card p-6 md:p-8 flex flex-col gap-5 border border-white/5"
            >
              <div className="shrink-0 mb-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black italic text-blue-400 tracking-widest uppercase shadow-inner">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Protocol Phase {qi + 1}
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest opacity-40">System ready // Waiting for input</span>
                </div>
                <h2 className="text-4xl font-black text-white mb-4 tracking-tighter leading-none">{question.title}</h2>
                <div className="text-gray-300 leading-relaxed text-lg font-medium bg-[#050810] rounded-xl p-6 border border-white/5 max-h-[160px] overflow-y-auto">
                  {question.prompt}
                </div>
              </div>

              <div className="flex flex-col flex-1 min-h-0 relative">
                <label className="text-xs font-bold text-gray-500 mb-2 flex items-center justify-between uppercase tracking-widest px-1">
                  <span>Your Pitch</span>
                  <span className="opacity-60">Min {config.minWords} · Max {config.maxWords}</span>
                </label>
                
                {/* Textarea gets focus halo */}
                <div className="relative flex-1 flex min-h-0 group">
                  <textarea
                    id={`answer-q${qi}`}
                    value={answer}
                    onChange={handleAnswerChange}
                    disabled={submitting}
                    placeholder="Initialise transcription..."
                    className="input-field resize-none flex-1 leading-[1.8] text-[0.95rem] bg-[#02040A] hover:bg-[#03060F] transition-all border border-white/10 shadow-2xl p-6 font-inter text-gray-200 placeholder:text-gray-800 focus:border-blue-500/40 rounded-2xl"
                  />
                  <div className="absolute bottom-6 right-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-700 pointer-events-none z-20">
                    Terminal Transcription Active // AI Guard v2
                  </div>
                </div>

                <div className="flex items-end justify-between mt-3 shrink-0 px-1">
                  <div>
                    {minWordError && (
                      <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="text-red-400 text-xs font-medium flex items-center gap-1.5">
                        ⚠️ {minWordError}
                      </motion.p>
                    )}
                  </div>
                  <WordCounter text={answer} min={config.minWords} max={config.maxWords} />
                </div>
              </div>

              <div className="flex justify-end shrink-0 pt-2 border-t border-white/5 mt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  id={isLastQuestion ? 'submit-btn' : `next-q${qi}-btn`}
                  onClick={handleNext}
                  disabled={submitting}
                  className="btn-primary flex items-center gap-2.5 px-8 py-3.5 text-sm w-full sm:w-auto overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000" />
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin text-[#030712]" /> <span>{isLastQuestion ? 'Submitting...' : 'Saving...'}</span></>
                  ) : isLastQuestion ? (
                    <><Send className="w-4 h-4 text-[#030712]" /> <span>Submit Pitch</span></>
                  ) : (
                    <><span>Lock & Continue</span> <ArrowRight className="w-4 h-4 text-[#030712] group-hover:translate-x-1 transition-transform" /></>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.p 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          className="text-center text-[11px] font-medium tracking-widest uppercase text-gray-600 pb-2 mt-4"
        >
          ⚠️ Do not switch tabs or exit fullscreen
        </motion.p>
      </main>
    </motion.div>
  );
}
