import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useFlowGuard } from '@/hooks/useFlowGuard';
import { useAuth } from '@/context/AuthContext';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowUpRight, Zap, CheckCircle2, ChevronRight,
  LogOut, Lock, Timer, ArrowRight,
} from 'lucide-react';
import { useModal } from '@/context/ModalContext';

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

// ── Bento Card ─────────────────────────────────────────────
function BentoCard({ step, title, desc, icon, className = "" }: { step: number; title: string; desc: string; icon: React.ReactNode; className?: string }) {
  return (
    <motion.div 
      variants={FADE_UP}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={`bento-item group ${className}`}
    >
      <div className="absolute top-6 right-6 text-4xl opacity-20 group-hover:opacity-40 transition-opacity duration-500">
        {icon}
      </div>
      <div className="flex flex-col h-full">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-sm mb-6 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
          {step}
        </div>
        <h3 className="text-xl font-black text-white mb-3 tracking-tight group-hover:text-blue-400 transition-colors">{title}</h3>
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
  const heroY = useTransform(scrollY, [0, 500], [0, 100]);
  const opacityFade = useTransform(scrollY, [0, 400], [1, 0]);

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
      className="selection:bg-violet-500/30 bg-mesh min-h-screen font-inter"
    >
      {/* ── Navbar ────── */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl h-16 glass-card rounded-full border border-white/10 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-base shadow-lg shadow-blue-500/20">
            💡
          </div>
          <span className="font-black text-sm tracking-tighter text-white uppercase italic">AdaptiveEd Pitch</span>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden sm:flex items-center gap-3 pr-2 border-r border-white/10 mr-1">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{user.displayName}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button onClick={handleEnterEvent} className="btn-primary flex items-center gap-2 text-[11px] px-5 py-2 uppercase tracking-widest rounded-full">
              {(submissionStatus === 'submitted' || submissionStatus === 'locked') ? 'View Submission' : 'Start Pitching'}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            {user && (
              <button 
                onClick={signOut} 
                className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all shadow-lg"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="main-container pt-44 pb-28 relative overflow-hidden">
        <motion.div 
          style={{ y: heroY }}
          className="flex flex-col items-center text-center relative z-10"
        >
          <motion.div 
            variants={STAGGER_CONTAINER}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center gap-8 max-w-4xl"
          >
            <motion.div variants={FADE_UP} className="px-5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 backdrop-blur text-[10px] font-black uppercase tracking-[0.3em] text-violet-400 shadow-xl shadow-violet-500/10">
              Innovation Engine v2.0
            </motion.div>

            <motion.div variants={FADE_UP} className="w-full">
              <h1 className="text-6xl sm:text-7xl md:text-8xl font-black leading-[0.95] tracking-tighter text-white pb-4">
                Pitch Your<br />
                <span className="gradient-text-animated filter drop-shadow-[0_0_50px_rgba(139,92,246,0.3)]">Education.</span>
              </h1>
            </motion.div>

            <motion.p variants={FADE_UP} className="text-lg text-gray-400 leading-relaxed w-full max-w-2xl px-2 sm:px-0 font-medium">
              Reengineering education for an uncertain future. Join the elite sprint to architect the next-gen learning paradigm.
            </motion.p>

            <motion.div variants={FADE_UP} className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-4">
              <motion.button
                whileHover={{ scale: 1.05, filter: "brightness(1.2)" }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEnterEvent}
                className="btn-primary group flex items-center gap-3 text-sm font-black uppercase tracking-widest px-10 py-5 rounded-2xl"
              >
                <Zap className="w-5 h-5 fill-white" />
                {(submissionStatus === 'submitted' || submissionStatus === 'locked') ? 'View Submission' : 'Start Pitching'}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </motion.div>

            <motion.div variants={FADE_UP} className="flex flex-wrap justify-center gap-6 pt-10">
              {[
                { icon: Lock, text: 'Encrypted' },
                { icon: CheckCircle2, text: 'Blind-Judged' },
                { icon: Timer, text: 'Real-Time' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity">
                  <Icon className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">{text}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── BENTO SECTION ── */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={STAGGER_CONTAINER}
            className="flex flex-col items-center text-center mb-16"
          >
            <motion.div variants={FADE_UP} className="text-blue-500 font-black text-[10px] uppercase tracking-[0.5em] mb-4">
              Protocol Flow
            </motion.div>
            <motion.h2 variants={FADE_UP} className="text-4xl md:text-6xl font-black text-white tracking-tighter">
              From Concept to <span className="text-violet-500">Submission.</span>
            </motion.h2>
          </motion.div>

          {/* Bento Grid Layout */}
          <div className="bento-grid">
            <BentoCard 
              step={1} 
              title="Secure Entry" 
              desc="Instant Google authentication ensures your identity is verified and your seat is reserved in the digital arena." 
              icon={<Lock className="w-full h-full" />}
              className="lg:col-span-2 lg:row-span-2"
            />
            <BentoCard 
              step={2} 
              title="Neural Sync" 
              desc="Review strict guidelines. Fullscreen mode and tab-switching monitoring activate to maintain pure competition integrity." 
              icon={<Zap className="w-full h-full text-violet-500" />}
              className="lg:col-span-2 lg:row-span-1"
            />
            <BentoCard 
              step={3} 
              title="The Sprint" 
              desc="3 high-pressure questions. Problem, Solution, Impact. Each with a relentless server-side countdown." 
              icon={<Timer className="w-full h-full text-blue-500" />}
              className="lg:col-span-1 lg:row-span-1"
            />
             <BentoCard 
              step={4} 
              title="Blind Review" 
              desc="Your identity is scrubbed. Judges score your pitch on metrics alone. Pure meritocracy." 
              icon={<CheckCircle2 className="w-full h-full text-emerald-500" />}
              className="lg:col-span-1 lg:row-span-1"
            />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] bg-[#02040A] py-16 px-4">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-8 text-center">
           <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-2xl shadow-2xl shadow-blue-500/30">💡</div>
           <div>
             <div className="font-black text-white text-lg tracking-tighter uppercase mb-2">AdaptiveEd Pitch</div>
             <p className="text-gray-500 text-xs mb-8">© 2026 IEEE SB MCET — REENGINEERING EDUCATION FOR AN UNCERTAIN FUTURE</p>
           </div>
           <div className="flex items-center gap-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
             <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
             <span className="hover:text-white cursor-pointer transition-colors">Guidelines</span>
             <span className="hover:text-white cursor-pointer transition-colors">Contact</span>
           </div>
        </div>
      </footer>
    </motion.div>
  );
}

