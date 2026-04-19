import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFlowGuard } from '@/hooks/useFlowGuard';
import { getParticipant, createOrUpdateParticipant } from '@/lib/firestore';
import { Loader2, User, Mail, Phone, ArrowRight, CheckCircle } from 'lucide-react';
import Header from '@/components/Header';

export default function DetailsPage() {
  const { user } = useAuth();
  const { loading } = useFlowGuard({ requiredStep: 'details' });
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!user || fetched) return;
    const load = async () => {
      const p = await getParticipant(user.uid);
      setName(p?.name || user.displayName || '');
      setEmail(p?.email || user.email || '');
      setPhone(p?.phone || '');
      setFetched(true);
    };
    load();
  }, [user, fetched]);

  const validatePhone = (ph: string) => /^[6-9]\d{9}$/.test(ph.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Name is required.'); return; }
    if (!validatePhone(phone)) { setError('Enter a valid 10-digit Indian mobile number.'); return; }

    setSaving(true);
    try {
      await createOrUpdateParticipant(user!.uid, {
        uid: user!.uid,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      navigate('/guidelines');
    } catch {
      setError('Failed to save details. Please try again.');
      setSaving(false);
    }
  };

  if (loading || !fetched) {
    return (
      <div className="min-h-[100dvh] bg-[#010309] grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="auth-container font-inter">
      <Header />
      <div className="w-full max-w-lg animate-fade-in-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4 shadow-xl shadow-blue-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Verification Phase 01
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">Identify Yourself</h1>
          <p className="text-gray-500 text-sm font-medium">Coordinate your terminal credentials</p>
        </div>

        <div className="glass-card p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest pl-1">
                <span className="flex items-center gap-2"><User className="w-3.5 h-3.5 opacity-50" /> Fully Qualified Name</span>
              </label>
              <input
                id="name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field bg-[#02040A] border-white/5 focus:border-blue-500/40 rounded-xl"
                placeholder="Ex: John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest pl-1">
                <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 opacity-50" /> Syncing Email</span>
              </label>
              <input
                id="email-input"
                type="email"
                value={email}
                readOnly
                className="input-field bg-white/5 border-transparent opacity-40 focus:ring-0 cursor-not-allowed rounded-xl"
              />
              <p className="text-[9px] font-bold text-gray-700 mt-2 uppercase tracking-tight">Read-only // Inherited from protocol login</p>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest pl-1">
                <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 opacity-50" /> Mobile Endpoint <span className="text-blue-500/70 font-black">(*)</span></span>
              </label>
              <div className="flex gap-2">
                <div className="input-field w-16 p-0 flex items-center justify-center text-gray-600 text-xs font-black bg-[#02040A] border-white/5 rounded-xl">+91</div>
                <input
                  id="phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="input-field bg-[#02040A] border-white/5 focus:border-blue-500/40 flex-1 rounded-xl"
                  placeholder="98765 43210"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <div className="p-5 rounded-2xl bg-blue-950/10 border border-blue-500/10 text-[11px] text-gray-500 leading-relaxed font-medium">
              <CheckCircle className="w-4 h-4 text-blue-500 inline mr-2 -mt-0.5" />
              Credentials will be cryptographically hashed and used strictly for identity verification within the arena.
            </div>

            <button
              id="details-next-btn"
              type="submit"
              disabled={saving}
              className="btn-primary w-full flex items-center justify-center gap-3 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-500/20 group"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
              ) : (
                <>Next Sequence: Guidelines <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
