'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Target, Wallet } from 'lucide-react';
import { Member, Expense } from '@/lib/types';
import { calculateBalances } from '@/lib/settlement';
import { cn, formatCurrency, getInitials, getAvatarColor } from '@/lib/utils';

interface BalanceSummaryCardProps {
  members: Member[];
  expenses: Expense[];
}

export default function BalanceSummaryCard({ members, expenses }: BalanceSummaryCardProps) {
  const balances = useMemo(() => calculateBalances(members, expenses), [members, expenses]);

  const totalSpent = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const avgPerPerson = members.length > 0 ? totalSpent / members.length : 0;

  return (
    <div className="card p-5 animate-fade-in">
      <h3 className="font-heading font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span className="text-lg">📊</span> Balances
        <span className="badge badge-neutral bg-slate-100">Overview</span>
      </h3>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-sky-50/50 p-3.5 rounded-2xl border border-sky-100/50">
          <div className="flex items-center gap-2 text-[11px] font-bold text-sky-500 uppercase tracking-wider mb-1">
            <Wallet size={12} strokeWidth={2.5} /> Total Spend
          </div>
          <div className="text-xl font-heading font-black text-sky-700">{formatCurrency(totalSpent)}</div>
        </div>
        <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100/50">
          <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-500 uppercase tracking-wider mb-1">
            <Target size={12} strokeWidth={2.5} /> Avg / Person
          </div>
          <div className="text-xl font-heading font-black text-emerald-700">{formatCurrency(avgPerPerson)}</div>
        </div>
      </div>

      <div className="space-y-4">
        {balances.map((b, i) => {
          const mIdx = members.findIndex(m => m.id === b.memberId);
          const isPositive = b.netBalance > 0.01;
          const isNegative = b.netBalance < -0.01;
          
          return (
            <div key={b.memberId} className="flex items-center gap-4 transition-transform active:scale-[0.98]">
              <div className={cn('avatar w-10 h-10 text-xs shadow-sm shadow-sky-100 font-black', getAvatarColor(mIdx))}>
                {getInitials(b.memberName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-heading font-bold text-slate-800 truncate">{b.memberName}</span>
                  <span className={cn(
                    'text-sm font-black',
                    isPositive ? 'text-emerald-500' : isNegative ? 'text-rose-500' : 'text-slate-400'
                  )}>
                    {isPositive ? '+' : ''}{formatCurrency(b.netBalance)}
                  </span>
                </div>
                
                {/* Visual Bar */}
                <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  {isPositive ? (
                    <div 
                      className="h-full bg-emerald-400 rounded-full" 
                      style={{ width: `${Math.min(100, (b.netBalance / Math.max(...balances.map(bb => bb.netBalance), 1)) * 100)}%` }}
                    />
                  ) : isNegative ? (
                    <div 
                      className="h-full bg-rose-400 rounded-full" 
                      style={{ width: `${Math.min(100, (Math.abs(b.netBalance) / Math.max(...balances.map(bb => Math.abs(bb.netBalance)), 1)) * 100)}%` }}
                    />
                  ) : null}
                </div>
                
                <div className="flex items-center justify-between mt-1 px-0.5">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <TrendingUp size={10} className="text-emerald-500" strokeWidth={3} /> Paid {formatCurrency(b.totalPaid)}
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Owes {formatCurrency(b.totalOwed)} <TrendingDown size={10} className="text-rose-500" strokeWidth={3} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {members.length === 0 && (
        <div className="text-center py-6 text-slate-400 text-sm font-medium italic">
          No data summary available
        </div>
      )}
    </div>
  );
}
