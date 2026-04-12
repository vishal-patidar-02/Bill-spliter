'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Check, ReceiptText, X } from 'lucide-react';
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ReceiptText size={20} /> Review Receipt
            </h2>
            <button onClick={onClose} className="btn-ghost p-2 rounded-full">
              <X size={18} />
            </button>
          </div>

          {localDraft.warnings.length > 0 && (
            <div className="mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
              <p className="font-semibold flex items-center gap-2 mb-1">
                <AlertTriangle size={14} /> Needs review
              </p>
              {localDraft.warnings.map((warning, index) => (
                <p key={index}>{warning}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Merchant
              <input
                value={localDraft.merchant}
                onChange={(event) =>
                  setLocalDraft((prev) => ({ ...prev, merchant: event.target.value }))
                }
                className="input mt-1 h-10"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Receipt Date
              <input
                value={localDraft.receiptDate}
                onChange={(event) =>
                  setLocalDraft((prev) => ({ ...prev, receiptDate: event.target.value }))
                }
                className="input mt-1 h-10"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Subtotal
              <input
                type="number"
                value={localDraft.subtotal}
                onChange={(event) =>
                  setLocalDraft((prev) => ({
                    ...prev,
                    subtotal: roundMoney(Number.parseFloat(event.target.value) || 0),
                  }))
                }
                className="input mt-1 h-10"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Tax
              <input
                type="number"
                value={localDraft.tax}
                onChange={(event) =>
                  setLocalDraft((prev) => ({
                    ...prev,
                    tax: roundMoney(Number.parseFloat(event.target.value) || 0),
                  }))
                }
                className="input mt-1 h-10"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Tip
              <input
                type="number"
                value={localDraft.tip}
                onChange={(event) =>
                  setLocalDraft((prev) => ({
                    ...prev,
                    tip: roundMoney(Number.parseFloat(event.target.value) || 0),
                  }))
                }
                className="input mt-1 h-10"
              />
            </label>
          </div>

          <div className="space-y-3 mb-5">
            {localDraft.lineItems.map((line) => (
              <div key={line.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                <div className="flex items-start gap-2 mb-2">
                  <button
                    onClick={() => toggleLineInclude(line.id)}
                    className={cn(
                      'w-5 h-5 rounded border flex items-center justify-center',
                      line.include
                        ? 'bg-sky-600 border-sky-600 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    )}
                  >
                    {line.include && <Check size={12} />}
                  </button>
                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      value={line.name}
                      onChange={(event) => updateLine(line.id, 'name', event.target.value)}
                      className="input h-10 w-full text-sm font-semibold"
                      placeholder="Item name"
                    />
                    <div className="flex justify-end">
                      <input
                        type="number"
                        value={line.totalPrice}
                        onChange={(event) => updateLine(line.id, 'totalPrice', event.target.value)}
                        className="input h-9 w-36 text-right font-semibold"
                        placeholder="Amount"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {members.map((member, index) => {
                    const selected = (assignments[line.id] || []).includes(member.id);
                    return (
                      <button
                        key={`${line.id}-${member.id}`}
                        onClick={() => toggleLineMember(line.id, member.id)}
                        className={cn(
                          'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold',
                          selected
                            ? 'border-sky-300 bg-sky-50 text-sky-700'
                            : 'border-slate-200 text-slate-600'
                        )}
                      >
                        <span className={cn('avatar w-5 h-5 text-[9px]', getAvatarColor(index))}>
                          {getInitials(member.name)}
                        </span>
                        {member.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Paid by</p>
              <div className="flex flex-wrap gap-2">
                {members.map((member, index) => (
                  <button
                    key={member.id}
                    onClick={() => setPayerId(member.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold',
                      payerId === member.id
                        ? 'border-sky-300 bg-sky-50 text-sky-700'
                        : 'border-slate-200 text-slate-600'
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
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Tax split</p>
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
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Tip split</p>
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

          <label className="text-xs font-bold uppercase tracking-wide text-slate-500 block mb-4">
            Notes
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="input mt-1 h-10"
            />
          </label>

          <div className="rounded-xl p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 mb-4 text-sm">
            Generated total from selected lines + tax + tip: <span className="font-black">₹{includedTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary w-full h-12 text-sm font-black disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Import Receipt As Expenses'}
          </button>
        </div>
      </div>
    </>
  );
}
