'use client';

import { useState, useEffect, useRef } from 'react';
import { X, IndianRupee, Users, Split, StickyNote, Upload, Loader2 } from 'lucide-react';
import { useSessionStore } from '@/lib/store';
import { useToast } from './Toast';
import { Member, ExpenseCategory, CATEGORIES, Payer, Split as SplitType, ReceiptDraft } from '@/lib/types';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import ReceiptReviewModal from './ReceiptReviewModal';

interface AddExpenseModalProps {
  sessionId: string;
  members: Member[];
  onClose: () => void;
  editExpense?: {
    id: string; title: string; amount: number;
    payers: Payer[]; splits: SplitType[];
    category: ExpenseCategory; notes: string;
  };
}

export default function AddExpenseModal({ sessionId, members, onClose, editExpense }: AddExpenseModalProps) {
  const { addExpense, editExpense: updateExpense } = useSessionStore();
  const { showToast } = useToast();
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  const [title,  setTitle]  = useState(editExpense?.title  || '');
  const [amount, setAmount] = useState(editExpense?.amount?.toString() || '');
  const [category, setCategory] = useState<ExpenseCategory>(editExpense?.category || 'food');
  const [notes,  setNotes]  = useState(editExpense?.notes  || '');

  // Multi-Payer State
  const [payerIds, setPayerIds] = useState<string[]>(
    editExpense?.payers?.map(p => p.memberId) || [members[0]?.id || '']
  );
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (editExpense?.payers) {
      editExpense.payers.forEach(p => { initial[p.memberId] = p.amount.toString(); });
    } else if (members[0]) {
      initial[members[0].id] = ''; // Will be filled with total amount if single payer
    }
    return initial;
  });

  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    editExpense?.splits?.map(s => s.memberId) || members.map(m => m.id)
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [receiptDraft, setReceiptDraft] = useState<ReceiptDraft | null>(null);

  // Initialize custom split amounts and handle initial single-payer state
  useEffect(() => {
    if (editExpense?.splits) {
      const isEqual = new Set(editExpense.splits.map(s => s.amount)).size <= 1;
      if (!isEqual) {
        setSplitMode('custom');
        const a: Record<string, string> = {};
        editExpense.splits.forEach(s => { a[s.memberId] = s.amount.toString(); });
        setCustomAmounts(a);
      }
    }
    // If it's a new expense or has one payer, set that payer's amount to total automatically
    if (!editExpense && payerIds.length === 1 && amount) {
      setPayerAmounts({ [payerIds[0]]: amount });
    }
  }, [editExpense, amount]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMember = (id: string) =>
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const togglePayer = (id: string) => {
    setPayerIds(prev => {
      const isSelected = prev.includes(id);
      if (isSelected && prev.length === 1) return prev; // At least one payer required
      return isSelected ? prev.filter(x => x !== id) : [...prev, id];
    });
  };

  const splitPayersEqually = () => {
    const total = parseFloat(amount);
    if (isNaN(total) || total <= 0 || payerIds.length === 0) return;
    
    const perPerson = Math.round((total / payerIds.length) * 100) / 100;
    const diff = Math.round((total - perPerson * payerIds.length) * 100) / 100;
    
    const newAmounts: Record<string, string> = {};
    payerIds.forEach((id, i) => {
      newAmounts[id] = (i === 0 ? perPerson + diff : perPerson).toString();
    });
    setPayerAmounts(newAmounts);
  };

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (!title.trim())              { showToast('Please enter a title', 'warning'); return; }
    if (isNaN(parsedAmount) || parsedAmount <= 0) { showToast('Please enter a valid amount', 'warning'); return; }
    if (!selectedMembers.length)    { showToast('Select at least one member to split with', 'warning'); return; }
    if (!payerIds.length)           { showToast('Select at least one payer', 'warning'); return; }

    // Validate Payers
    const payers: Payer[] = payerIds.map(id => ({
      memberId: id,
      amount: parseFloat(payerAmounts[id] || '0') || 0
    }));

    const totalPaid = payers.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(totalPaid - parsedAmount) > 0.01) {
      showToast(`Payer total (₹${totalPaid.toFixed(2)}) doesn't match expense amount (₹${parsedAmount.toFixed(2)})`, 'error');
      return;
    }

    // Validate and Generate Splits
    let splits: SplitType[];
    if (splitMode === 'equal') {
      const pp = Math.round((parsedAmount / selectedMembers.length) * 100) / 100;
      const rem = Math.round((parsedAmount - pp * selectedMembers.length) * 100) / 100;
      splits = selectedMembers.map((id, i) => ({ memberId: id, amount: i === 0 ? pp + rem : pp }));
    } else {
      const totalSplit = selectedMembers.reduce((s, id) => s + (parseFloat(customAmounts[id] || '0') || 0), 0);
      if (Math.abs(totalSplit - parsedAmount) > 0.01) {
        showToast(`Split total (₹${totalSplit.toFixed(2)}) doesn't match amount (₹${parsedAmount.toFixed(2)})`, 'error');
        return;
      }
      splits = selectedMembers.map(id => ({ memberId: id, amount: parseFloat(customAmounts[id] || '0') || 0 }));
    }

    if (editExpense) {
      updateExpense(sessionId, editExpense.id, { title: title.trim(), amount: parsedAmount, payers, splits, category, notes: notes.trim() });
      showToast('Expense updated ✏️');
    } else {
      addExpense(sessionId, title.trim(), parsedAmount, payers, splits, category, notes.trim());
      showToast('Expense added! 🎉');
    }
    onClose();
  };

  const openReceiptPicker = () => {
    receiptInputRef.current?.click();
  };

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsParsingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/receipt/parse', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        showToast(payload.error || 'Failed to parse receipt', 'error');
        return;
      }

      setReceiptDraft(payload.draft as ReceiptDraft);
      if (payload.degraded) {
        showToast('OCR could not read the image fully. Review and edit values manually.', 'warning');
      } else {
        showToast('Receipt parsed. Review assignments and import.', 'success');
      }
    } catch (error) {
      console.error('Receipt upload failed:', error);
      showToast('Receipt parse failed. Try another image.', 'error');
    } finally {
      setIsParsingReceipt(false);
    }
  };

  return (
    <>
      <div className="bottom-sheet-overlay" onClick={onClose} />
      <div className="bottom-sheet">
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8 overflow-y-auto max-h-[85vh]">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-white">
              {editExpense ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <div className="flex items-center gap-2">
              {!editExpense && (
                <>
                  <input
                    ref={receiptInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleReceiptUpload}
                  />
                  <button
                    onClick={openReceiptPicker}
                    disabled={isParsingReceipt}
                    className="btn-secondary h-9 px-3 rounded-xl text-xs font-bold gap-1.5 disabled:opacity-60"
                  >
                    {isParsingReceipt ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {isParsingReceipt ? 'Parsing...' : 'Upload Receipt'}
                  </button>
                </>
              )}
              <button onClick={onClose} className="btn-ghost p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="mb-5">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <IndianRupee size={14} /> Amount
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-lg">₹</span>
              <input
                type="number"
                value={amount}
                onChange={e => {
                  setAmount(e.target.value);
                  // Auto-fill single payer amount
                  if (payerIds.length === 1) {
                    setPayerAmounts({ [payerIds[0]]: e.target.value });
                  }
                }}
                placeholder="0"
                className="input pl-9 text-2xl font-bold h-14"
                autoFocus
                id="expense-amount"
              />
            </div>
          </div>

          {/* Title */}
          <div className="mb-5">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <StickyNote size={14} /> What's it for?
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Dinner, Cab ride, Hotel…"
              className="input"
              id="expense-title"
            />
          </div>

          {/* Category */}
          <div className="mb-5">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={cn('chip', category === cat.value && 'chip-selected')}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Paid By (Multi-Payer) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Users size={14} /> Paid by
              </label>
              {payerIds.length > 1 && (
                <button
                  onClick={splitPayersEqually}
                  className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 bg-sky-50 dark:bg-sky-900/30 px-2.5 py-1 rounded-lg transition-colors"
                >
                  Split equally
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
              {members.map((member, i) => {
                const isSelected = payerIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    onClick={() => {
                      togglePayer(member.id);
                      // If selecting a single payer, auto-fill it
                      if (!isSelected && payerIds.length === 0 && amount) {
                        setPayerAmounts({ [member.id]: amount });
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all shrink-0',
                      isSelected
                        ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-sky-200 dark:hover:border-sky-800 text-slate-700 dark:text-slate-300'
                    )}
                  >
                    <div className={cn('avatar w-7 h-7 text-xs', getAvatarColor(i))}>
                      {getInitials(member.name)}
                    </div>
                    <span className="text-sm font-bold">{member.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Payer Amount Inputs */}
            {payerIds.length > 1 ? (
              <div className="space-y-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                {payerIds.map((id) => {
                  const m = members.find(x => x.id === id);
                  if (!m) return null;
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-300 flex-1 truncate">
                        {m.name} paid:
                      </span>
                      <div className="relative w-32">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          value={payerAmounts[id] || ''}
                          onChange={e => setPayerAmounts(prev => ({ ...prev, [id]: e.target.value }))}
                          placeholder="0"
                          className="input h-9 pl-6 text-sm text-right font-bold"
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400">Total Check</span>
                  <span className={cn(
                    'text-sm font-black tabular-nums',
                    Math.abs(payerIds.reduce((s, id) => s + (parseFloat(payerAmounts[id] || '0') || 0), 0) - parseFloat(amount)) < 0.01
                      ? 'text-emerald-500'
                      : 'text-rose-500'
                  )}>
                    ₹{payerIds.reduce((s, id) => s + (parseFloat(payerAmounts[id] || '0') || 0), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              payerIds.length === 1 && (
                 <div className="text-xs text-slate-500 dark:text-slate-400 font-medium px-1">
                   {members.find(x => x.id === payerIds[0])?.name} paid the full amount.
                 </div>
              )
            )}
          </div>

          {/* Split type */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Split size={14} /> Split type
            </label>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setSplitMode('equal')}  className={cn('chip flex-1', splitMode === 'equal'  && 'chip-selected')}>⚖️ Equal</button>
              <button onClick={() => setSplitMode('custom')} className={cn('chip flex-1', splitMode === 'custom' && 'chip-selected')}>✏️ Custom</button>
            </div>
          </div>

          {/* Members selection */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Split among</span>
              <button
                onClick={() => setSelectedMembers(selectedMembers.length === members.length ? [] : members.map(m => m.id))}
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300"
              >
                {selectedMembers.length === members.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <div className="space-y-2">
              {members.map((member, i) => {
                const isSelected = selectedMembers.includes(member.id);
                const perPerson  = splitMode === 'equal' && amount && selectedMembers.length > 0
                  ? (parseFloat(amount) / selectedMembers.length).toFixed(2) : null;

                return (
                  <div
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer',
                      isSelected
                        ? 'border-sky-300 dark:border-sky-700 bg-sky-50/50 dark:bg-sky-900/20 shadow-sm'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-60'
                    )}
                  >
                    {/* Checkbox */}
                    <div className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0',
                      isSelected
                        ? 'bg-sky-600 border-sky-600 shadow-sm'
                        : 'border-slate-300 dark:border-slate-600'
                    )}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    <div className={cn('avatar w-7 h-7 text-xs', getAvatarColor(i))}>
                      {getInitials(member.name)}
                    </div>

                    <span className="text-sm font-bold flex-1 text-slate-700 dark:text-slate-200">
                      {member.name}
                    </span>

                    {isSelected && splitMode === 'equal' && perPerson && (
                      <span className="text-sm font-black text-sky-600 dark:text-sky-400 tabular-nums">₹{perPerson}</span>
                    )}

                    {isSelected && splitMode === 'custom' && (
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">₹</span>
                        <input
                          type="number"
                          value={customAmounts[member.id] || ''}
                          onChange={e => {
                            e.stopPropagation();
                            setCustomAmounts(prev => ({ ...prev, [member.id]: e.target.value }));
                          }}
                          onClick={e => e.stopPropagation()}
                          placeholder="0"
                          className="input h-9 pl-5 text-sm text-right font-bold"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {splitMode === 'custom' && amount && (
              <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 text-right">
                <span className={cn(
                  'text-xs font-black tabular-nums',
                  Math.abs(
                    selectedMembers.reduce((s, id) => s + (parseFloat(customAmounts[id] || '0') || 0), 0)
                    - parseFloat(amount)
                  ) < 0.01
                    ? 'text-emerald-500'
                    : 'text-rose-500'
                )}>
                  Splitting: ₹{selectedMembers.reduce((s, id) => s + (parseFloat(customAmounts[id] || '0') || 0), 0).toFixed(2)}
                  {' '}/ ₹{parseFloat(amount).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
              <StickyNote size={14} /> Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add a note…"
              className="input h-11"
              id="expense-notes"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            className="btn-primary w-full h-14 text-base font-black tracking-wide"
            id="submit-expense"
          >
            {editExpense ? '✏️ Update Expense' : '✅ Add Expense'}
          </button>
        </div>
      </div>
      {receiptDraft && (
        <ReceiptReviewModal
          sessionId={sessionId}
          members={members}
          draft={receiptDraft}
          onClose={() => setReceiptDraft(null)}
          onSaved={() => {
            setReceiptDraft(null);
            onClose();
          }}
        />
      )}
    </>
  );
}