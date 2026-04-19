'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useFlowGuard } from '@/hooks/useFlowGuard';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowUpRight, Zap, Target, Shield, Clock,
  Trophy, CheckCircle2, ChevronRight, Activity, Cpu,
  LogOut, Lock, Sparkles, Timer, FileText, Users, Award
} from 'lucide-react';
import { useModal } from '@/context/ModalContext';

// ── Scroll Reveal Hook ────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('revealed'); }),
      { threshold: 0.12 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function StatCard({ value, label, icon: Icon, color }: { value: string; label: string; icon: React.ElementType; color: string }) {
  return (
    <div className="glass-card p-6 flex flex-col items-center text-center gap-3">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-3xl font-black text-white stat-number">{value}</span>
      <span className="text-sm text-gray-400 font-medium">{label}</span>
    </div>
  );
}

function FeatureCard({ icon: Icon, iconBg, title, desc, delay = '0s' }: {
  icon: React.ElementType; iconBg: string; title: string; desc: string; delay?: string;
}) {
  return (
    <div className="glass-card p-8 flex flex-col gap-5 reveal" style={{ transitionDelay: delay }}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10 ${iconBg}`}>
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 leading-relaxed text-sm">{desc}</p>
      </div>
    </div>
  );
}

// ── Step Card ─────────────────────────────────────────────
function StepCard({ step, title, desc, isLast }: { step: number; title: string; desc: string; isLast?: boolean }) {
  return (
    <div className="flex gap-6 reveal">
      <div className="flex flex-col items-center gap-0">
        <div className="relative w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-black text-lg shrink-0 z-10">
          {step}
        </div>
        {!isLast && <div className="w-px flex-1 bg-gradient-to-b from-blue-500/40 to-transparent mt-2 mb-0 min-h-[3rem]" />}
      </div>
      <div className="pb-12">
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, submissionStatus } = useFlowGuard({ requiredStep: 'home' });
  const { signOut } = useAuth();
  const { showModal } = useModal();
  const router = useRouter();
  useScrollReveal();

  const handleEnterEvent = () => {
    if (submissionStatus === 'submitted' || submissionStatus === 'locked') {
      showModal({
        title: 'Already Submitted',
        message: 'You have already submitted your pitch! Navigating to your submission receipt.',
        type: 'info',
        confirmText: 'Go to Receipt',
        onConfirm: () => router.push('/thankyou')
      });
    } else {
      router.push('/details');
    }
  };

  // Prefetch next route so clicking "Start Pitching" is instant
  useEffect(() => {
    router.prefetch('/details');
    router.prefetch('/login');
  }, [router]);

  // No loading gate — render immediately, auth redirect happens silently
  return (
    <div className="selection:bg-blue-500/30">
      {/* ── Navbar — solid bg, no backdrop-blur repaint cost ────── */}
      <nav className="sticky top-0 z-50 w-full h-20 border-b border-white/[0.06] bg-[#0A0F1E]/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-full flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl shadow-[0_0_20px_rgba(59,130,246,0.4)]">
              💡
            </div>
            <div>
              <span className="font-extrabold text-[1.1rem] tracking-tight text-white">IntelliPitch</span>
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-0.5">IEEE SB MCET</div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4">
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
            <button
              onClick={handleEnterEvent}
              className="btn-primary flex items-center gap-2 group text-sm px-6 py-2"
            >
              Enter Arena
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════
          HERO SECTION
      ════════════════════════════════════════════════════════ */}
      <section className="main-container pt-20 pb-24">
        <div className="flex flex-col items-center text-center">

          {/* Left: Copy */}
          <div className="flex flex-col items-center gap-7 animate-fade-in-up max-w-3xl">

            {/* Live badge */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur text-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              <span className="text-blue-300 font-semibold text-xs uppercase tracking-widest">Live Competition Open</span>
            </div>

            {/* Headline */}
            <div className="w-full">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.08] tracking-tight text-white overflow-hidden pb-2">
                Pitch Your<br />
                <span className="gradient-text-animated">Masterpiece.</span>
              </h1>
            </div>

            {/* Subtext */}
            <p className="text-lg text-gray-300 leading-relaxed w-full max-w-2xl px-2 sm:px-0 text-center">
              Step into the high-stakes arena. Architect solutions to real-world problems under pressure — judged blind, timed to the millisecond.
            </p>

            {/* CTA row */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-1">
              <button
                id="hero-enter-btn"
                onClick={handleEnterEvent}
                className="btn-primary group flex items-center gap-3 text-base px-8 py-4"
              >
                <Zap className="w-5 h-5 fill-black" />
                Start Pitching
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Trust pills */}
            <div className="flex flex-wrap justify-center gap-3 pt-1">
              {[
                { icon: Lock, text: 'Fully Secure' },
                { icon: CheckCircle2, text: 'Blind Judged' },
                { icon: Timer, text: 'Server-Synced Timers' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-2 text-xs font-semibold text-gray-300">
                  <Icon className="w-3.5 h-3.5 text-blue-400" />
                  {text}
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          TICKER TAPE
      ════════════════════════════════════════════════════════ */}
      <div className="border-y border-white/[0.06] bg-white/[0.02] py-3 overflow-hidden">
        <div className="ticker-tape text-[12px] font-semibold uppercase tracking-widest text-gray-500 gap-12">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-12 items-center shrink-0">
              {['⏱ Timed Challenges','🛡 Anti-Cheat Engine','📊 Blind Evaluations','🏆 ₹10,000 Prize Pool','🔒 Data Encrypted','⚡ Auto-Save Active','📋 3 Questions','👁 Zero Bias Scoring'].map((t) => (
                <span key={t} className="inline-flex items-center gap-2">{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>


      {/* ════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">

            {/* Left: Copy */}
            <div className="reveal-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-300 uppercase tracking-widest mb-6">
                <Zap className="w-3.5 h-3.5" />
                How It Works
              </div>
              <h2 className="text-4xl md:text-5xl font-black leading-tight mb-6">
                From Login to<br /><span className="gradient-text">Trophy.</span>
              </h2>
              <p className="text-gray-400 leading-relaxed text-lg mb-10">
                The entire competition is automated and takes fewer than 15 minutes. Follow the four steps and let your idea speak for itself.
              </p>
              <button
                onClick={handleEnterEvent}
                className="btn-primary flex items-center gap-3 text-base px-8 py-4 group"
              >
                <Zap className="w-5 h-5 fill-black" />
                Begin Journey
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Right: Steps */}
            <div className="reveal-right flex flex-col pt-2">
              <StepCard step={1} title="Sign In & Register" desc="Log in with your Google account and complete a one-time detail form with your name, email, and phone." />
              <StepCard step={2} title="Read the Guidelines" desc="Carefully review the competition rules, evaluation criteria, and what happens when the timer begins." />
              <StepCard step={3} title="Answer Three Questions" desc="Answer Problem Statement, Proposed Solution, and Impact — each with a strict server-side countdown." />
              <StepCard step={4} title="Submit & Await Results" desc="Once you submit, our blind evaluation panel scores your ideas on 4 criteria out of 40 points." isLast />
            </div>
          </div>
        </div>
      </section>



      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] bg-[#06080F] py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xs">💡</div>
            <span className="font-semibold text-gray-400">IntelliPitch</span>
            <span>·</span>
            <span>© 2026 IEEE SB MCET</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Lock className="w-3 h-3 text-green-500" />
            <span className="text-gray-600">Secured by Firebase · All Rights Reserved</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
