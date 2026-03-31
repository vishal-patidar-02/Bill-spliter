'use client';

import { useMemo } from 'react';
import { ArrowLeftRight, Share2, FileText, CheckCircle2, Copy } from 'lucide-react';
import { Member, Expense, Session } from '@/lib/types';
import { computeSettlements } from '@/lib/settlement';
import { shareToWhatsApp, generatePDF, generateWhatsAppText } from '@/lib/export';
import { cn, formatCurrency, getInitials, getAvatarColor, copyToClipboard } from '@/lib/utils';
import { useToast } from './Toast';

interface SettlementCardProps {
  session: Session;
  members: Member[];
  expenses: Expense[];
}

export default function SettlementCard({ session, members, expenses }: SettlementCardProps) {
  const settlements = useMemo(() => computeSettlements(members, expenses), [members, expenses]);
  const { showToast } = useToast();

  const getMemberName = (id: string) => members.find((m) => m.id === id)?.name || 'Unknown';
  const getAvatarId = (id: string) => members.findIndex(m => m.id === id);

  const handleCopy = async () => {
    const text = generateWhatsAppText(session);
    const success = await copyToClipboard(text);
    if (success) showToast('Settlement text copied! 📋');
  };

  const handleWhatsApp = () => {
    shareToWhatsApp(session);
  };

  const handlePDF = () => {
    showToast('Generating PDF... ⏳');
    generatePDF(session);
  };

  return (
    <div className="card p-5 animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <ArrowLeftRight size={100} strokeWidth={1.5} />
      </div>
      
      <h3 className="font-heading font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span className="text-lg">🤝</span> Smart Settlement
        <span className="badge badge-neutral bg-slate-100">Minimal Trans.</span>
      </h3>

      {settlements.length > 0 ? (
        <div className="space-y-4 mb-8">
          {settlements.map((s, i) => {
            const fromIdx = getAvatarId(s.from);
            const toIdx = getAvatarId(s.to);
            
            return (
              <div 
                key={`${s.from}-${s.to}-${i}`} 
                className="group flex flex-col p-4 rounded-2xl bg-sky-50/40 border border-sky-100/50 hover:bg-white transition-all shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col items-center gap-2">
                    <div className={cn('avatar w-12 h-12 text-sm shadow-md ring-2 ring-white', getAvatarColor(fromIdx))}>
                      {getInitials(getMemberName(s.from))}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase truncate max-w-[60px]">
                      {getMemberName(s.from)}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-center flex-1">
                    <div className="text-lg font-heading font-black text-sky-700 tracking-tight">
                      {formatCurrency(s.amount)}
                    </div>
                    <div className="w-full flex items-center gap-1.5 px-4 mb-1">
                      <div className="h-0.5 flex-1 bg-sky-200 rounded-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-sky-500 animate-shimmer" style={{ width: '30%' }} />
                      </div>
                      <ArrowLeftRight size={14} className="text-sky-400 rotate-0" />
                    </div>
                    <span className="text-[9px] font-bold text-sky-400 uppercase tracking-widest">
                      TRANSFERS TO
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className={cn('avatar w-12 h-12 text-sm shadow-md ring-2 ring-white', getAvatarColor(toIdx))}>
                      {getInitials(getMemberName(s.to))}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase truncate max-w-[60px]">
                      {getMemberName(s.to)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state py-8">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-3xl mb-3">
            ✅
          </div>
          <p className="text-sm font-bold text-emerald-600">All Settled Up!</p>
          <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Everyone is even. Add more expenses to keep splitting!</p>
        </div>
      )}

      {/* Export Options */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <button
          onClick={handleWhatsApp}
          className="btn-secondary h-12 flex-col !gap-1 p-0 rounded-2xl border-emerald-100 hover:bg-emerald-50 hover:border-emerald-200 text-emerald-600 transition-all shadow-sm"
          disabled={settlements.length === 0}
        >
          <Share2 size={16} />
          <span className="text-[9px] font-black uppercase tracking-wider">WhatsApp</span>
        </button>
        <button
          onClick={handleCopy}
          className="btn-secondary h-12 flex-col !gap-1 p-0 rounded-2xl border-amber-100 hover:bg-amber-50 hover:border-amber-200 text-amber-600 transition-all shadow-sm"
          disabled={settlements.length === 0}
        >
          <Copy size={16} />
          <span className="text-[9px] font-black uppercase tracking-wider">Copy Text</span>
        </button>
        <button
          onClick={handlePDF}
          className="btn-secondary h-12 flex-col !gap-1 p-0 rounded-2xl border-sky-100 hover:bg-sky-50 hover:border-sky-200 text-sky-600 transition-all shadow-sm"
          disabled={expenses.length === 0}
        >
          <FileText size={16} />
          <span className="text-[9px] font-black uppercase tracking-wider">PDF Export</span>
        </button>
      </div>
      
      {/* Smart Algorithm Notice */}
      <div className="mt-6 flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
        <CheckCircle2 size={12} className="text-sky-500" />
        <span className="text-[10px] font-medium text-slate-500">
          Our algorithm minimizes transactions to save you time. 🚀
        </span>
      </div>
    </div>
  );
}
