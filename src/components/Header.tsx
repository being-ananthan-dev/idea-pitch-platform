import { useAuth } from '@/context/AuthContext';
import { LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Header() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl h-16 glass-card rounded-full border border-white/10 px-6 flex items-center justify-between pointer-events-auto">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-base shadow-lg shadow-blue-500/20">
          💡
        </div>
        <span className="font-black text-sm tracking-tighter text-white uppercase italic hidden sm:block">IntelliPitch</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 pr-2 border-r border-white/10">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:block opacity-60">
            {user.displayName}
          </span>
          <button 
            onClick={signOut} 
            className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all shadow-lg"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
