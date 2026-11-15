import React from 'react';
import {
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  Bot,
  Building2,
  ShieldCheck,
  Send,
  Download,
  PieChart,
  Layers,
  Sparkles,
  RefreshCw,
  Search,
  Bell,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react';

export type NavTab =
  | 'personal_dashboard'
  | 'personal_wallets'
  | 'personal_transactions'
  | 'personal_exchange'
  | 'personal_crypto'
  | 'personal_analytics'
  | 'business_dashboard'
  | 'business_team'
  | 'business_reconciliation'
  | 'admin_dashboard'
  | 'kash_ai';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  portalMode: 'personal' | 'business' | 'admin';
  onOpenSend: () => void;
  onOpenReceive: () => void;
  onOpenAI: () => void;
  unreadCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  portalMode,
  onOpenSend,
  onOpenReceive,
  onOpenAI,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <>
      {/* TOP BAR CONTRACT: Zone 1 (Brand) - Zone 2 (4-5 Nav Links) - Zone 3 (Primary Action + Theme Toggle) */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-200 dark:border-neutral-800/80 bg-white/95 dark:bg-neutral-950/90 backdrop-blur-md transition-colors duration-150">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          
          {/* Zone 1: Single-element brand wordmark (Monochrome Black & White) */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => onSelectTab(portalMode === 'personal' ? 'personal_dashboard' : portalMode === 'business' ? 'business_dashboard' : 'admin_dashboard')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-black text-lg shadow-sm transition-transform group-hover:scale-105">
                K
              </div>
              <div className="leading-tight">
                <div className="text-base font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-1.5">
                  KASHFLOW
                  <span className="text-[10px] font-mono font-semibold text-neutral-700 bg-neutral-100 border border-neutral-300 dark:text-neutral-300 dark:bg-neutral-900 dark:border-neutral-700 px-1.5 py-0.2 rounded">
                    OS
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-normal">
                  Financial Orchestration
                </div>
              </div>
            </button>


          </div>

          {/* Zone 2: Navigation Links (Clean single-line prose) */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {portalMode === 'personal' && (
              <>
                <button
                  onClick={() => onSelectTab('personal_dashboard')}
                  className={`hover:text-neutral-950 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer ${currentTab === 'personal_dashboard' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}
                >
                  Overview
                </button>
                <button
                  onClick={() => onSelectTab('personal_wallets')}
                  className={`hover:text-neutral-950 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer ${currentTab === 'personal_wallets' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}
                >
                  Wallets & Balances
                </button>
                <button
                  onClick={() => onSelectTab('personal_transactions')}
                  className={`hover:text-neutral-950 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer ${currentTab === 'personal_transactions' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}
                >
                  Transactions
                </button>
                <button
                  onClick={() => onSelectTab('personal_exchange')}
                  className={`hover:text-neutral-950 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer ${currentTab === 'personal_exchange' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}
                >
                  FX Exchange
                </button>
                <button
                  onClick={() => onSelectTab('personal_crypto')}
                  className={`hover:text-neutral-950 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer ${currentTab === 'personal_crypto' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}
                >
                  Crypto Sim
                </button>
                <button
                  onClick={() => onSelectTab('personal_analytics')}
                  className={`hover:text-neutral-950 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer ${currentTab === 'personal_analytics' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}
                >
                  Analytics
                </button>
              </>
            )}

            {portalMode === 'business' && (
              <>
                <button
                  onClick={() => onSelectTab('business_dashboard')}
                  className={`hover:text-neutral-950 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer ${currentTab === 'business_dashboard' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}
                >
                  Treasury Overview
                </button>
                <button
                  onClick={() => onSelectTab('personal_transactions')}
                  className={`hover:text-neutral-950 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer ${currentTab === 'personal_transactions' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}
                >
                  Payments & Payouts
                </button>
                <button
                  onClick={() => onSelectTab('business_team')}
                  className={`hover:text-neutral-950 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer ${currentTab === 'business_team' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}
                >
                  Team & RBAC
                </button>
                <button
                  onClick={() => onSelectTab('business_reconciliation')}
                  className={`hover:text-neutral-950 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer ${currentTab === 'business_reconciliation' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}
                >
                  Reconciliation
                </button>
              </>
            )}

            {portalMode === 'admin' && (
              <>
                <button
                  onClick={() => onSelectTab('admin_dashboard')}
                  className="hover:text-neutral-950 dark:hover:text-white text-blue-600 dark:text-blue-400 font-bold transition-colors whitespace-nowrap cursor-pointer"
                >
                  Security Audit Console & Invariants
                </button>
              </>
            )}
          </nav>

          {/* Zone 3: Actions + Theme Switcher + KASH AI Copilot Launch Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenSend}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
              <span>Send</span>
            </button>

            <button
              onClick={onOpenReceive}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
              <span>Receive / PayPal</span>
            </button>

            <button
              onClick={onOpenAI}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-100" />
              <span className="hidden sm:inline">KASH AI</span>
              <span className="sm:hidden">AI</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-neutral-700 hover:text-neutral-950 bg-neutral-100 border border-neutral-200 dark:text-neutral-300 dark:bg-neutral-900 dark:border-neutral-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {portalMode === 'personal' && [
                ['personal_dashboard', 'Overview'], ['personal_wallets', 'Wallets'], ['personal_transactions', 'Transactions'],
                ['personal_exchange', 'FX Exchange'], ['personal_crypto', 'Crypto simulation'], ['personal_analytics', 'Analytics'],
              ].map(([tab, label]) => <button key={tab} onClick={() => { onSelectTab(tab as NavTab); setMobileMenuOpen(false); }} className="rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-3 text-left font-medium text-neutral-200">{label}</button>)}
              {portalMode === 'business' && [
                ['business_dashboard', 'Treasury overview'], ['personal_transactions', 'Payments & payouts'],
                ['business_team', 'Team & access'], ['business_reconciliation', 'Reconciliation'],
              ].map(([tab, label]) => <button key={tab} onClick={() => { onSelectTab(tab as NavTab); setMobileMenuOpen(false); }} className="rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-3 text-left font-medium text-neutral-200">{label}</button>)}
              {portalMode === 'admin' && <button onClick={() => { onSelectTab('admin_dashboard'); setMobileMenuOpen(false); }} className="rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-3 text-left font-medium text-neutral-200">Security audit</button>}
            </div>/div>
          </div>
        )}
      </header>

      {/* Role-specific mobile navigation: never expose another account's workspace. */}
      {portalMode === 'personal' && <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/[.08] bg-[#080a0c]/95 backdrop-blur-xl px-2 py-2 flex items-center justify-around">
        <button onClick={() => onSelectTab('personal_dashboard')} className="flex flex-col items-center gap-1 text-[10px] text-neutral-300"><Wallet className="h-5 w-5"/><span>Home</span></button>
        <button onClick={() => onSelectTab('personal_transactions')} className="flex flex-col items-center gap-1 text-[10px] text-neutral-300"><Layers className="h-5 w-5"/><span>Activity</span></button>
        <button onClick={onOpenSend} className="flex h-12 w-12 -mt-5 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"><Send className="h-5 w-5"/></button>
        <button onClick={() => onSelectTab('personal_exchange')} className="flex flex-col items-center gap-1 text-[10px] text-neutral-300"><ArrowLeftRight className="h-5 w-5"/><span>Convert</span></button>
        <button onClick={onOpenAI} className="flex flex-col items-center gap-1 text-[10px] text-neutral-300"><Bot className="h-5 w-5"/><span>KASH AI</span></button>
      </nav>}
      {portalMode === 'business' && <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/[.08] bg-[#080a0c]/95 backdrop-blur-xl px-2 py-2 flex items-center justify-around">
        <button onClick={() => onSelectTab('business_dashboard')} className="flex flex-col items-center gap-1 text-[10px] text-neutral-300"><Wallet className="h-5 w-5"/><span>Treasury</span></button>
        <button onClick={() => onSelectTab('personal_transactions')} className="flex flex-col items-center gap-1 text-[10px] text-neutral-300"><Layers className="h-5 w-5"/><span>Payments</span></button>
        <button onClick={onOpenSend} className="flex h-12 w-12 -mt-5 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"><Send className="h-5 w-5"/></button>
        <button onClick={() => onSelectTab('business_reconciliation')} className="flex flex-col items-center gap-1 text-[10px] text-neutral-300"><RefreshCw className="h-5 w-5"/><span>Reconcile</span></button>
        <button onClick={onOpenAI} className="flex flex-col items-center gap-1 text-[10px] text-neutral-300"><Bot className="h-5 w-5"/><span>KASH AI</span></button>
      </nav>}
      {portalMode === 'admin' && <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/[.08] bg-[#080a0c]/95 backdrop-blur-xl px-2 py-2 flex items-center justify-around">
        <button onClick={() => onSelectTab('admin_dashboard')} className="flex flex-col items-center gap-1 text-[10px] text-neutral-300"><ShieldCheck className="h-5 w-5"/><span>Audit</span></button>
        <button onClick={onOpenAI} className="flex flex-col items-center gap-1 text-[10px] text-neutral-300"><Bot className="h-5 w-5"/><span>KASH AI</span></button>
      </nav>}
    </>
  );
};
