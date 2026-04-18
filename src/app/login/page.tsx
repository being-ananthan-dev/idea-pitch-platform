'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFlowGuard } from '@/hooks/useFlowGuard';
import { Loader2 } from 'lucide-react';
import { useModal } from '@/context/ModalContext';

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const { loading } = useFlowGuard({ requiredStep: 'login' });
  const { showModal } = useModal();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
      setError(msg);
      setGoogleSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    
    setError('');
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.';
      showModal({
        title: isSignUp ? 'Signup Failed' : 'Login Failed',
        message: msg,
        type: 'error'
      });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-bg grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="auth-container">
      {/* Main SaaS Layout Card */}
      <div className="w-full max-w-[1000px] min-h-[600px] h-auto bg-[#0D1326] border border-white/5 rounded-[20px] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] animate-fade-in-up">
        
        {/* LEFT COLUMN: Branding & Illustration (Hidden on Mobile) */}
        <div className="hidden md:flex flex-col items-center justify-center p-12 text-center bg-gradient-to-br from-blue-900/40 to-cyan-900/10 relative overflow-hidden">
          {/* Subtle decorative background shapes */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]"></div>
          
          <div className="z-10 flex flex-col items-center gap-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-gradient-to-br from-blue-500 to-cyan-500 shadow-[0_0_40px_rgba(59,130,246,0.3)]">
              <span className="text-4xl">💡</span>
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
                IntelliPitch
              </h1>
              <p className="text-blue-300 font-medium tracking-widest text-sm uppercase">
                IEEE SB MCET
              </p>
            </div>
            <p className="text-gray-400 mt-4 leading-relaxed max-w-sm">
              Architect solutions to real-world problems under pressure. Judged blind, timed to the millisecond.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Form Area */}
        <div className="p-8 md:p-10 lg:p-12 flex flex-col justify-center h-full bg-[#0D1326]">
          <div className="w-full max-w-md mx-auto">
            {/* Headers */}
            <h2 className="text-3xl font-bold text-white mb-2">Welcome!</h2>
            <p className="text-gray-400 text-sm mb-8">
              {isSignUp ? 'Create an account to participate' : 'Sign in to your account'}
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 rounded-xl bg-red-900/30 border border-red-500/40 text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider ml-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-[#0A0F1E] border border-white/10 rounded-[12px] px-4 py-3.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Password</label>
                  {!isSignUp && (
                    <a href="#" className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">
                      Forgot Password?
                    </a>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-[#0A0F1E] border border-white/10 rounded-[12px] px-4 py-3.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mt-2">
                <button
                  type="submit"
                  disabled={submitting || googleSubmitting}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 rounded-[12px] font-semibold text-sm disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                  }}
                  className="w-full py-3.5 rounded-[12px] font-semibold text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all border border-transparent"
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-8">
              <div className="absolute w-full border-t border-white/10"></div>
              <div className="relative bg-[#0D1326] px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                Or Login With
              </div>
            </div>

            {/* Social Logins */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting || googleSubmitting}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-[12px] font-semibold text-sm bg-white/5 hover:bg-white/10 border border-white/10 transition-all disabled:opacity-50 group"
            >
              {googleSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Google
            </button>
            
          </div>
        </div>
      </div>
      
      {/* Footer out of card bounds like SaaS apps */}
      <p className="text-center text-xs text-gray-600 mt-6 md:mt-8 tracking-wide">
        © 2025 IEEE SB MCET
      </p>
    </div>
  );
}
