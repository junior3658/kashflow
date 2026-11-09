import React from 'react';
import {
  Building2,
  TrendingUp,
  Download,
  Send,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  FileText,
  CreditCard,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Wallet, Transaction } from '../../backend/types';

interface BusinessDashboardProps {
  businessWallets: Wallet[];
  transactions: Transaction[];
  onOpenSend: () => void;
  onOpenReceive: () => void;
  onNavigateToTab: (tab: any) => void;
}

export const BusinessDashboard: React.FC<BusinessDashboardProps> = ({
  businessWallets,
  transactions,
  onOpenSend,
  onOpenReceive,
  onNavigateToTab,
}) => {
  const primaryWallet = businessWallets[0];
  const treasuryBalance = primaryWallet ? primaryWallet.internalAccountingBalance / 100 : 84250.0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 dark:text-blue-300 dark:bg-blue-950/70 dark:border-blue-800 px-2 py-0.5 rounded-full">
              Tax ID: CD-LSH-2026-B-9982
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">· Multi-Tenant Isolated Treasury</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight mt-1">
            Commercial Treasury Hub
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Corporate operations center for B2B invoice collection, batch payroll payouts, and real-time ledger settlement.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigateToTab('business_reconciliation')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Reconciliation</span>
          </button>

          <button
            onClick={onOpenSend}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>New Payout</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip (Crisp White Dominant Cards with Blue Accents) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Total Treasury Balance
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white font-mono tabular-nums mt-1.5">
            ${treasuryBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-1 font-mono font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+14.2% monthly liquidity</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Inbound Collections (30D)
          </span>
          <div className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white font-mono tabular-nums mt-1.5">
            $142,600.00
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Across PayPal & Shwary Rails
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            B2C Payouts Disbursed
          </span>
          <div className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white font-mono tabular-nums mt-1.5">
            $58,350.00
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Instant mobile money payroll</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Reconciliation Balance
          </span>
          <div className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white font-mono tabular-nums mt-1.5">
            100.0%
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero variance detected</span>
          </div>
        </div>
      </div>

      {/* Main Corporate Operations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Commercial Transactions & Liquidity Trend (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Treasury Liquidity Graph (White dominant with Electric Blue Curve) */}
          <div className="bg-white dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Commercial Treasury Flow</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Net corporate liquidity trend across all business entities</p>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-2 py-0.5 rounded-md">
                +22.8% Inflow Trend
              </span>
            </div>

            <div className="h-32 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="bizBlueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,80 Q 80,30 160,50 T 320,30 T 480,15 L 500,10 L 500,120 L 0,120 Z"
                  fill="url(#bizBlueGradient)"
                />
                <path
                  d="M 0,80 Q 80,30 160,50 T 320,30 T 480,15 L 500,10"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="500" cy="10" r="5" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
              </svg>
            </div>
            <div className="flex justify-between text-[11px] font-mono text-neutral-500 dark:text-neutral-400 mt-2">
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
              <span>Oct</span>
              <span>Nov</span>
            </div>
          </div>

          {/* Commercial Settlements List */}
          <div className="bg-white dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Commercial Settlements</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">Tenant Org: org_kashflow_corp</p>
              </div>
              <button
                onClick={() => onNavigateToTab('personal_transactions')}
                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Activity</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="py-3.5 flex items-center justify-between text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800/40 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
                      {tx.type === 'PAYPAL_PAYMENT' ? (
                        <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-neutral-900 dark:text-white">{tx.description}</div>
                      <div className="text-neutral-500 dark:text-neutral-400 font-mono text-[11px]">
                        {tx.id} · <span className="uppercase text-blue-600 dark:text-blue-400 font-semibold">{tx.provider}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-neutral-900 dark:text-white tabular-nums">
                      ${(tx.amount / 100).toFixed(2)} {tx.currency}
                    </div>
                    <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 dark:text-blue-300 dark:bg-blue-950/70 dark:border-blue-800 px-2 py-0.5 rounded-full font-mono font-semibold">
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Corporate Actions & Corporate Card (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Corporate Platinum Card (Deep Midnight with Electric Blue Sheen) */}
          <div className="rounded-3xl bg-gradient-to-tr from-neutral-950 via-slate-900 to-blue-950 border border-neutral-800 p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />
            
            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-xs font-black tracking-widest text-white uppercase">KASHFLOW COMMERCIAL</span>
                <div className="text-[10px] text-blue-300 font-mono mt-0.5">Corporate Treasury Platinum</div>
              </div>

              {/* Gold Chip */}
              <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 border border-amber-300/80 shadow-inner flex flex-col justify-around p-1 relative overflow-hidden">
                <div className="w-full h-px bg-amber-700/60" />
                <div className="w-full h-px bg-amber-700/60" />
              </div>
            </div>

            <div className="my-5 relative z-10">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Treasury Card Balance</span>
              <div className="text-2xl font-black font-mono tracking-tight text-white mt-0.5">
                ${treasuryBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex items-end justify-between relative z-10 text-xs">
              <div>
                <div className="text-[10px] text-neutral-400 uppercase">Entity</div>
                <div className="font-bold text-white">Kashflow Corp SARL</div>
              </div>
              <div className="font-mono text-sm tracking-widest font-bold text-blue-100">
                •••• 4022
              </div>
            </div>
          </div>

          {/* Corporate Quick Actions (Crisp White Card with Blue Accents) */}
          <div className="bg-white dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 space-y-3 shadow-xs">
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Corporate Actions</h4>
            
            <button
              onClick={onOpenSend}
              className="w-full py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Initiate B2C Batch Payout</span>
            </button>

            <button
              onClick={onOpenReceive}
              className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Generate B2B Invoice Link</span>
            </button>

            <button
              onClick={() => onNavigateToTab('business_team')}
              className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Manage Team Permissions</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
