'use client';

import { useState, useEffect } from 'react';
import { X, IndianRupee, Users, Split, StickyNote } from 'lucide-react';
import { useSessionStore } from '@/lib/store';
import { useToast } from './Toast';
import { Member, ExpenseCategory, CATEGORIES, Payer, Split as SplitType } from '@/lib/types';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';

interface AddExpenseModalProps {
  sessionId: string;
  members: Member[];
  onClose: () => void;
  editExpense?: {
    id: string;
    title: string;
    amount: number;
    payers: Payer[];
    splits: SplitType[];
    category: ExpenseCategory;
    notes: string;
  };
}

export default function AddExpenseModal({
  sessionId,
  members,
  onClose,
  editExpense,
}: AddExpenseModalProps) {
  const { addExpense, editExpense: updateExpense } = useSessionStore();
  const { showToast } = useToast();

  const [title, setTitle] = useState(editExpense?.title || '');
  const [amount, setAmount] = useState(editExpense?.amount?.toString() || '');
  const [category, setCategory] = useState<ExpenseCategory>(editExpense?.category || 'food');
  const [notes, setNotes] = useState(editExpense?.notes || '');
  const [payerId, setPayerId] = useState(editExpense?.payers?.[0]?.memberId || members[0]?.id || '');
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    editExpense?.splits?.map((s) => s.memberId) || members.map((m) => m.id)
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  // Initialize custom amounts from edit
  useEffect(() => {
    if (editExpense?.splits) {
      const isEqual = new Set(editExpense.splits.map((s) => s.amount)).size <= 1;
      if (!isEqual) {
        setSplitMode('custom');
        const amounts: Record<string, string> = {};
        editExpense.splits.forEach((s) => {
          amounts[s.memberId] = s.amount.toString();
        });
        setCustomAmounts(amounts);
      }
    }
  }, [editExpense]);

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);

    if (!title.trim()) {
      showToast('Please enter a title', 'warning');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Please enter a valid amount', 'warning');
      return;
    }
    if (selectedMembers.length === 0) {
      showToast('Select at least one member', 'warning');
      return;
    }

    const payers: Payer[] = [{ memberId: payerId, amount: parsedAmount }];

    let splits: SplitType[];
    if (splitMode === 'equal') {
      const perPerson = Math.round((parsedAmount / selectedMembers.length) * 100) / 100;
      // Fix rounding - give remainder to first person
      const remainder = Math.round((parsedAmount - perPerson * selectedMembers.length) * 100) / 100;
      splits = selectedMembers.map((memberId, i) => ({
        memberId,
        amount: i === 0 ? perPerson + remainder : perPerson,
      }));
    } else {
      // Custom split
      const totalCustom = selectedMembers.reduce(
        (sum, id) => sum + (parseFloat(customAmounts[id] || '0') || 0),
        0
      );
      if (Math.abs(totalCustom - parsedAmount) > 0.01) {
        showToast(`Custom split total (₹${totalCustom}) doesn't match amount (₹${parsedAmount})`, 'error');
        return;
      }
      splits = selectedMembers.map((memberId) => ({
        memberId,
        amount: parseFloat(customAmounts[memberId] || '0') || 0,
      }));
    }

    if (editExpense) {
      updateExpense(sessionId, editExpense.id, {
        title: title.trim(),
        amount: parsedAmount,
        payers,
        splits,
        category,
        notes: notes.trim(),
      });
      showToast('Expense updated ✏️');
    } else {
      addExpense(sessionId, title.trim(), parsedAmount, payers, splits, category, notes.trim());
      showToast('Expense added! 🎉');
    }
    onClose();
  };

  return (
    <>
      <div className="bottom-sheet-overlay" onClick={onClose} />
      <div className="bottom-sheet">
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-heading font-bold text-slate-900">
              {editExpense ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <button onClick={onClose} className="btn-ghost p-2 rounded-full">
              <X size={20} />
            </button>
          </div>

          {/* Amount */}
          <div className="mb-5">
            <label className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <IndianRupee size={14} /> Amount
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-lg">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="input pl-9 text-2xl font-bold h-14"
                autoFocus
                id="expense-amount"
              />
            </div>
          </div>

          {/* Title */}
          <div className="mb-5">
            <label className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <StickyNote size={14} /> What's it for?
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Dinner, Cab ride, Hotel..."
              className="input"
              id="expense-title"
            />
          </div>

          {/* Category */}
          <div className="mb-5">
            <label className="text-sm font-semibold text-slate-600 mb-2 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    'chip',
                    category === cat.value && 'chip-selected'
                  )}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Paid By */}
          <div className="mb-5">
            <label className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <Users size={14} /> Paid by
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {members.map((member, i) => (
                <button
                  key={member.id}
                  onClick={() => setPayerId(member.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl border-1.5 transition-all flex-shrink-0',
                    payerId === member.id
                      ? 'border-sky-400 bg-sky-50 text-sky-700'
                      : 'border-slate-200 hover:border-sky-200'
                  )}
                >
                  <div className={cn('avatar w-7 h-7 text-xs', getAvatarColor(i))}>
                    {getInitials(member.name)}
                  </div>
                  <span className="text-sm font-medium">{member.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Split Type */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <Split size={14} /> Split type
            </label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSplitMode('equal')}
                className={cn(
                  'chip flex-1',
                  splitMode === 'equal' && 'chip-selected'
                )}
              >
                ⚖️ Equal
              </button>
              <button
                onClick={() => setSplitMode('custom')}
                className={cn(
                  'chip flex-1',
                  splitMode === 'custom' && 'chip-selected'
                )}
              >
                ✏️ Custom
              </button>
            </div>
          </div>

          {/* Members selection */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-600">Split among</span>
              <button
                onClick={() =>
                  setSelectedMembers(
                    selectedMembers.length === members.length ? [] : members.map((m) => m.id)
                  )
                }
                className="text-xs font-semibold text-sky-600 hover:text-sky-700"
              >
                {selectedMembers.length === members.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-2">
              {members.map((member, i) => {
                const isSelected = selectedMembers.includes(member.id);
                const perPerson =
                  splitMode === 'equal' && amount && selectedMembers.length > 0
                    ? (parseFloat(amount) / selectedMembers.length).toFixed(2)
                    : null;

                return (
                  <div
                    key={member.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border-1.5 transition-all cursor-pointer',
                      isSelected
                        ? 'border-sky-300 bg-sky-50/50'
                        : 'border-slate-100 bg-slate-50/50 opacity-60'
                    )}
                    onClick={() => toggleMember(member.id)}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0',
                        isSelected
                          ? 'bg-sky-600 border-sky-600'
                          : 'border-slate-300'
                      )}
                    >
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className={cn('avatar w-7 h-7 text-xs', getAvatarColor(i))}>
                      {getInitials(member.name)}
                    </div>
                    <span className="text-sm font-medium flex-1">{member.name}</span>
                    {isSelected && splitMode === 'equal' && perPerson && (
                      <span className="text-sm font-semibold text-sky-600">₹{perPerson}</span>
                    )}
                    {isSelected && splitMode === 'custom' && (
                      <input
                        type="number"
                        value={customAmounts[member.id] || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          setCustomAmounts((prev) => ({
                            ...prev,
                            [member.id]: e.target.value,
                          }));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="₹0"
                        className="input w-24 h-9 text-sm text-right py-1 px-2"
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {splitMode === 'custom' && amount && (
              <div className="mt-2 text-xs font-medium text-right">
                <span
                  className={cn(
                    Math.abs(
                      selectedMembers.reduce(
                        (sum, id) => sum + (parseFloat(customAmounts[id] || '0') || 0),
                        0
                      ) - parseFloat(amount)
                    ) < 0.01
                      ? 'text-green-600'
                      : 'text-red-500'
                  )}
                >
                  Total: ₹
                  {selectedMembers
                    .reduce((sum, id) => sum + (parseFloat(customAmounts[id] || '0') || 0), 0)
                    .toFixed(2)}{' '}
                  / ₹{parseFloat(amount).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="text-sm font-semibold text-slate-600 mb-2 block">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note..."
              className="input"
              id="expense-notes"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            className="btn-primary w-full h-13 text-base"
            id="submit-expense"
          >
            {editExpense ? '✏️ Update Expense' : '✅ Add Expense'}
          </button>
        </div>
      </div>
    </>
  );
}
