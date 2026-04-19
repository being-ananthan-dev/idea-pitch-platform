import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useFlowGuard } from '@/hooks/useFlowGuard';
import { useAuth } from '@/context/AuthContext';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowUpRight, Zap, CheckCircle2, ChevronRight,
  LogOut, Lock, Timer,
} from 'lucide-react';
import { useModal } from '@/context/ModalContext';

// ── Shared Animation Variants ──────────────────────────────────
const FADE_UP = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

// ── Step Card ─────────────────────────────────────────────
function StepCard({ step, title, desc, isLast }: { step: number; title: string; desc: string; isLast?: boolean }) {
  return (
    <motion.div 
      variants={FADE_UP}
      className="flex gap-6 relative"
    >
      <div className="flex flex-col items-center gap-0">
        <div className="relative w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-black text-lg shrink-0 z-10 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
          {step}
        </div>
        {!isLast && <div className="w-px flex-1 bg-gradient-to-b from-blue-500/40 to-transparent mt-2 mb-0 min-h-[3rem]" />}
      </div>
      <div className="pb-12">
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, submissionStatus } = useFlowGuard({ requiredStep: 'home' });
  const { signOut } = useAuth();
  const { showModal } = useModal();
  const navigate = useNavigate();

  // Scroll parallax effects
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const opacityFade = useTransform(scrollY, [0, 300], [1, 0]);

  const handleEnterEvent = () => {
    if (submissionStatus === 'submitted' || submissionStatus === 'locked') {
      showModal({
        title: 'Already Submitted',
        message: 'You have already submitted your pitch! Navigating to your submission receipt.',
        type: 'info',
        confirmText: 'Go to Receipt',
        onConfirm: () => navigate('/thankyou')
      });
    } else {
      navigate('/details');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="selection:bg-blue-500/30 bg-mesh min-h-screen"
    >
      {/* ── Navbar ────── */}
      <nav className="sticky top-0 z-50 w-full h-20 border-b border-white/[0.06] bg-[#030712]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-full flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl shadow-[0_0_20px_rgba(59,130,246,0.5)]">
              💡
            </div>
            <div>
              <span className="font-extrabold text-[1.1rem] tracking-tight text-white">IntelliPitch</span>
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-0.5">IEEE SB MCET</div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4"
          >
            {user && (
              <div className="hidden sm:flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                  {user.displayName?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-gray-200 max-w-[140px] truncate">{user.displayName}</span>
                <button onClick={signOut} className="text-gray-500 hover:text-red-400 transition-colors ml-1" title="Sign out">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button onClick={handleEnterEvent} className="btn-primary flex items-center gap-2 group text-sm px-6 py-2">
              Enter Arena
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </motion.div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="main-container pt-24 pb-28 relative overflow-hidden">
        <motion.div 
          style={{ y: heroY, opacity: opacityFade }}
          className="flex flex-col items-center text-center relative z-10"
        >
          <motion.div 
            variants={STAGGER_CONTAINER}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center gap-7 max-w-3xl"
          >
            <motion.div variants={FADE_UP} className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur text-sm shadow-[0_0_30px_rgba(59,130,246,0.15)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500 border border-blue-300"></span>
              </span>
              <span className="text-blue-300 font-semibold text-xs uppercase tracking-widest">Live Competition Open</span>
            </motion.div>

            <motion.div variants={FADE_UP} className="w-full">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.08] tracking-tight text-white pb-2 overflow-visible">
                Pitch Your<br />
                <span className="gradient-text-animated filter drop-shadow-[0_0_40px_rgba(59,130,246,0.4)]">Masterpiece.</span>
              </h1>
            </motion.div>

            <motion.p variants={FADE_UP} className="text-lg text-gray-400 leading-relaxed w-full max-w-2xl px-2 sm:px-0 text-center">
              Step into the high-stakes arena. Architect solutions to real-world problems under pressure — judged blind, timed to the millisecond.
            </motion.p>

            <motion.div variants={FADE_UP} className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleEnterEvent}
                className="btn-primary group flex items-center gap-3 text-base px-8 py-4"
              >
                <Zap className="w-5 h-5 fill-[#030712]" />
                Start Pitching
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </motion.div>

            <motion.div variants={FADE_UP} className="flex flex-wrap justify-center gap-3 pt-6">
              {[
                { icon: Lock, text: 'Fully Secure' },
                { icon: CheckCircle2, text: 'Blind Judged' },
                { icon: Timer, text: 'Server-Synced' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.05] rounded-full px-4 py-2 text-xs font-semibold text-gray-400">
                  <Icon className="w-3.5 h-3.5 text-blue-400" />
                  {text}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── TICKER TAPE ── */}
      <div className="border-y border-white/[0.04] bg-white/[0.01] py-4 overflow-hidden relative backdrop-blur-sm">
        <div className="ticker-tape text-[12px] font-bold uppercase tracking-widest text-gray-500 gap-12">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-12 items-center shrink-0">
              {['⏱ Timed Challenges', '🛡 Anti-Cheat Engine', '📊 Blind Evaluations', '🏆 ₹10,000 Prize Pool', '🔒 Data Encrypted', '⚡ Auto-Save Active', '📋 3 Questions', '👁 Zero Bias Scoring'].map((t) => (
                <span key={t} className="inline-flex items-center gap-2">{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section className="border-t border-white/[0.04] py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            
            {/* Left Copy */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={STAGGER_CONTAINER}
              className="sticky top-32"
            >
              <motion.div variants={FADE_UP} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-400 uppercase tracking-widest mb-6">
                <Zap className="w-3.5 h-3.5" />
                How It Works
              </motion.div>
              <motion.h2 variants={FADE_UP} className="text-4xl md:text-5xl font-black leading-tight mb-6 text-white">
                From Login to<br /><span className="gradient-text filter drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]">Trophy.</span>
              </motion.h2>
              <motion.p variants={FADE_UP} className="text-gray-400 leading-relaxed text-lg mb-10 max-w-md">
                The entire competition is automated and takes fewer than 15 minutes. Follow the four steps and let your idea speak for itself.
              </motion.p>
              <motion.button 
                variants={FADE_UP}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleEnterEvent} 
                className="btn-primary flex items-center gap-3 text-base px-8 py-4 group"
              >
                <Zap className="w-5 h-5 fill-[#030712]" />
                Begin Journey
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </motion.div>

            {/* Right Steps */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={STAGGER_CONTAINER}
              className="flex flex-col pt-2"
            >
              <StepCard step={1} title="Sign In & Register" desc="Log in with your Google account and complete a one-time detail form with your name, email, and phone." />
              <StepCard step={2} title="Read the Guidelines" desc="Carefully review the competition rules, evaluation criteria, and what happens when the timer begins." />
              <StepCard step={3} title="Answer Three Questions" desc="Answer Problem Statement, Proposed Solution, and Impact — each with a strict server-side countdown." />
              <StepCard step={4} title="Submit & Await Results" desc="Once you submit, our blind evaluation panel scores your ideas on 4 criteria out of 40 points." isLast />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] bg-[#02040A] py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2 opacity-80">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xs shadow-lg">💡</div>
            <span className="font-semibold text-gray-400">IntelliPitch</span>
            <span>·</span>
            <span>© 2026 IEEE SB MCET</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs opacity-70">
            <Lock className="w-3 h-3 text-green-500" />
            <span className="text-gray-500">Secured by Firebase · All Rights Reserved</span>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
