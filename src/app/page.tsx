'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Link, Settings, Star, Globe, Laptop, Users, Zap, Wallet } from 'lucide-react';
import { useSessionStore } from '@/lib/store';
import { ToastProvider, useToast } from '@/components/Toast';
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
  const { createSession, joinSession, loadDemoData } = useSessionStore();
  const { showToast } = useToast();
  
  const [sessionName, setSessionName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  const handleCreate = () => {
    if (!sessionName.trim()) {
      showToast('Please enter a trip name', 'warning');
      return;
    }
    setLoading(true);
    const id = createSession(sessionName.trim());
    router.push(`/session/${id}`);
  };

  const handleJoin = async () => {
    if (!sessionId.trim()) {
      showToast('Please enter a session code', 'warning');
      return;
    }
    setLoading(true);
    const success = await joinSession(sessionId.trim(), 'Guest');
    if (success) {
      router.push(`/session/${sessionId.trim()}`);
    } else {
      showToast('Session not found', 'error');
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    showToast('Joining Global Demo: Goa Trip 🏖️', 'info');
    setLoading(true);
    const demoId = 'demo-goa-2026';
    const success = await joinSession(demoId, 'Guest');
    if (success) {
      router.push(`/session/${demoId}`);
    } else {
      // Fallback if session wasn't seeded in DB yet
      const id = loadDemoData();
      router.push(`/session/${id}`);
    }
  };

  return (
    <main className="min-h-screen app-container p-6 pb-20 flex flex-col items-center justify-center animate-fade-in">
      {/* Hero Section */}
      <div className="text-center mb-10 w-full">
        <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-sky-400 to-blue-600 rounded-3xl shadow-2xl shadow-blue-400/50 mb-6 rotate-3 transform transition-transform hover:rotate-6 hover:scale-105">
          <Wallet size={36} className="text-white" strokeWidth={2.5} />
        </div>
        <h1 className="text-5xl font-heading font-black text-slate-900 tracking-tight leading-tight mb-2">
          SplitEase.
        </h1>
        <p className="text-slate-500 font-medium text-lg max-w-[280px] mx-auto leading-relaxed">
          Smart Group Expenses, <span className="text-blue-600 font-bold">Zero Friction.</span>
        </p>
      </div>

      {/* Main Action Card */}
      <div className="card-glass w-full p-2 mb-8 shadow-2xl shadow-blue-500/10">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl mb-4">
          <button
            onClick={() => setActiveTab('create')}
            className={cn(
              "flex-1 h-11 flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'create' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Plus size={14} strokeWidth={3} /> Create
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={cn(
              "flex-1 h-11 flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'join' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Link size={14} strokeWidth={3} /> Join
          </button>
        </div>

        <div className="p-4 pt-2">
          {activeTab === 'create' ? (
            <div className="animate-scale-in">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">
                GIVE YOUR SESSION A NAME
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g., Goa Trip 2026 🏖️"
                className="input h-14 bg-gray-50/50 border-gray-100 focus:bg-white text-base font-bold mb-4"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                id="create-session-name"
              />
              <button
                onClick={handleCreate}
                disabled={loading}
                className="btn-primary w-full h-14 rounded-2xl text-base font-black gap-3 active:scale-[0.98] transition-all"
                id="create-session-btn"
              >
                {loading ? "Starting..." : "Create New Session"}
                <Zap size={18} fill="currentColor" strokeWidth={0} />
              </button>
            </div>
          ) : (
            <div className="animate-scale-in">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">
                PASTE SESSION CODE
              </label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Paste code here..."
                className="input h-14 bg-gray-50/50 border-gray-100 focus:bg-white text-base font-bold mb-4"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                id="join-session-id"
              />
              <button
                onClick={handleJoin}
                disabled={loading}
                className="btn-secondary w-full h-14 rounded-2xl text-base font-black gap-3 border-slate-200 hover:border-blue-300 text-blue-600 active:scale-[0.98] transition-all"
                id="join-session-btn"
              >
                {loading ? "Joining..." : "Join Existing Session"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feature Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-10 opacity-70">
        <div className="badge badge-neutral bg-white border border-gray-100 py-1.5 px-3 font-bold gap-1.5">
          <Laptop size={12} className="text-gray-400" /> Web-Based
        </div>
        <div className="badge badge-neutral bg-white border border-gray-100 py-1.5 px-3 font-bold gap-1.5">
          <Users size={12} className="text-gray-400" /> No Login
        </div>
        <div className="badge badge-neutral bg-white border border-gray-100 py-1.5 px-3 font-bold gap-1.5">
          <Zap size={12} className="text-gray-400" /> Instant
        </div>
      </div>

      {/* Hackathon Demo / Promo */}
      <div className="w-full flex flex-col gap-3">
        <button
          onClick={handleDemo}
          className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 group hover:border-amber-400 transition-all text-left shadow-sm shadow-amber-500/5"
          id="demo-button"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-110 group-hover:rotate-3 transition-all">
            <Star size={24} className="text-white" fill="currentColor" />
          </div>
          <div>
            <div className="font-extrabold text-amber-900 leading-tight">Fast-forward?</div>
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mt-0.5 group-hover:text-amber-700 transition-colors">
              Try the HACKATHON DEMO
            </p>
          </div>
        </button>

        <a
          href="https://github.com/SplitEase"
          target="_blank"
          className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 border border-slate-200/50 group hover:border-blue-300 transition-all text-left opacity-90 backdrop-blur-sm"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-blue-600 transition-all">
            <Globe size={24} className="text-white" />
          </div>
          <div>
            <div className="font-extrabold text-gray-900 leading-tight">Open Source</div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
              Built by SplitEase Team
            </p>
          </div>
        </a>
      </div>

      {/* Footer Branding */}
      <div className="mt-auto pt-8 text-center text-[10px] font-black tracking-widest text-gray-400 uppercase">
        <div className="flex items-center justify-center gap-2">
          <span>DESIGNED FOR SPEED</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span>V1.0.0</span>
        </div>
      </div>
    </main>
  );
}
