import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFlowGuard } from '@/hooks/useFlowGuard';
import { getParticipant, createOrUpdateParticipant } from '@/lib/firestore';
import { Loader2, User, Mail, Phone, ArrowRight, CheckCircle } from 'lucide-react';

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
      <div className="min-h-[100dvh] bg-bg grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="w-full max-w-lg animate-fade-in-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Step 1 of 3
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Your Details</h1>
          <p className="text-gray-400 text-sm">Confirm your info before entering the competition</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</span>
              </label>
              <input
                id="name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Your full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Address</span>
              </label>
              <input
                id="email-input"
                type="email"
                value={email}
                readOnly
                className="input-field"
                placeholder="your@email.com"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-filled from Google. Cannot be changed.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone Number <span className="text-red-400">*</span></span>
              </label>
              <div className="flex gap-2">
                <div className="input-field w-16 flex items-center justify-center text-gray-400 text-sm shrink-0 px-3">+91</div>
                <input
                  id="phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="input-field flex-1"
                  placeholder="98765 43210"
                  maxLength={10}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">10-digit Indian mobile number required.</p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-900/30 border border-red-500/40 text-red-300 text-sm flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs text-gray-400 leading-relaxed">
              <CheckCircle className="w-4 h-4 text-blue-400 inline mr-1.5 -mt-0.5" />
              Your details are stored securely and used only for competition purposes. You can edit them before starting.
            </div>

            <button
              id="details-next-btn"
              type="submit"
              disabled={saving}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm font-bold shadow-lg shadow-blue-500/20 group"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <>Proceed to Guidelines <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
