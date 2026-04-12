'use client';

import { useState } from 'react';
import {
  HelpCircle,
  X,
  Plus,
  Link,
  Users,
  Receipt,
  CreditCard,
  BarChart3,
  Share2,
  FileText,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Data ──────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: Plus,
    color: 'bg-sky-500',
    title: 'Create or Join a Session',
    description:
      'Start by creating a new trip session with a name (e.g., "Goa Trip 2026"), or paste an existing session code to join your friends\'s session.',
  },
  {
    icon: Users,
    color: 'bg-emerald-500',
    title: 'Add Group Members',
    description:
      'Once in a session, go to the Expenses tab and click "+ Add" in the Members card. Type each person\'s name and press Enter or Add. The first member added becomes the session owner.',
  },
  {
    icon: Receipt,
    color: 'bg-purple-500',
    title: 'Log an Expense',
    description:
      'Tap the "+ Add Expense" button (or the floating ⚡ button). Fill in the title, total amount, select who paid and how to split — equally or with custom amounts per person.',
  },
  {
    icon: CreditCard,
    color: 'bg-amber-500',
    title: 'Multi-Payer Support',
    description:
      'For large bills where multiple people pitched in, enable multi-payer mode. Assign individual contribution amounts to each payer — the system validates they sum to the total.',
  },
  {
    icon: BarChart3,
    color: 'bg-rose-500',
    title: 'View Balances',
    description:
      'Switch to the "Balances" tab to see each person\'s net position — who owes money and who is owed. Green means they\'re in credit, red means they owe.',
  },
  {
    icon: CreditCard,
    color: 'bg-sky-600',
    title: 'Smart Settlement',
    description:
      'The "Settle" tab shows the minimum set of transactions needed to clear all debts. Our greedy algorithm minimises the number of transfers so no one makes unnecessary payments.',
  },
  {
    icon: Share2,
    color: 'bg-green-500',
    title: 'Share & Export',
    description:
      'Share the session link so anyone can join from any device. Export to WhatsApp, copy as text, or generate a PDF report for your records.',
  },
  {
    icon: Link,
    color: 'bg-indigo-500',
    title: 'Real-time Sync',
    description:
      'All changes are automatically synced to the cloud. Any group member who joins using your session code or link will see expenses and settlements update in real time.',
  },
];

const FAQS = [
  {
    q: 'Do I need to create an account?',
    a: 'No! SplitEase is completely login-free. Just create a session and share the code with your group.',
  },
  {
    q: 'What happens if I close the browser?',
    a: 'Your session is saved both locally (in your browser) and in the cloud. Reopen the app and you\'ll find all your sessions restored automatically.',
  },
  {
    q: 'Can I edit or delete an expense?',
    a: 'Yes. In the Expenses tab, hover over any expense row to reveal the edit ✏️ and delete 🗑️ icons on the right.',
  },
  {
    q: 'What does the settlement algorithm do?',
    a: 'It uses a greedy matching approach to pair the largest creditor with the largest debtor, settling as much debt as possible per transaction. This minimises the total number of payments needed.',
  },
  {
    q: 'Can two people pay for the same expense?',
    a: 'Yes! When adding an expense, switch to multi-payer mode and assign partial amounts to each person who contributed to that expense.',
  },
  {
    q: 'How do I share the session with friends?',
    a: 'Click the "Share" button in the top-right of the session page. You can share the full link or just copy the session code (shown under the trip name).',
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden transition-all duration-200',
        open
          ? 'bg-sky-50/80 dark:bg-sky-900/20 border border-sky-200/60 dark:border-sky-800/40'
          : 'bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700/50'
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{q}</span>
        {open ? (
          <ChevronDown size={16} className="text-sky-500 shrink-0 transition-transform" />
        ) : (
          <ChevronRight size={16} className="text-slate-400 shrink-0 transition-transform" />
        )}
      </button>
      {open && (
        <p className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed animate-[fade-in_0.2s_ease-out]">
          {a}
        </p>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function UserGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'guide' | 'faq'>('guide');

  return (
    <>
      {/* ── Trigger Button ── */}
      <button
        onClick={() => setIsOpen(true)}
        id="user-guide-btn"
        title="User Guide — How to use SplitEase"
        aria-label="Open User Guide"
        className="w-10 h-10 rounded-2xl flex items-center justify-center
                   bg-white/70 dark:bg-slate-800/70
                   border border-white/80 dark:border-slate-700/50
                   backdrop-blur-sm shadow-sm
                   text-sky-600 dark:text-sky-400
                   hover:bg-white dark:hover:bg-slate-800
                   hover:border-sky-200 dark:hover:border-sky-700
                   hover:shadow-md hover:scale-105
                   active:scale-95
                   transition-all duration-200"
      >
        <HelpCircle size={18} strokeWidth={2.5} />
      </button>

      {/* ── Modal Overlay ── */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="bottom-sheet-overlay"
            onClick={() => setIsOpen(false)}
          />

          {/* Sheet */}
          <div className="bottom-sheet">
            {/* Handle */}
            <div className="bottom-sheet-handle" />

            {/* Header */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <div>
                <h2 className="font-heading font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle size={20} className="text-sky-500" />
                  How to Use SplitEase
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Split group expenses in seconds — no login needed.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="btn-ghost p-2 rounded-xl"
                aria-label="Close guide"
              >
                <X size={20} />
              </button>
            </div>

            {/* Section Tabs */}
            <div className="px-5 mb-4">
              <div className="flex gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-2xl">
                {(['guide', 'faq'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSection(tab)}
                    className={cn(
                      'flex-1 h-9 text-xs font-black uppercase tracking-widest rounded-xl transition-all',
                      activeSection === tab
                        ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    )}
                  >
                    {tab === 'guide' ? '📖 Step-by-Step' : '❓ FAQs'}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="px-5 pb-8 overflow-y-auto" style={{ maxHeight: '62dvh' }}>
              {activeSection === 'guide' ? (
                <div className="space-y-3 animate-[fade-in_0.2s_ease-out]">
                  {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    return (
                      <div
                        key={i}
                        className="flex gap-4 p-4 rounded-2xl
                                   bg-white/70 dark:bg-slate-800/70
                                   border border-white/80 dark:border-slate-700/50
                                   backdrop-blur-sm shadow-sm"
                      >
                        {/* Step number + icon */}
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center shadow-md',
                              step.color
                            )}
                          >
                            <Icon size={18} className="text-white" strokeWidth={2.5} />
                          </div>
                          <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-heading font-bold text-slate-900 dark:text-slate-100 mb-1 leading-tight">
                            {step.title}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Pro tip */}
                  <div className="mt-2 p-4 rounded-2xl bg-linear-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/15 border border-sky-200/60 dark:border-sky-800/40">
                    <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">
                      💡 <strong>Pro Tip:</strong> Share the session code with your friends so everyone can add and view expenses from their own device — no account needed!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 animate-[fade-in_0.2s_ease-out]">
                  {FAQS.map((faq, i) => (
                    <FAQItem key={i} q={faq.q} a={faq.a} />
                  ))}

                  {/* Footer */}
                  <div className="pt-2 text-center">
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                      Built with ❤️ by the SplitEase Team
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
