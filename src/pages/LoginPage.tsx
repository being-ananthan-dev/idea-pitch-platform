import { useAuth } from '@/context/AuthContext';
import { useFlowGuard } from '@/hooks/useFlowGuard';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const { loading } = useFlowGuard({ requiredStep: 'login' });
  
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      console.error('Sign-in failed', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#010309] grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="auth-container font-inter relative overflow-hidden"
    >
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-0 overflow-hidden glass-card shadow-2xl shadow-blue-500/10">
        {/* Left Side: Branding */}
        <div className="relative p-6 md:p-8 flex flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-500 to-violet-600 overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-20" />
          
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-base shadow-lg">💡</div>
            <span className="font-extrabold text-sm tracking-tighter text-white uppercase italic">AdaptiveEd Pitch</span>
          </motion.div>

          <div className="relative z-10 mt-12 md:mt-0">
            <motion.h1 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-5xl font-black text-white leading-[0.9] tracking-tighter mb-6"
            >
              The Arena of <br /><span className="text-white/70 italic">Pure Ideas.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-blue-100/80 text-sm max-w-xs font-medium leading-relaxed"
            >
              Reengineering education for an uncertain future. Join the elite sprint to architect the next-gen learning paradigm.
            </motion.p>
          </div>

          <div className="relative z-10 hidden md:block">
            <div className="flex -space-x-2 mb-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-400 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-[#070B14] flex items-center justify-center text-[10px] font-bold text-blue-300">
                +99
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-100/60">Live Competition Session Running</p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="bg-[#030712] p-8 md:p-10 flex flex-col justify-center items-center">
          <div className="max-w-xs w-full text-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-black text-white tracking-tight mb-2 uppercase">Initialise Protocol</h2>
              <p className="text-gray-500 text-sm font-medium">Synchronise your identity to proceed</p>
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleSignIn}
              className="w-full group relative flex items-center justify-center gap-3 py-3 px-6 text-sm font-black uppercase tracking-[0.1em] text-white rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-300"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Sign in with Google
            </motion.button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-bold text-gray-700 bg-[#030712] px-2">Secure Link</div>
            </div>

            <p className="text-[10px] text-gray-600 leading-relaxed max-w-[200px] mx-auto uppercase tracking-tighter opacity-50">
              By proceeding, you agree to the Automated Competition Protocol and Data Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
