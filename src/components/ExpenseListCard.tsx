'use client';

import { Edit2, Trash2, Calendar, Tag } from 'lucide-react';
import { Expense, Member } from '@/lib/types';
import { cn, formatCurrency, formatDate, getCategoryInfo, getInitials, getAvatarColor } from '@/lib/utils';
import { useSessionStore } from '@/lib/store';
import { useToast } from './Toast';

interface ExpenseListCardProps {
  sessionId: string;
  expenses: Expense[];
  members: Member[];
  onEdit: (expense: Expense) => void;
  onAdd?: () => void;
}

export default function ExpenseListCard({ sessionId, expenses, members, onEdit, onAdd }: ExpenseListCardProps) {
  const { deleteExpense } = useSessionStore();
  const { showToast } = useToast();

  const getMemberName = (id: string) => members.find((m) => m.id === id)?.name || 'Unknown';

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Delete "${title}"?`)) {
      deleteExpense(sessionId, id);
      showToast('Expense deleted');
    }
  };

  return (
    <div className="card p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-slate-800 flex items-center gap-2 mb-0">
          <span className="text-lg">📜</span> Expenses
          <span className="badge badge-neutral bg-slate-100">{expenses.length}</span>
        </h3>
        
        {onAdd && (
          <button 
            onClick={onAdd}
            className="btn-secondary h-8 px-3 rounded-xl bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-100 hover:border-sky-200 transition-colors shadow-none gap-1.5"
          >
            <span className="text-xs font-bold uppercase tracking-wider">Add</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        {expenses.map((expense) => {
          const cat = getCategoryInfo(expense.category);
          const payerId = expense.payers[0]?.memberId;
          const payerIndex = members.findIndex(m => m.id === payerId);
          
          return (
            <div
              key={expense.id}
              className="group p-3 rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:border-sky-100 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xl shadow-sm">
                    {cat.emoji}
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-slate-900 leading-tight">{expense.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <Tag size={10} /> {cat.label}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <Calendar size={10} /> {formatDate(expense.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-sky-600">{formatCurrency(expense.amount)}</div>
                  <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                    PAID BY {getMemberName(payerId).toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed border-slate-200">
                <div className="flex -space-x-1.5 overflow-hidden">
                  {expense.splits.map((split, i) => {
                    const mIdx = members.findIndex(m => m.id === split.memberId);
                    return (
                      <div
                        key={split.memberId}
                        className={cn(
                          "avatar w-6 h-6 border-2 border-white ring-1 ring-slate-100",
                          getAvatarColor(mIdx)
                        )}
                        title={getMemberName(split.memberId)}
                      >
                        {getInitials(getMemberName(split.memberId))}
                      </div>
                    );
                  })}
                  {expense.splits.length > 5 && (
                    <div className="avatar w-6 h-6 border-2 border-white bg-slate-200 text-slate-600 text-[8px]">
                      +{expense.splits.length - 5}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(expense)}
                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id, expense.title)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {expenses.length === 0 && (
          <div className="empty-state py-8">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-3xl mb-3 grayscale opacity-50">
              💸
            </div>
            <p className="text-sm font-medium text-slate-600">No expenses yet</p>
            <p className="text-xs text-slate-400 mt-1">Tap the + button to add your first one!</p>
          </div>
        )}
      </div>
    </div>
  );
}
