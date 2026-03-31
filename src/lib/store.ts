// ============================================
// ZUSTAND STORE — Session State Management
// Persisted to localStorage & Synced to Supabase
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { Session, Member, Expense, Payer, Split, ExpenseCategory } from './types';
import { supabase } from './supabase';

interface SessionStore {
  // State
  sessions: Record<string, Session>;
  currentSessionId: string | null;

  // Session actions
  createSession: (name: string) => string;
  joinSession: (sessionId: string, memberName: string) => Promise<boolean>;
  fetchSessionFromDb: (sessionId: string) => Promise<boolean>;
  subscribeToSession: (sessionId: string) => () => void;
  setCurrentSession: (sessionId: string | null) => void;
  getCurrentSession: () => Session | null;

  // Member actions
  addMember: (sessionId: string, name: string) => Member;
  removeMember: (sessionId: string, memberId: string) => void;

  // Expense actions
  addExpense: (
    sessionId: string,
    title: string,
    amount: number,
    payers: Payer[],
    splits: Split[],
    category: ExpenseCategory,
    notes: string
  ) => void;
  editExpense: (sessionId: string, expenseId: string, updates: Partial<Omit<Expense, 'id' | 'createdAt'>>) => void;
  deleteExpense: (sessionId: string, expenseId: string) => void;

  // Demo data
  loadDemoData: () => string;
}

const pushToSupabase = async (sessionId: string, session: Session) => {
  if (supabase) {
    try {
      await supabase.from('sessions').upsert({ id: sessionId, data: session as any });
    } catch (err) {
      console.error("Supabase sync failed:", err);
    }
  }
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessions: {},
      currentSessionId: null,

      createSession: (name: string) => {
        const id = nanoid(10);
        const session: Session = {
          id,
          name: name || 'Untitled Session',
          createdAt: new Date().toISOString(),
          members: [],
          expenses: [],
        };
        set((state) => ({
          sessions: { ...state.sessions, [id]: session },
          currentSessionId: id,
        }));
        pushToSupabase(id, session);
        return id;
      },

      fetchSessionFromDb: async (sessionId: string) => {
        if (!supabase) return false;
        try {
          const { data } = await supabase.from('sessions').select('data').eq('id', sessionId).single();
          if (data && data.data) {
            set((state) => ({
              sessions: { ...state.sessions, [sessionId]: data.data },
            }));
            return true;
          }
        } catch (e) {
          console.error("Failed to fetch session from Supabase", e);
        }
        return false;
      },

      subscribeToSession: (sessionId: string) => {
        if (!supabase) return () => {};
        
        const channel = supabase.channel(`room-${sessionId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, (payload) => {
            const newPayload = payload.new as Record<string, any>;
            if (newPayload && newPayload.data) {
              set((state) => {
                // Only write if there's actually a session change to avoid re-renders
                if (JSON.stringify(state.sessions[sessionId]) !== JSON.stringify(newPayload.data)) {
                  return { sessions: { ...state.sessions, [sessionId]: newPayload.data as Session } };
                }
                return state;
              });
            }
          })
          .subscribe();

        return () => {
          supabase?.removeChannel(channel);
        };
      },

      joinSession: async (sessionId: string, memberName: string) => {
        let session = get().sessions[sessionId];

        // Fetch from DB if not local
        if (!session && supabase) {
          await get().fetchSessionFromDb(sessionId);
          session = get().sessions[sessionId];
        }

        if (!session) return false;

        const existingMember = session.members.find(
          (m) => m.name.toLowerCase() === memberName.toLowerCase()
        );
        if (existingMember) {
          set({ currentSessionId: sessionId });
          return true;
        }

        const newMember: Member = {
          id: nanoid(8),
          name: memberName,
        };

        const updatedSession = { ...session, members: [...session.members, newMember] };

        set((state) => ({
          sessions: { ...state.sessions, [sessionId]: updatedSession },
          currentSessionId: sessionId,
        }));
        
        pushToSupabase(sessionId, updatedSession);
        return true;
      },

      setCurrentSession: (sessionId) => {
        set({ currentSessionId: sessionId });
      },

      getCurrentSession: () => {
        const state = get();
        if (!state.currentSessionId) return null;
        return state.sessions[state.currentSessionId] || null;
      },

      addMember: (sessionId: string, name: string) => {
        const member: Member = {
          id: nanoid(8),
          name,
        };
        let updatedSession: Session | null = null;
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;
          updatedSession = { ...session, members: [...session.members, member] };
          return {
            sessions: { ...state.sessions, [sessionId]: updatedSession },
          };
        });
        if (updatedSession) pushToSupabase(sessionId, updatedSession);
        return member;
      },

      removeMember: (sessionId: string, memberId: string) => {
        let updatedSession: Session | null = null;
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;
          updatedSession = { ...session, members: session.members.filter((m) => m.id !== memberId) };
          return {
            sessions: { ...state.sessions, [sessionId]: updatedSession },
          };
        });
        if (updatedSession) pushToSupabase(sessionId, updatedSession);
      },

      addExpense: (sessionId, title, amount, payers, splits, category, notes) => {
        let updatedSession: Session | null = null;
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;
          const expense: Expense = {
            id: nanoid(8), title, amount, payers, splits, category, notes, createdAt: new Date().toISOString(),
          };
          updatedSession = { ...session, expenses: [expense, ...session.expenses] };
          return {
            sessions: { ...state.sessions, [sessionId]: updatedSession },
          };
        });
        if (updatedSession) pushToSupabase(sessionId, updatedSession);
      },

      editExpense: (sessionId, expenseId, updates) => {
        let updatedSession: Session | null = null;
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;
          updatedSession = {
            ...session,
            expenses: session.expenses.map((e) => e.id === expenseId ? { ...e, ...updates } : e),
          };
          return {
            sessions: { ...state.sessions, [sessionId]: updatedSession },
          };
        });
        if (updatedSession) pushToSupabase(sessionId, updatedSession);
      },

      deleteExpense: (sessionId, expenseId) => {
        let updatedSession: Session | null = null;
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;
          updatedSession = {
            ...session,
            expenses: session.expenses.filter((e) => e.id !== expenseId),
          };
          return {
            sessions: { ...state.sessions, [sessionId]: updatedSession },
          };
        });
        if (updatedSession) pushToSupabase(sessionId, updatedSession);
      },

      loadDemoData: () => {
        const sessionId = nanoid(10);
        const members: Member[] = [
          { id: 'vishal', name: 'Vishal' },
          { id: 'rahul', name: 'Rahul' },
          { id: 'aman', name: 'Aman' },
          { id: 'priya', name: 'Priya' },
          { id: 'neha', name: 'Neha' },
        ];
        const allMemberIds = members.map((m) => m.id);

        const equalSplit = (amount: number): Split[] =>
          allMemberIds.map((id) => ({ memberId: id, amount: Math.round((amount / 5) * 100) / 100 }));

        const selectedSplit = (amount: number, memberIds: string[]): Split[] =>
          memberIds.map((id) => ({
            memberId: id,
            amount: Math.round((amount / memberIds.length) * 100) / 100,
          }));

        const expenses: Expense[] = [
          {
            id: nanoid(8),
            title: 'Flight Tickets',
            amount: 25000,
            payers: [{ memberId: 'vishal', amount: 25000 }],
            splits: equalSplit(25000),
            category: 'tickets',
            notes: 'Round trip Delhi to Goa',
            createdAt: '2026-03-25T10:00:00Z',
          },
          {
            id: nanoid(8),
            title: 'Beach Resort (3 nights)',
            amount: 18000,
            payers: [{ memberId: 'rahul', amount: 18000 }],
            splits: equalSplit(18000),
            category: 'stay',
            notes: 'Calangute Beach Resort',
            createdAt: '2026-03-25T14:00:00Z',
          },
          {
            id: nanoid(8),
            title: 'Dinner at Fisherman\'s Wharf',
            amount: 4500,
            payers: [{ memberId: 'aman', amount: 4500 }],
            splits: equalSplit(4500),
            category: 'food',
            notes: 'Seafood dinner, amazing vibes!',
            createdAt: '2026-03-26T20:00:00Z',
          },
          {
            id: nanoid(8),
            title: 'Scooter Rentals',
            amount: 3000,
            payers: [{ memberId: 'priya', amount: 3000 }],
            splits: selectedSplit(3000, ['vishal', 'rahul', 'priya']),
            category: 'transport',
            notes: '3 scooters for 2 days',
            createdAt: '2026-03-26T09:00:00Z',
          },
          {
            id: nanoid(8),
            title: 'Water Sports',
            amount: 6000,
            payers: [
              { memberId: 'neha', amount: 3000 },
              { memberId: 'vishal', amount: 3000 },
            ],
            splits: selectedSplit(6000, ['vishal', 'aman', 'neha', 'rahul']),
            category: 'activities',
            notes: 'Parasailing + Jet ski',
            createdAt: '2026-03-27T11:00:00Z',
          },
          {
            id: nanoid(8),
            title: 'Saturday Night Club',
            amount: 8000,
            payers: [{ memberId: 'aman', amount: 8000 }],
            splits: equalSplit(8000),
            category: 'drinks',
            notes: 'Club LPK, epic night 🎉',
            createdAt: '2026-03-27T23:00:00Z',
          },
          {
            id: nanoid(8),
            title: 'Souvenirs & Shopping',
            amount: 3500,
            payers: [{ memberId: 'neha', amount: 3500 }],
            splits: selectedSplit(3500, ['priya', 'neha']),
            category: 'shopping',
            notes: 'Anjuna Flea Market',
            createdAt: '2026-03-28T16:00:00Z',
          },
          {
            id: nanoid(8),
            title: 'Breakfast & Lunch Day 2',
            amount: 2800,
            payers: [{ memberId: 'priya', amount: 2800 }],
            splits: equalSplit(2800),
            category: 'food',
            notes: 'Cafe Lilliput + Britto\'s',
            createdAt: '2026-03-27T08:00:00Z',
          },
          {
            id: nanoid(8),
            title: 'Cab to Airport',
            amount: 2200,
            payers: [{ memberId: 'rahul', amount: 2200 }],
            splits: equalSplit(2200),
            category: 'transport',
            notes: 'Shared cab back',
            createdAt: '2026-03-29T06:00:00Z',
          },
          {
            id: nanoid(8),
            title: 'Spice Plantation Tour',
            amount: 2500,
            payers: [{ memberId: 'vishal', amount: 2500 }],
            splits: selectedSplit(2500, ['vishal', 'priya', 'neha', 'aman']),
            category: 'activities',
            notes: 'Tropical Spice Plantation',
            createdAt: '2026-03-28T10:00:00Z',
          },
        ];

        const session: Session = {
          id: sessionId,
          name: '🏖️ Goa Trip 2026',
          createdAt: '2026-03-25T08:00:00Z',
          members,
          expenses,
        };

        set((state) => ({
          sessions: { ...state.sessions, [sessionId]: session },
          currentSessionId: sessionId,
        }));

        return sessionId;
      },
    }),
    {
      name: 'splitwise-storage',
    }
  )
);
