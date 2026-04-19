import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  getAllSubmissions,
  getAllParticipants,
  getAllLogs,
  getConfig,
  updateConfig,
  isAdmin,
  deleteSubmission,
  seedFreshUsers,
  deleteAllTestData,
} from '@/lib/firestore';
import { Submission, Participant, ViolationLog, Config } from '@/types';
import {
  Loader2, Users, FileText, Shield, AlertTriangle,
  Download, ToggleLeft, ToggleRight, RefreshCw,
  ChevronDown, LogOut, Activity, Clock, Trash2, Plus, Save, Trophy, Settings
} from 'lucide-react';

type Filter = 'all' | 'completed' | 'suspicious';

function suspicionLevel(sub: Submission): { label: string; color: string; score: number } {
  const score = sub.tabSwitchCount * 2 + sub.fullscreenExitCount * 3;
  if (score >= 8) return { label: 'High Risk', color: 'badge-red', score };
  if (score >= 4) return { label: 'Suspicious', color: 'badge-yellow', score };
  return { label: 'Normal', color: 'badge-green', score };
}

function exportCSV(submissions: Submission[], participants: Participant[]) {
  const participantMap = new Map(participants.map((p) => [p.uid, p]));
  const headers = ['UID', 'Name', 'Email', 'Phone', 'Status', 'Q1 Words', 'Q2 Words', 'Q3 Words', 'Integrity Score', 'Tab Switches', 'Fullscreen Exits', 'Suspicion Score', 'Submitted At'];
  const rows = submissions.map((sub) => {
    const p = participantMap.get(sub.uid);
    const q1 = sub.answers?.find((a) => a.questionIndex === 0)?.wordCount ?? 0;
    const q2 = sub.answers?.find((a) => a.questionIndex === 1)?.wordCount ?? 0;
    const q3 = sub.answers?.find((a) => a.questionIndex === 2)?.wordCount ?? 0;
    const suspScore = sub.tabSwitchCount * 2 + sub.fullscreenExitCount * 3;
    const submittedAt = sub.submittedAt ? new Date((sub.submittedAt as any).toMillis()).toISOString() : '';
    return [sub.uid, sub.name, sub.email, p?.phone ?? '', sub.status, q1, q2, q3, sub.integrityScore, sub.tabSwitchCount, sub.fullscreenExitCount, suspScore, submittedAt].join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `intellipitch_submissions_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [logs, setLogs] = useState<ViolationLog[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'submissions' | 'logs' | 'competition'>('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const preventBack = () => window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', preventBack);
    return () => window.removeEventListener('popstate', preventBack);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [subs, parts, lgList, cfg] = await Promise.all([getAllSubmissions(), getAllParticipants(), getAllLogs(), getConfig()]);
      setSubmissions(subs);
      setParticipants(parts);
      setLogs(lgList);
      setConfig(cfg);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const ok = await isAdmin(user.email || '');
      setAuthorized(ok);
      if (ok) await loadData();
      setLoading(false);
    };
    check();
  }, [user, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleConfig = async (key: keyof Config) => {
    if (!config) return;
    setConfigSaving(true);
    const updated = { ...config, [key]: !config[key as keyof Config] };
    await updateConfig({ [key]: updated[key as keyof Config] });
    setConfig(updated);
    setConfigSaving(false);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    if (!config) return;
    const newQuestions = [...config.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setConfig({ ...config, questions: newQuestions });
  };

  const addQuestion = () => {
    if (!config) return;
    setConfig({ ...config, questions: [...config.questions, { title: 'New Question', prompt: 'Enter question instructions here...', emoji: '📝', timer: 120 }] });
  };

  const deleteQuestion = (index: number) => {
    if (!config || config.questions.length <= 1) return;
    setConfig({ ...config, questions: config.questions.filter((_, i) => i !== index) });
  };

  const saveFullConfig = async () => {
    if (!config) return;
    setConfigSaving(true);
    await updateConfig(config);
    setConfigSaving(false);
    alert('Configuration saved successfully!');
  };

  const handleResetMyProgress = async () => {
    if (!user || !confirm('DANGEROUS: This will wipe your competition progress so you can test as a "fresh" user. Proceed?')) return;
    setRefreshing(true);
    await deleteSubmission(user.uid);
    alert('Progress reset! Redirecting to start...');
    navigate('/', { replace: true });
  };

  const handleSeedFreshUsers = async () => {
    setRefreshing(true);
    await seedFreshUsers();
    await loadData();
    setRefreshing(false);
    alert('3 Fresh test users added!');
  };

  const handleCleanTestData = async () => {
    if (!confirm('Delete all "fresh-" test data?')) return;
    setRefreshing(true);
    await deleteAllTestData();
    await loadData();
    setRefreshing(false);
  };

  const formatTs = (ts: any) => {
    if (!ts) return 'N/A';
    try { return new Date(ts.toMillis()).toLocaleString('en-IN'); } catch { return 'N/A'; }
  };

  if (!user || loading) {
    return (
      <div className="min-h-[100dvh] bg-bg grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-[100dvh] bg-bg grid place-items-center p-4">
        <div className="glass-card p-10 text-center max-w-sm">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 text-sm mb-6">You do not have admin privileges. Contact the organizer.</p>
          <button onClick={() => navigate('/', { replace: true })} className="btn-secondary w-full">Go Home</button>
        </div>
      </div>
    );
  }

  const totalParticipants = participants.length;
  const totalSubmissions = submissions.filter((s) => s.status === 'submitted').length;
  const activeUsers = submissions.filter((s) => s.status === 'in_progress').length;
  const totalViolations = logs.length;

  const filteredSubmissions = submissions.filter((sub) => {
    if (filter === 'completed') return sub.status === 'submitted';
    if (filter === 'suspicious') return suspicionLevel(sub).score >= 4;
    return true;
  });

  return (
    <div className="min-h-[100dvh] bg-bg">
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm shadow-[0_0_12px_rgba(59,130,246,0.4)]">💡</div>
            <span className="font-bold gradient-text">IntelliPitch</span>
            <span className="badge badge-red text-[10px] tracking-widest uppercase">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <button id="admin-refresh-btn" onClick={handleRefresh} disabled={refreshing} className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-sm">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={signOut} className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-500/10" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 md:py-12 w-full overflow-hidden">
        <div className="flex gap-1 mb-8 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
          {([
            { key: 'dashboard', label: 'Dashboard', icon: <Activity className="w-3.5 h-3.5" /> },
            { key: 'submissions', label: 'Submissions', icon: <FileText className="w-3.5 h-3.5" /> },
            { key: 'logs', label: 'Logs', icon: <Shield className="w-3.5 h-3.5" /> },
            { key: 'competition', label: 'Competition', icon: <Trophy className="w-3.5 h-3.5" /> },
          ] as const).map(({ key: tab, label, icon }) => (
            <button
              key={tab}
              id={`admin-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: <Users className="w-5 h-5 text-blue-400" />, label: 'Total Participants', value: totalParticipants },
                { icon: <FileText className="w-5 h-5 text-green-400" />, label: 'Total Submissions', value: totalSubmissions },
                { icon: <Activity className="w-5 h-5 text-cyan-400" />, label: 'Active Now', value: activeUsers },
                { icon: <AlertTriangle className="w-5 h-5 text-amber-400" />, label: 'Violations', value: totalViolations },
              ].map((stat) => (
                <div key={stat.label} className="glass-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">{stat.icon}</div>
                  </div>
                  <p className="text-3xl font-extrabold text-white">{stat.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="glass-card p-6 border-blue-500/20 bg-blue-500/5">
              <h2 className="font-bold text-white mb-5 flex items-center gap-2"><Settings className="w-4 h-4 text-blue-400" /> Developer Toolbox</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <button 
                  onClick={handleResetMyProgress} 
                  disabled={refreshing}
                  className="btn-secondary py-3 px-4 text-xs font-black uppercase tracking-widest border-red-500/20 hover:bg-red-500/10 hover:text-red-400"
                >
                  Reset My Progress
                </button>
                <button 
                  onClick={handleSeedFreshUsers} 
                  disabled={refreshing}
                  className="btn-secondary py-3 px-4 text-xs font-black uppercase tracking-widest border-blue-500/20"
                >
                  Seed 3 Fresh Users
                </button>
                <button 
                  onClick={handleCleanTestData} 
                  disabled={refreshing}
                  className="btn-secondary py-3 px-4 text-xs font-black uppercase tracking-widest border-gray-500/20"
                >
                  Clean Test Data
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-4 uppercase tracking-tighter">
                Note: "Reset My Progress" allows you to re-test the onboarding flow with your current admin account.
              </p>
            </div>

            {config && (
              <div className="glass-card p-6">
                <h2 className="font-bold text-white mb-5 flex items-center gap-2"><Shield className="w-4 h-4 text-blue-400" /> Event Controls</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { key: 'eventLive' as const, label: 'Event Live', desc: 'Allow participants to start the competition' },
                    { key: 'allowSubmission' as const, label: 'Allow Submissions', desc: 'Enable or disable new submissions' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                      <div>
                        <p className="font-semibold text-white text-sm">{label}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                      </div>
                      <button id={`toggle-${key}`} onClick={() => toggleConfig(key)} disabled={configSaving} className="ml-4 transition-opacity disabled:opacity-50">
                        {config[key] ? <ToggleRight className="w-8 h-8 text-green-400" /> : <ToggleLeft className="w-8 h-8 text-gray-600" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-card p-6">
              <h2 className="font-bold text-white mb-5 flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-400" /> Live User Progress</h2>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Participant</th><th>Status</th><th>Question</th><th>Integrity</th><th>Suspicion</th></tr></thead>
                  <tbody>
                    {submissions.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-gray-600 py-8">No submissions yet</td></tr>
                    ) : submissions.map((sub) => {
                      const susp = suspicionLevel(sub);
                      return (
                        <tr key={sub.uid}>
                          <td><p className="font-medium text-white text-sm">{sub.name}</p><p className="text-gray-500 text-xs">{sub.email}</p></td>
                          <td><span className={`badge ${sub.status === 'submitted' ? 'badge-green' : sub.status === 'in_progress' ? 'badge-blue' : 'badge-red'}`}>{sub.status.replace('_', ' ')}</span></td>
                          <td className="text-gray-300 text-sm">{sub.status === 'in_progress' ? `Q${sub.questionIndex + 1} / 3` : sub.status === 'submitted' ? '✓ Done' : '-'}</td>
                          <td><span className={`font-bold text-sm ${sub.integrityScore >= 70 ? 'text-green-400' : sub.integrityScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{sub.integrityScore}</span></td>
                          <td><span className={`badge ${susp.color}`}>{susp.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {(['all', 'completed', 'suspicious'] as Filter[]).map((f) => (
                  <button key={f} id={`filter-${f}`} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${filter === f ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>{f}</button>
                ))}
              </div>
              <button id="export-csv-btn" onClick={() => exportCSV(filteredSubmissions, participants)} className="btn-secondary flex items-center gap-2 py-1.5 px-4 text-sm">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Participant</th><th>Status</th><th>Answers</th><th>Integrity</th><th>Violations</th><th>Suspicion</th><th>Submitted</th><th></th></tr></thead>
                  <tbody>
                    {filteredSubmissions.length === 0 ? (
                      <tr><td colSpan={8} className="text-center text-gray-600 py-10">No submissions match this filter.</td></tr>
                    ) : filteredSubmissions.map((sub) => {
                      const susp = suspicionLevel(sub);
                      const isExpanded = expandedRow === sub.uid;
                      return (
                        <>
                          <tr key={sub.uid} className="cursor-pointer" onClick={() => setExpandedRow(isExpanded ? null : sub.uid)}>
                            <td><p className="font-medium text-white text-sm">{sub.name}</p><p className="text-gray-500 text-xs">{sub.email}</p></td>
                            <td><span className={`badge ${sub.status === 'submitted' ? 'badge-green' : sub.status === 'in_progress' ? 'badge-blue' : 'badge-red'}`}>{sub.status.replace('_', ' ')}</span></td>
                            <td className="text-gray-300 text-sm">{sub.answers?.length ?? 0} / 3</td>
                            <td><span className={`font-bold text-sm ${sub.integrityScore >= 70 ? 'text-green-400' : sub.integrityScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{sub.integrityScore}</span></td>
                            <td className="text-gray-400 text-sm">{sub.tabSwitchCount}T / {sub.fullscreenExitCount}F</td>
                            <td><span className={`badge ${susp.color}`}>{susp.label}</span></td>
                            <td className="text-gray-500 text-xs">{formatTs(sub.submittedAt)}</td>
                            <td><ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${sub.uid}-expanded`}>
                              <td colSpan={8} className="bg-[#0d1628] p-5 border-t border-white/5">
                                <div className="space-y-4">
                                  {['Problem Statement', 'Proposed Solution', 'Impact & Innovation'].map((title, idx) => {
                                    const ans = sub.answers?.find((a) => a.questionIndex === idx);
                                    return (
                                      <div key={idx}>
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xs font-semibold text-blue-400">Q{idx + 1}: {title}</span>
                                          {ans && <span className="badge badge-blue">{ans.wordCount} words</span>}
                                        </div>
                                        <p className="text-gray-300 text-sm leading-relaxed bg-white/5 rounded-lg p-3">{ans?.text || <span className="text-gray-600 italic">No answer recorded</span>}</p>
                                      </div>
                                    );
                                  })}
                                  {sub.autoSubmitReason && <p className="text-amber-400 text-xs">⚠️ Auto-submit Reason: {sub.autoSubmitReason}</p>}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="animate-fade-in">
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Participant</th><th>Violation Type</th><th>Timestamp</th><th>Details</th></tr></thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-gray-600 py-10">No violations logged.</td></tr>
                    ) : logs.map((log, idx) => (
                      <tr key={idx}>
                        <td><p className="font-medium text-white text-sm">{log.name || log.uid.slice(0, 8)}</p><p className="text-gray-500 text-xs">{log.uid.slice(0, 12)}...</p></td>
                        <td><span className={`badge ${log.type === 'auto_submit' ? 'badge-red' : 'badge-yellow'}`}>{log.type.replace('_', ' ')}</span></td>
                        <td className="text-gray-400 text-xs">{formatTs(log.timestamp)}</td>
                        <td className="text-gray-500 text-xs">{log.metadata || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'competition' && config && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Competition Structure</h2>
                <p className="text-gray-500 text-sm">Manage questions, instructions, and time limits.</p>
              </div>
              <button onClick={saveFullConfig} disabled={configSaving} className="btn-primary flex items-center gap-2 py-2 px-6">
                {configSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
            <div className="grid gap-6">
              {config.questions.map((q, idx) => (
                <div key={idx} className="glass-card p-6 relative group">
                  <div className="absolute top-6 right-6 flex items-center gap-2">
                    <span className="badge badge-blue text-xs uppercase tracking-widest">Question {idx + 1}</span>
                    <button onClick={() => deleteQuestion(idx)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Delete Question">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid md:grid-cols-4 gap-6">
                    <div className="md:col-span-1 space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Emoji</label>
                        <input type="text" value={q.emoji} onChange={(e) => updateQuestion(idx, 'emoji', e.target.value)} className="input-field text-center text-xl w-16" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Timer (Sec)</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="number" value={q.timer} onChange={(e) => updateQuestion(idx, 'timer', parseInt(e.target.value))} className="input-field pl-10" />
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-3 space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Question Title</label>
                        <input type="text" value={q.title} onChange={(e) => updateQuestion(idx, 'title', e.target.value)} className="input-field font-bold" placeholder="e.g., Problem Statement" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Instructional Prompt</label>
                        <textarea value={q.prompt} onChange={(e) => updateQuestion(idx, 'prompt', e.target.value)} rows={3} className="input-field resize-none text-sm leading-relaxed" placeholder="What should the participant write about?" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addQuestion} className="w-full py-6 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center gap-2 text-gray-500 hover:text-blue-400 hover:border-blue-400/20 hover:bg-blue-400/5 transition-all group">
                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-semibold">Add New Question</span>
              </button>
            </div>
            <div className="glass-card p-6 mt-8">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Settings className="w-4 h-4 text-gray-400" /> Submission Rules
              </h3>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Minimum Words</label>
                  <input type="number" value={config.minWords} onChange={(e) => setConfig({ ...config, minWords: parseInt(e.target.value) })} className="input-field" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Maximum Words</label>
                  <input type="number" value={config.maxWords} onChange={(e) => setConfig({ ...config, maxWords: parseInt(e.target.value) })} className="input-field" />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
