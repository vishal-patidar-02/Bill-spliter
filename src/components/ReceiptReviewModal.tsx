'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Check, ReceiptText, X, Store, Calendar, IndianRupee, Users, Percent, PlusCircle, StickyNote } from 'lucide-react';
import { useSessionStore } from '@/lib/store';
import { useToast } from './Toast';
import {
  ExpenseCategory,
  Member,
  ReceiptDraft,
  ReceiptLineAssignment,
} from '@/lib/types';
import { cn, getAvatarColor, getInitials, roundMoney } from '@/lib/utils';
import { buildExpensesFromReceipt } from '@/lib/receipt-transform';

interface ReceiptReviewModalProps {
  sessionId: string;
  members: Member[];
  draft: ReceiptDraft;
  onClose: () => void;
  onSaved: () => void;
}

export default function ReceiptReviewModal({
  sessionId,
  members,
  draft,
  onClose,
  onSaved,
}: ReceiptReviewModalProps) {
  const { addExpense } = useSessionStore();
  const { showToast } = useToast();

  const [localDraft, setLocalDraft] = useState<ReceiptDraft>(draft);
  const [payerId, setPayerId] = useState<string>(members[0]?.id || '');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [notes, setNotes] = useState<string>(`Imported from receipt: ${draft.merchant}`);
  const [isSaving, setIsSaving] = useState(false);

  const [assignments, setAssignments] = useState<Record<string, string[]>>(() => {
    const all = members.map((m) => m.id);
    const initial: Record<string, string[]> = {};
    draft.lineItems.forEach((line) => {
      initial[line.id] = [...all];
    });
    return initial;
  });

  const [taxMemberIds, setTaxMemberIds] = useState<string[]>(() => members.map((m) => m.id));
  const [tipMemberIds, setTipMemberIds] = useState<string[]>(() => members.map((m) => m.id));

  const includedItems = useMemo(
    () => localDraft.lineItems.filter((item) => item.include),
    [localDraft.lineItems]
  );

  const includedTotal = useMemo(() => {
    const lines = includedItems.reduce((sum, line) => sum + line.totalPrice, 0);
    return roundMoney(lines + localDraft.tax + localDraft.tip);
  }, [includedItems, localDraft.tax, localDraft.tip]);

  const toggleLineMember = (lineId: string, memberId: string) => {
    setAssignments((prev) => {
      const existing = prev[lineId] || [];
      const alreadySelected = existing.includes(memberId);
      return {
        ...prev,
        [lineId]: alreadySelected
          ? existing.filter((id) => id !== memberId)
          : [...existing, memberId],
      };
    });
  };

  const toggleLineInclude = (lineId: string) => {
    setLocalDraft((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) =>
        item.id === lineId ? { ...item, include: !item.include } : item
      ),
    }));
  };

  const updateLine = (lineId: string, field: 'name' | 'totalPrice', value: string) => {
    setLocalDraft((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) => {
        if (item.id !== lineId) return item;
        if (field === 'name') return { ...item, name: value };
        const amount = Number.parseFloat(value);
        return {
          ...item,
          totalPrice: Number.isFinite(amount) ? roundMoney(amount) : 0,
          unitPrice: Number.isFinite(amount) ? roundMoney(amount) : 0,
        };
      }),
    }));
  };

  const toggleExtraMembers = (
    target: 'tax' | 'tip',
    memberId: string
  ) => {
    const setter = target === 'tax' ? setTaxMemberIds : setTipMemberIds;
    setter((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSave = async () => {
    if (!payerId) {
      showToast('Select who paid the receipt', 'warning');
      return;
    }

    for (const line of localDraft.lineItems) {
      if (!line.include) continue;
      if (!line.name.trim()) {
        showToast('Every included line item needs a name', 'warning');
        return;
      }
      if (line.totalPrice <= 0) {
        showToast('Included line items must have amount greater than 0', 'warning');
        return;
      }
      if (!assignments[line.id] || assignments[line.id].length === 0) {
        showToast('Assign each included line item to at least one member', 'warning');
        return;
      }
    }

    setIsSaving(true);
    try {
      const assignmentList: ReceiptLineAssignment[] = localDraft.lineItems.map((line) => ({
        lineItemId: line.id,
        memberIds: assignments[line.id] || [],
      }));

      const expenses = buildExpensesFromReceipt({
        sessionId,
        payerId,
        category,
        notes,
        draft: localDraft,
        assignments: assignmentList,
        taxMemberIds,
        tipMemberIds,
      });

      if (!expenses.length) {
        showToast('No expenses were generated. Check your line-item assignments.', 'warning');
        return;
      }

      expenses.forEach((expense) => {
        addExpense(
          sessionId,
          expense.title,
          expense.amount,
          expense.payers,
          expense.splits,
          expense.category,
          expense.notes
        );
      });

      showToast(`Imported ${expenses.length} expense${expenses.length > 1 ? 's' : ''} from receipt`, 'success');
      onSaved();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="bottom-sheet-overlay" onClick={onClose} />
      <div className="bottom-sheet">
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8 overflow-y-auto max-h-[85vh]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ReceiptText size={20} className="text-sky-500" /> Review Receipt
            </h2>
            <button onClick={onClose} className="btn-ghost p-2 rounded-full">
              <X size={20} />
            </button>
          </div>

          {localDraft.warnings.length > 0 && (
            <div className="mb-5 p-4 rounded-xl border border-amber-200/50 dark:border-amber-900/30 bg-amber-50/80 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200 text-sm">
              <p className="font-bold flex items-center gap-2 mb-1.5">
                <AlertTriangle size={16} className="text-amber-500" /> Needs review
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm opacity-90 text-amber-700 dark:text-amber-300">
                {localDraft.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Store size={14} /> Merchant
              </label>
              <input
                value={localDraft.merchant}
                onChange={(event) =>
                  setLocalDraft((prev) => ({ ...prev, merchant: event.target.value }))
                }
                className="input h-11"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Calendar size={14} /> Receipt Date
              </label>
              <input
                value={localDraft.receiptDate}
                onChange={(event) =>
                  setLocalDraft((prev) => ({ ...prev, receiptDate: event.target.value }))
                }
                className="input h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div>
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <IndianRupee size={14} /> Subtotal
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">₹</span>
                <input
                  type="number"
                  value={localDraft.subtotal}
                  onChange={(event) =>
                    setLocalDraft((prev) => ({
                      ...prev,
                      subtotal: roundMoney(Number.parseFloat(event.target.value) || 0),
                    }))
                  }
                  className="input pl-7 h-11 font-semibold"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                Tax
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">₹</span>
                <input
                  type="number"
                  value={localDraft.tax}
                  onChange={(event) =>
                    setLocalDraft((prev) => ({
                      ...prev,
                      tax: roundMoney(Number.parseFloat(event.target.value) || 0),
                    }))
                  }
                  className="input pl-7 h-11 font-semibold"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                Tip
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">₹</span>
                <input
                  type="number"
                  value={localDraft.tip}
                  onChange={(event) =>
                    setLocalDraft((prev) => ({
                      ...prev,
                      tip: roundMoney(Number.parseFloat(event.target.value) || 0),
                    }))
                  }
                  className="input pl-7 h-11 font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-1.5">
              <ReceiptText size={16} className="text-sky-500" /> Line Items
            </h3>
            <div className="space-y-3">
              {localDraft.lineItems.map((line) => (
                <div key={line.id} className={cn(
                  "border rounded-2xl p-4 transition-all",
                  line.include 
                    ? "border-sky-200 dark:border-sky-800/50 bg-sky-50/30 dark:bg-sky-900/10" 
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 opacity-70"
                )}>
                  <div className="flex items-start gap-3 mb-3">
                    <button
                      onClick={() => toggleLineInclude(line.id)}
                      className={cn(
                        'w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 mt-1.5 transition-colors',
                        line.include
                          ? 'bg-sky-600 border-sky-600 shadow-sm'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      )}
                    >
                      {line.include && (
                        <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1 min-w-0 space-y-2.5">
                      <input
                        value={line.name}
                        onChange={(event) => updateLine(line.id, 'name', event.target.value)}
                        className="input h-10 w-full text-sm font-bold"
                        placeholder="Item name"
                      />
                      <div className="flex justify-between items-center">
                         <span className="text-xs font-semibold text-slate-500">Amount</span>
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                          <input
                            type="number"
                            value={line.totalPrice}
                            onChange={(event) => updateLine(line.id, 'totalPrice', event.target.value)}
                            className="input h-9 pl-7 text-sm text-right font-bold"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {line.include && (
                    <div className="pl-9">
                      <p className="text-xs font-semibold text-slate-500 mb-2">Split among</p>
                      <div className="flex flex-wrap gap-2">
                        {members.map((member, index) => {
                          const selected = (assignments[line.id] || []).includes(member.id);
                          return (
                            <button
                              key={`${line.id}-${member.id}`}
                              onClick={() => toggleLineMember(line.id, member.id)}
                              className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors',
                                selected
                                  ? 'border-sky-300 dark:border-sky-700 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              )}
                            >
                              <span className={cn('avatar w-4 h-4 text-[8px]', getAvatarColor(index))}>
                                {getInitials(member.name)}
                              </span>
                              {member.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5 mb-6">
            <div>
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Users size={14} /> Paid by
              </label>
              <div className="flex flex-wrap gap-2">
                {members.map((member, index) => (
                  <button
                    key={member.id}
                    onClick={() => setPayerId(member.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all',
                      payerId === member.id
                        ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-sky-200 dark:hover:border-sky-800 text-slate-700 dark:text-slate-300'
                    )}
                  >
                    <span className={cn('avatar w-6 h-6 text-[10px]', getAvatarColor(index))}>
                      {getInitials(member.name)}
                    </span>
                    {member.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Percent size={14} /> Tax split
              </p>
              <div className="flex flex-wrap gap-2">
                {members.map((member) => (
                  <button
                    key={`tax-${member.id}`}
                    onClick={() => toggleExtraMembers('tax', member.id)}
                    className={cn(
                      'chip',
                      taxMemberIds.includes(member.id) && 'chip-selected'
                    )}
                  >
                    {member.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <PlusCircle size={14} /> Tip split
              </p>
              <div className="flex flex-wrap gap-2">
                {members.map((member) => (
                  <button
                    key={`tip-${member.id}`}
                    onClick={() => toggleExtraMembers('tip', member.id)}
                    className={cn(
                      'chip',
                      tipMemberIds.includes(member.id) && 'chip-selected'
                    )}
                  >
                    {member.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
              <StickyNote size={14} /> Notes
            </label>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="input h-11"
            />
          </div>

          <div className="rounded-2xl p-4 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/50 mb-6 flex justify-between items-center shadow-sm">
            <span className="text-sm font-semibold text-sky-800 dark:text-sky-200">Total to Import</span>
            <span className="text-xl font-black text-sky-600 dark:text-sky-400 tabular-nums">₹{includedTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary w-full h-14 text-base font-black tracking-wide disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : '✅ Import Receipt As Expenses'}
          </button>
        </div>
      </div>
    </>
  );
}
