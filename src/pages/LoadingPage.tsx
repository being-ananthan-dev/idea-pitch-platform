import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getSubmission, getParticipant } from '@/lib/firestore';

export default function LoadingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    const redirect = async () => {
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      const [participant, submission] = await Promise.all([
        getParticipant(user.uid),
        getSubmission(user.uid),
      ]);

      if (!participant?.phone) {
        navigate('/home', { replace: true });
        return;
      }

      if (submission?.status === 'submitted' || submission?.status === 'locked') {
        navigate('/thankyou', { replace: true });
      } else if (submission?.status === 'in_progress') {
        navigate('/competition', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    };

    redirect();
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col items-center justify-center gap-6">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
        style={{
          background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
          boxShadow: '0 0 30px rgba(59,130,246,0.4)',
        }}
      >
        💡
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-extrabold gradient-text mb-1">IntelliPitch</h1>
        <p className="text-gray-500 text-xs tracking-widest uppercase">IEEE SB MCET</p>
      </div>
      <div className="flex gap-2 mt-2">
        <span className="loading-dot w-2.5 h-2.5 rounded-full bg-blue-500" />
        <span className="loading-dot w-2.5 h-2.5 rounded-full bg-blue-500" />
        <span className="loading-dot w-2.5 h-2.5 rounded-full bg-blue-500" />
      </div>
    </div>
  );
}
