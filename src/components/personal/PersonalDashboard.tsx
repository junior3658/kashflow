import React, { useState } from 'react';
import {
  Send,
  Download,
  ArrowLeftRight,
  TrendingUp,
  CreditCard,
  Bot,
  ExternalLink,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Eye,
  EyeOff,
  Wifi,
} from 'lucide-react';
import { Wallet, Transaction } from '../../backend/types';

interface PersonalDashboardProps {
  wallets: Wallet[];
  transactions: Transaction[];
  onOpenSend: () => void;
  onOpenReceive: () => void;
  onOpenExchange: () => void;
  onOpenAI: () => void;
  onSelectTransaction: (tx: Transaction) => void;
  onNavigateToTab: (tab: any) => void;
  isDark?: boolean;
}

export const PersonalDashboard: React.FC<PersonalDashboardProps> = ({
  wallets,
  transactions,
  onOpenSend,
  onOpenReceive,
  onOpenExchange,
  onOpenAI,
  onSelectTransaction,
  onNavigateToTab,
  isDark = false,
}) => {
  const [hideBalances, setHideBalances] = useState(false);

  // Primary USD Wallet
  const usdWallet = wallets.find((w) => w.currency === 'USD') || wallets[0];
  const totalBalanceUsd = usdWallet ? usdWallet.internalAccountingBalance / 100 : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Greeting & Date Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Monday, November 9, 2026 · Kinshasa & Global Desk
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight mt-0.5">
            Good afternoon, Junior.
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Here is your verified financial overview across banking, mobile money, and FX rails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setHideBalances(!hideBalances)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            {hideBalances ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{hideBalances ? 'Show Balances' : 'Mask Balances'}</span>
          </button>

          <button
            onClick={onOpenAI}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-100" />
            <span>KASH AI</span>
          </button>
        </div>
      </div>

      {/* Main KPI Row: Balance & Monthly Activity (White Dominant) + Authentic Colored Mastercard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Total Available Balance & Historical Curve with electric blue accent (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Total Available Balance
                </span>
                <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 dark:text-blue-300 dark:bg-blue-950/70 dark:border-blue-800 px-2 py-0.5 rounded-full">
                  ● Internal Ledger · Prototype
                </span>
              </div>

              {/* Timeframe selector */}
              <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                {(['1m', '3m', '6m', '1y'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setSelectedChartRange(range)}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      selectedChartRange === range
                        ? 'bg-white text-neutral-950 shadow-xs font-bold dark:bg-neutral-800 dark:text-white'
                        : 'hover:text-neutral-950 dark:hover:text-white'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Balance Numerical Display */}
            <div className="mt-3">
              <div className="text-3xl sm:text-4xl font-black text-neutral-950 dark:text-white tracking-tight font-mono tabular-nums">
                {hideBalances ? '••••••••' : `$${totalBalanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                <span className="text-xs sm:text-sm font-sans font-semibold text-blue-600 dark:text-blue-400 ml-2">USD</span>
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Calculated from KASHFLOW's internal prototype ledger. Provider balances are not yet synchronized or verified.
              </div>
            </div>

            {/* Quick Action Buttons with Electric Blue primary */}
            <div className="flex flex-wrap items-center gap-2.5 mt-5">
              <button
                onClick={onOpenSend}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send money</span>
              </button>

              <button
                onClick={onOpenReceive}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-bold border border-neutral-300 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>+ Receive</span>
              </button>

              <button
                onClick={onOpenExchange}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-bold border border-neutral-300 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 transition-colors cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Convert</span>
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <div className="text-sm font-semibold text-neutral-900 dark:text-white">Historical balance trend</div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                Not available yet. KASHFLOW has not migrated transaction history to persistent storage, so no historical trend or growth percentage is reported.
              </p>
            </div>
          </div>

          {/* Monthly Activity KPI from ChatGPT mockup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Monthly activity</div>
              <div className="text-2xl font-black text-neutral-950 dark:text-white font-mono mt-1">
                —
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs">
                <span className="text-neutral-500 dark:text-neutral-400 font-mono">Not calculated</span>
                <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">Persistent history required</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
                  <span>Budget usage</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">64%</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-neutral-300 dark:bg-neutral-700 rounded-full" style={{ width: '0%' }} />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Provider Reconciliation</span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono font-bold">Not available</span>
                </div>
                <div className="text-2xl font-black text-neutral-950 dark:text-white font-mono mt-1">
                  —
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  No verified provider settlement history is available yet.
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('personal_analytics')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 pt-2 cursor-pointer"
              >
                <span>View Full Cash Flow Analytics</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Authentic Colored Mastercard & Quick Transfers (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* THE REAL MASTERCARD (Vibrant Oceanic Blue Gradient + Gold Chip + Red/Yellow Mastercard Logo) */}
          <div className="relative rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 text-white p-6 shadow-xl overflow-hidden group">
            {/* Organic wave lighting sheen */}
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/20 blur-2xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-blue-900/40 blur-2xl pointer-events-none" />

            {/* Top row: Brand & Status & Gold EMV Chip */}
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tracking-wider text-white">KASHFLOW</span>
                  <span className="text-[10px] font-semibold tracking-wider text-blue-100 uppercase">CARD PREVIEW</span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-300/40 px-2 py-0.5 rounded text-[10px] text-emerald-200 font-semibold backdrop-blur-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                  Not issued
                </div>
              </div>

              {/* Gold Metallic EMV Contact Chip */}
              <div className="w-11 h-8 rounded-md bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 border border-amber-300/80 shadow-inner flex flex-col justify-around p-1 relative overflow-hidden">
                <div className="w-full h-px bg-amber-700/60" />
                <div className="w-full h-px bg-amber-700/60" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-5 border border-amber-700/60 rounded-xs" />
              </div>
            </div>

            {/* Balance Middle Section */}
            <div className="my-5 relative z-10">
              <div className="text-[11px] text-blue-100 font-medium uppercase tracking-wider">
                Wallet Balance · Preview
              </div>
              <div className="text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight mt-0.5 flex items-center gap-2">
                <span>{hideBalances ? '••••••••' : `${totalBalanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</span>
                {/* Contactless Waves Symbol */}
                <span className="text-xs text-blue-100/90 rotate-90 inline-block font-mono font-bold tracking-widest">
                  ))))
                </span>
              </div>
            </div>

            {/* Bottom Row: Cardholder, Number, and Official Red & Yellow-Orange Mastercard Logo */}
            <div className="flex items-end justify-between relative z-10 pt-1 text-xs">
              <div>
                <div className="text-[10px] text-blue-100/80 uppercase font-medium">Card status</div>
                <div className="font-bold tracking-wide text-white text-sm">Preview only</div>
              </div>

              <div className="font-mono tracking-widest text-sm text-blue-50 font-bold">
                No card number
              </div>

              {/* Official Mastercard Interlocking Red & Yellow/Orange Circles Logo */}
              <div className="flex items-center -space-x-3 shrink-0" title="Mastercard">
                {/* Red Circle */}
                <div className="w-8 h-8 rounded-full bg-[#EB001B] shadow-sm" />
                {/* Yellow-Orange Circle with blend */}
                <div className="w-8 h-8 rounded-full bg-[#F79E1B] mix-blend-screen opacity-95 shadow-sm" />
              </div>
            </div>
          </div>

          {/* Saved recipient state */}
          <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-neutral-900 dark:text-white font-bold">Saved recipients</span>
              <button
                onClick={onOpenSend}
                className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>New transfer</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              No contacts are linked yet. Enter and verify recipient details when preparing a transfer.
            </p>
          </div>

          {/* AI Advisor Insight Card with Touch of Blue */}
          <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0 border border-blue-100 dark:border-blue-900/40">
              <Bot className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                KASH AI · Advisory
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                No verified spending insights are available until persistent transaction history and provider reconciliation are connected.
              </p>
              <button
                onClick={onOpenAI}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer"
              >
                <span>Ask KASH AI to optimize fees</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Row: Spending Categories + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Categories Bar Breakdown (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Monthly Categories</h3>
            <span className="text-xs font-mono tabular-nums text-neutral-500 dark:text-neutral-400">$3,240 Total</span>
          </div>

          {/* Color bar with touch of blue */}
          <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 flex overflow-hidden">
            <div className="w-[45%] bg-blue-600" title="Utility payments" />
            <div className="w-[30%] bg-neutral-800 dark:bg-neutral-300" title="Groceries" />
            <div className="w-[15%] bg-neutral-500 dark:bg-neutral-500" title="Beauty and health" />
            <div className="w-[10%] bg-neutral-300 dark:bg-neutral-700" title="Others" />
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="text-neutral-700 dark:text-neutral-300">Utility payments</span>
              </div>
              <span className="font-mono text-neutral-900 dark:text-white tabular-nums font-semibold">$1,200.00</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 dark:bg-neutral-300" />
                <span className="text-neutral-700 dark:text-neutral-300">Groceries</span>
              </div>
              <span className="font-mono text-neutral-900 dark:text-white tabular-nums font-semibold">$845.00</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-500" />
                <span className="text-neutral-700 dark:text-neutral-300">Beauty & health</span>
              </div>
              <span className="font-mono text-neutral-900 dark:text-white tabular-nums font-semibold">$400.00</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                <span className="text-neutral-700 dark:text-neutral-300">Software & cloud</span>
              </div>
              <span className="font-mono text-neutral-900 dark:text-white tabular-nums font-semibold">$180.00</span>
            </div>
          </div>
        </div>

        {/* Recent Transactions Table / List (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Recent Transactions</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Activity synchronized across mobile money & PayPal rails</p>
            </div>
            <button
              onClick={() => onNavigateToTab('personal_transactions')}
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {transactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                onClick={() => onSelectTransaction(tx)}
                className="py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 px-2 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-neutral-100 text-neutral-900 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
                  >
                    {tx.type === 'PAYPAL_PAYMENT' ? (
                      <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : tx.type === 'EXCHANGE' ? (
                      <ArrowLeftRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-white">{tx.description}</div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                      <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                      <span>·</span>
                      <span className="uppercase text-[10px] text-neutral-500 font-mono">{tx.provider}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-xs font-mono font-bold tabular-nums ${
                      tx.type === 'PAYPAL_PAYMENT' ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-neutral-900 dark:text-slate-100'
                    }`}
                  >
                    {tx.type === 'PAYPAL_PAYMENT' ? '+' : '-'}
                    ${(tx.amount / 100).toFixed(2)} {tx.currency}
                  </div>
                  <div className="text-[10px]">
                    <span
                      className="px-1.5 py-0.2 rounded font-mono font-semibold text-neutral-700 bg-neutral-100 border border-neutral-200 dark:text-neutral-300 dark:bg-neutral-800 dark:border-neutral-700"
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
