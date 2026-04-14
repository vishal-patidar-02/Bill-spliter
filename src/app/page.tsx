'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Link, Globe, Laptop, Users, Zap, Wallet } from 'lucide-react';
import { useSessionStore } from '@/lib/store';
import { ToastProvider, useToast } from '@/components/Toast';
import { ThemeToggle } from '@/components/ThemeProvider';
import UserGuide from '@/components/UserGuide';
import { cn } from '@/lib/utils';

export default function HomePage() {
  return (
    <ToastProvider>
      <HomeContent />
    </ToastProvider>
  );
}



function HomeContent() {
  const router = useRouter();
  const { createSession, joinSession } = useSessionStore();
  const { showToast } = useToast();

  const [sessionName, setSessionName] = useState('');
  const [sessionId, setSessionId]     = useState('');
  const [loading, setLoading]         = useState(false);
  const [activeTab, setActiveTab]     = useState<'create' | 'join'>('create');



  const handleCreate = () => {
    if (!sessionName.trim()) { showToast('Please enter a trip name', 'warning'); return; }
    setLoading(true);
    const id = createSession(sessionName.trim());
    router.push(`/session/${id}`);
  };

  const handleJoin = async () => {
    if (!sessionId.trim()) { showToast('Please enter a session code', 'warning'); return; }
    setLoading(true);
    const success = await joinSession(sessionId.trim(), 'Guest');
    if (success) {
      router.push(`/session/${sessionId.trim()}`);
    } else {
      showToast('Session not found', 'error');
      setLoading(false);
    }
  };



  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* User guide — top left */}
      <div className="absolute top-5 left-5 z-20">
        <UserGuide />
      </div>

      {/* Theme toggle — top right */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      {/* Scrollable content */}
      <div className="relative z-10 app-container min-h-screen p-6 pb-20 flex flex-col items-center justify-center animate-[fade-in_0.3s_ease-out]">

        {/* ── Hero ── */}
        <div className="text-center mb-10 w-full">
          <div className="inline-flex items-center justify-center p-4
                          bg-gradient-to-br from-sky-400 to-blue-600
                          rounded-3xl shadow-2xl shadow-blue-400/50 mb-6
                          rotate-3 transform transition-transform hover:rotate-6 hover:scale-105">
            <Wallet size={36} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-5xl font-heading font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-2
                         [text-shadow:0_2px_20px_rgba(14,165,233,0.15)]">
            SplitEase.
          </h1>
          <p className="text-slate-600 dark:text-slate-300 font-medium text-lg max-w-[280px] mx-auto leading-relaxed">
            Smart Group Expenses,{' '}
            <span className="text-blue-600 dark:text-sky-400 font-bold">Zero Friction.</span>
          </p>
        </div>

        {/* ── Main Card ── */}
        <div className="card-glass w-full p-2 mb-8 shadow-2xl shadow-blue-500/10">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-2xl mb-4">
            {(['create', 'join'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 h-11 flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === tab
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-sm"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                {tab === 'create' ? <Plus size={14} strokeWidth={3} /> : <Link size={14} strokeWidth={3} />}
                {tab === 'create' ? 'Create' : 'Join'}
              </button>
            ))}
          </div>

          <div className="p-4 pt-2">
            {activeTab === 'create' ? (
              <div className="animate-[scale-in_0.2s_cubic-bezier(0.16,1,0.3,1)]">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1">
                  Give your session a name
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={e => setSessionName(e.target.value)}
                  placeholder="e.g., Goa Trip 2026 🏖️"
                  className="input h-14 text-base font-bold mb-4"
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  id="create-session-name"
                />
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="btn-primary w-full h-14 rounded-2xl text-base font-black gap-3 active:scale-[0.98]"
                  id="create-session-btn"
                >
                  {loading ? "Starting…" : "Create New Session"}
                  <Zap size={18} fill="currentColor" strokeWidth={0} />
                </button>
              </div>
            ) : (
              <div className="animate-[scale-in_0.2s_cubic-bezier(0.16,1,0.3,1)]">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1">
                  Paste session code
                </label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={e => setSessionId(e.target.value)}
                  placeholder="Paste code here…"
                  className="input h-14 text-base font-bold mb-4"
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  id="join-session-id"
                />
                <button
                  onClick={handleJoin}
                  disabled={loading}
                  className="btn-secondary w-full h-14 rounded-2xl text-base font-black gap-3
                             text-blue-600 dark:text-sky-400
                             hover:border-blue-300 dark:hover:border-sky-600
                             active:scale-[0.98]"
                  id="join-session-btn"
                >
                  {loading ? "Joining…" : "Join Existing Session"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Feature pills ── */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10 opacity-75">
          {[
            { icon: Laptop, label: 'Web-Based' },
            { icon: Users,  label: 'No Login'  },
            { icon: Zap,    label: 'Instant'   },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="badge badge-neutral py-1.5 px-3 font-bold gap-1.5
                         bg-white/70 dark:bg-slate-800/70
                         border border-white/50 dark:border-slate-700/50
                         backdrop-blur-sm"
            >
              <Icon size={12} className="text-slate-400 dark:text-slate-500" />
              <span className="text-slate-600 dark:text-slate-400">{label}</span>
            </div>
          ))}
        </div>

        {/* ── Promo cards ── */}
        <div className="w-full flex flex-col gap-3">
          <a
            href="https://github.com/vishal-patidar-02/SplitEase.git"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 p-4 rounded-2xl
                       bg-white/60 dark:bg-slate-800/60
                       border border-white/50 dark:border-slate-700/50
                       hover:border-blue-300 dark:hover:border-sky-700
                       backdrop-blur-sm
                       group transition-all text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-slate-700
                            flex items-center justify-center shadow-lg
                            group-hover:scale-110 group-hover:bg-blue-600 transition-all">
              <Globe size={24} className="text-white" />
            </div>
            <div>
              <div className="font-extrabold text-slate-900 dark:text-white leading-tight">Open Source</div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                Built by Vishal Patidar.
              </p>
            </div>
          </a>
        </div>

        {/* ── Footer ── */}
        <div className="mt-auto pt-8 text-center text-[10px] font-black tracking-widest text-slate-400 dark:text-slate-600 uppercase">
          <div className="flex items-center justify-center gap-2">
            <span>Designed for Speed</span>
            <span className="w-1 h-1 rounded-full bg-current" />
            <span>V1.0.0</span>
          </div>
        </div>
      </div>
    </main>
  );
}