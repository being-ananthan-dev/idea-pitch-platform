import { useState, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFlowGuard } from '@/hooks/useFlowGuard';
import { Loader2 } from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { motion, AnimatePresence } from 'framer-motion';

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
      <div className="min-h-[100dvh] bg-[#030712] grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="auth-container relative overflow-hidden"
    >
      <motion.div 
        initial={{ y: 40, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="w-full max-w-[1000px] min-h-[600px] h-auto bg-[#0B1121]/90 backdrop-blur-2xl border border-white/5 rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] relative z-10"
      >
        
        {/* LEFT COLUMN: Branding */}
        <div className="hidden md:flex flex-col items-center justify-center p-12 text-center bg-[#070b14] relative overflow-hidden">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1] as any,
              opacity: [0.3, 0.5, 0.3] as any
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px]"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1] as any,
              opacity: [0.2, 0.4, 0.2] as any
            }}
            transition={{ duration: 10, delay: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-[100px]"
          />
          
          <div className="z-10 flex flex-col items-center gap-6">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-gradient-to-br from-blue-500 to-cyan-500 shadow-[0_0_40px_rgba(59,130,246,0.3)]"
            >
              <span className="text-4xl text-white">💡</span>
            </motion.div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">IntelliPitch</h1>
              <p className="text-blue-400 font-medium tracking-widest text-sm uppercase">IEEE SB MCET</p>
            </div>
            <p className="text-gray-400 mt-4 leading-relaxed max-w-sm">
              Architect solutions to real-world problems under pressure. Judged blind, timed to the millisecond.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Form */}
        <div className="p-8 md:p-10 lg:p-12 flex flex-col justify-center h-full bg-[#0B1121]">
          <motion.div layout className="w-full max-w-md mx-auto">
            <motion.h2 layout="position" className="text-3xl font-bold text-white mb-2">Welcome!</motion.h2>
            <motion.p layout="position" className="text-gray-400 text-sm mb-8">
              <AnimatePresence mode="wait">
                <motion.span
                  key={isSignUp ? 'signup' : 'signin'}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  {isSignUp ? 'Create a new account to participate' : 'Sign in to access your dashboard'}
                </motion.span>
              </AnimatePresence>
            </motion.p>

            <AnimatePresence mode="popLayout">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/20 text-red-400 text-sm text-center font-medium backdrop-blur-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.form layout onSubmit={handleEmailSubmit} className="flex flex-col gap-5">
              <motion.div layout className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="input-field"
                />
              </motion.div>

              <motion.div layout className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between pl-1 pr-1">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                  {!isSignUp && (
                    <a href="#" className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">
                      Forgot?
                    </a>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                />
              </motion.div>

              <motion.div layout className="flex flex-col gap-3 mt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={submitting || googleSubmitting}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-4 rounded-[12px] font-semibold text-sm disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin text-[#030712]" />}
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </motion.button>
                
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                  className="w-full py-4 rounded-[12px] font-semibold text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all border border-transparent"
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </motion.div>
            </motion.form>

            <motion.div layout className="relative flex items-center justify-center my-8">
              <div className="absolute w-full border-t border-white/5"></div>
              <div className="relative bg-[#0B1121] px-4 text-xs font-bold text-gray-600 uppercase tracking-widest">
                Or Continue With
              </div>
            </motion.div>

            <motion.button
              layout
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting || googleSubmitting}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-[12px] font-semibold text-sm bg-white/[0.03] border border-white/5 disabled:opacity-50 group"
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
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
      
      <p className="text-center text-xs text-gray-600 mt-8 tracking-wider absolute bottom-6 w-full pointer-events-none">
        © 2026 IEEE SB MCET
      </p>
    </motion.div>
  );
}
