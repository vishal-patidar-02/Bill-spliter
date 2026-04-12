# SplitEase ✨ — Smart Group Expense Splitter

The ultimate group outing expense manager. Focus on your trip, let us handle the math.

Built for speed, SplitEase is a **no-login**, **hybrid-local**, and **cloud-synced** group expense manager that handles everyone from single travelers to large squads.

---

## 🚀 Mission
SplitEase is a lightweight, mobile-first web app that simplifies group expenses and provides a **smart settlement** plan with the minimum number of transactions using a custom greedy matching algorithm.

## ✨ Key Features (Pro Tier)
- **Multi-Payer Support (NEW)**: One expense, multiple contributors. Perfect for large hotel bills or shared car rentals where several people pitch in different amounts.
- **Receipt OCR Import (NEW)**: Upload a receipt image, auto-extract line items, review assignments, and convert directly into split-ready expenses.
- **AI Receipt Understanding (NEW)**: Free Groq AI extraction improves accuracy for messy receipts and avoids treating payment summary rows as expense items.
- **Global WebGL Background**: A premium, centralized WebGL-powered wave gradient that stays consistent and fluid across all pages (Home & Session) without glitches.
- **Cloud Sync (Supabase)**: Your data is automatically backed up to the cloud and synced across devices in real-time.
- **Real-time Collaboration**: See changes from other group members instantly without reloading.
- **Smart Settlement**: High-performance algorithm that minimizes bank transfers using greedy graph matching.
- **Flexible Splits**: Support for both **Equal** and **Custom** amount splits per person.
- **WhatsApp Export**: One-tap share of final settlements with your group.
- **PDF Export**: Generate professional expense reports with full itemization.
- **Ultra-Modern UI**: Clean card-based responsive design with advanced glassmorphism, depth layers, and smooth micro-animations.

## 🧠 Smart Settlement Algorithm
SplitEase uses a **greedy matching approach** based on graph theory to simplify complex group debts:

1. **Calculate Balances**: Compute the net position for each member across all expenses:
   - `Position = Sum(All contributions as Payer) - Sum(All shares as Split participant)`.
2. **Classify**: Separate members into "Creditors" (+ve balance) and "Debtors" (-ve balance).
3. **Sort**: Order both lists by magnitude (largest amounts first) to maximize debt clearing per transaction.
4. **Iterative Matching**:
   - Pair the largest creditor with the largest debtor.
   - Settle the absolute minimum of the two balances.
   - Update both members' outstanding positions and repeat until all debts approach zero.

This ensures you spend less time transferring money and more time enjoying your trip! 🌊

## 🛠️ Tech Stack
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Backend/Database**: [Supabase](https://supabase.com/) (PostgreSQL + Real-time Sync)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (Persisted in LocalStorage)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + Custom Keyframe Animations
- **Graphics**: Custom WebGL / MiniGl for route-wide animated backgrounds
- **Icons**: [Lucide React](https://lucide.dev/)
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF) + [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

## 🏗️ Project Architecture
- `src/app/`: Next.js App Router for dynamic session management and layouts.
- `src/components/`: Premium UI components (MembersCard, ExpenseListCard, SettlementCard, etc.).
- `src/components/ui/`: Low-level design system components and WebGL controllers.
- `src/lib/store.ts`: Central source of truth powered by Zustand, bridging local-first performance with Supabase cloud-sync.
- `src/lib/settlement.ts`: Core financial logic for calculating complex balances and transactions.
- `src/lib/types.ts`: Strongly typed data models ensuring consistency across the stack.

## 📦 Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure Environment:
   Create a `.env.local` file with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   OCR_SPACE_API_KEY=your_ocr_space_key_optional
   GROQ_API_KEY=your_groq_api_key_optional
   GROQ_MODEL=llama-3.3-70b-versatile
   ```
   Notes:
   - `OCR_SPACE_API_KEY` is optional. If missing, the app uses the OCR.space trial key (`helloworld`) with lower reliability.
   - `GROQ_API_KEY` is optional but recommended for high-quality receipt parsing (completely free).
   - If `GROQ_API_KEY` is missing, the app falls back to rule-based parsing.
   - When OCR fails, the app opens a manual review fallback draft so you can still import the receipt.

## AI Receipt Setup (Groq — Free & No Quota Limits)
1. Go to [Groq Console](https://console.groq.com).
2. Sign up for free account.
3. Create an API key in Settings.
4. Add to `.env.local`:
   ```env
   GROQ_API_KEY=your_groq_api_key
   GROQ_MODEL=llama-3.3-70b-versatile
   ```
5. Restart your dev server after updating env variables.
6. Upload a receipt and verify the review modal line items no longer include rows like Total, Amount Paid, UPI, Card, or Cash.

## Troubleshooting AI Parsing
- If Groq AI is not being used, check that `GROQ_API_KEY` is set in `.env.local` and restart dev server.
- If the model returns invalid JSON, the route will fall back automatically; check warning text in the review modal.
- Keep manual review enabled because no parser is 100% perfect for all receipt formats.
- Free Groq tier has generous limits; if you hit any limits, consider upgrading their paid plan.
3. Run development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) and start your first session!

---
Built with ❤️ by the **SplitEase Team** (AI-Powered Coordination)
