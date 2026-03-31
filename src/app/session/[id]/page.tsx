'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Share2, ArrowLeft, Copy, Clock, Filter, SlidersHorizontal, Settings, Trash2 } from 'lucide-react';
import { useSessionStore } from '@/lib/store';
import { ToastProvider, useToast } from '@/components/Toast';
import { cn, getShareableLink, copyToClipboard } from '@/lib/utils';
import { Expense } from '@/lib/types';

// Components
import MembersCard from '@/components/MembersCard';
import ExpenseListCard from '@/components/ExpenseListCard';
import BalanceSummaryCard from '@/components/BalanceSummaryCard';
import SettlementCard from '@/components/SettlementCard';
import AddExpenseModal from '@/components/AddExpenseModal';

export default function SessionPage() {
  return (
    <ToastProvider>
      <SessionContent />
    </ToastProvider>
  );
}

function SessionContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { sessions, currentSessionId, setCurrentSession } = useSessionStore();
  const { showToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'settlement'>('expenses');

  const session = useMemo(() => sessions[sessionId], [sessions, sessionId]);

  // Handle session loading and subscription
  useEffect(() => {
    let isMounted = true;

    const verifyAndLoadSession = async () => {
      let storeSession = useSessionStore.getState().sessions[sessionId];
      
      // If not in local storage, fetch from Supabase
      if (!storeSession) {
        const exists = await useSessionStore.getState().fetchSessionFromDb(sessionId);
        if (!exists && isMounted) {
          router.replace('/');
          return;
        }
      }
      
      if (isMounted) {
        setCurrentSession(sessionId);
      }
    };

    verifyAndLoadSession();
    
    // Subscribe to real-time changes
    const unsubscribe = useSessionStore.getState().subscribeToSession(sessionId);
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [sessionId, setCurrentSession, router]); // Removed 'session' dependency so it doesn't constantly re-trigger

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
      <div className="w-12 h-12 border-4 border-sky-100 border-t-sky-600 rounded-full animate-spin" />
    </div>
  );

  const handleShare = async () => {
    const link = getShareableLink(sessionId);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${session.name} Session`,
          text: `Split expenses with me for ${session.name}!`,
          url: link,
        });
      } catch {
        const success = await copyToClipboard(link);
        if (success) showToast('Link copied! 📋');
      }
    } else {
      const success = await copyToClipboard(link);
      if (success) showToast('Link copied! 📋');
    }
  };

  const openAddModal = () => {
    if (session.members.length === 0) {
      showToast('Add at least one member first', 'warning');
      return;
    }
    setEditingExpense(undefined);
    setIsAddModalOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsAddModalOpen(true);
  };

  return (
    <main className="min-h-screen app-container p-4 pb-28 animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between py-4 mb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="btn-ghost p-2 rounded-2xl bg-white/50 border border-white hover:bg-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-heading font-black text-slate-900 leading-tight truncate max-w-[170px]">
              {session.name}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <button 
                onClick={async () => {
                  const success = await copyToClipboard(sessionId);
                  if (success) showToast('Copied! 📋', 'success');
                }}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-full transition-colors cursor-pointer group"
                title="Copy Session Code"
              >
                CODE: <span className="text-slate-700">{sessionId}</span>
                <Copy size={10} className="text-slate-400 group-hover:text-slate-600 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={handleShare}
          className="btn-secondary px-3 py-2 text-sky-600 bg-white/70 border-white hover:bg-white rounded-2xl shadow-sm text-sm font-bold gap-2"
        >
          <Share2 size={16} /> Share
        </button>
      </header>

      {/* Tabs */}
      <nav className="sticky top-2 z-30 mb-6 bg-white/40 backdrop-blur-xl p-1.5 rounded-2xl border border-white/50 shadow-lg shadow-sky-500/5 flex">
        {[
          { id: 'expenses', label: 'Expenses', icon: Clock },
          { id: 'balances', label: 'Balances', icon: SlidersHorizontal },
          { id: 'settlement', label: 'Settle', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 h-10 flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === tab.id 
                ? "bg-sky-600 text-white shadow-md shadow-sky-200" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <tab.icon size={14} strokeWidth={3} />
            <span className={cn(activeTab === tab.id ? "block" : "hidden sm:block")}>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Content Area */}
      <div className="space-y-6">
        {activeTab === 'expenses' && (
          <>
            <MembersCard sessionId={sessionId} members={session.members} />
            <ExpenseListCard 
              sessionId={sessionId} 
              expenses={session.expenses} 
              members={session.members} 
              onEdit={handleEditExpense}
              onAdd={openAddModal}
            />
          </>
        )}

        {activeTab === 'balances' && (
          <BalanceSummaryCard 
            members={session.members} 
            expenses={session.expenses} 
          />
        )}

        {activeTab === 'settlement' && (
          <SettlementCard 
            session={session}
            members={session.members} 
            expenses={session.expenses} 
          />
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={openAddModal}
        className="fab w-16 h-16 rounded-2xl shadow-xl shadow-sky-500/40 bottom-6 right-6"
        title="Add Expense"
        id="add-expense-fab"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {/* Modals */}
      {isAddModalOpen && (
        <AddExpenseModal
          sessionId={sessionId}
          members={session.members}
          onClose={() => setIsAddModalOpen(false)}
          editExpense={editingExpense}
        />
      )}
    </main>
  );
}
