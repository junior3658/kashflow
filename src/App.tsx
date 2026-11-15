/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navigation, NavTab } from './components/Navigation';
import { PersonalDashboard } from './components/personal/PersonalDashboard';
import { WalletsView } from './components/personal/WalletsView';
import { TransactionsView } from './components/personal/TransactionsView';
import { CurrencyExchangeView } from './components/personal/CurrencyExchangeView';
import { CryptoSimulationView } from './components/personal/CryptoSimulationView';
import { AnalyticsView } from './components/personal/AnalyticsView';
import { BusinessDashboard } from './components/business/BusinessDashboard';
import { TeamManagement } from './components/business/TeamManagement';
import { ReconciliationView } from './components/business/ReconciliationView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SendMoneyModal } from './components/personal/SendMoneyModal';
import { ReceiveMoneyModal } from './components/personal/ReceiveMoneyModal';
import { KashAIChat } from './components/ai/KashAIChat';
import { Wallet, Transaction, UserRole } from './backend/types';
import { LandingPage } from './components/landing/LandingPage';
import { AuthPage } from './components/auth/AuthPage';

export default function App() {
  const [authStatus, setAuthStatus] = useState<'checking' | 'guest' | 'authenticated'>('checking');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [authView, setAuthView] = useState<'landing' | 'login' | 'register'>('landing');
  const [portalMode, setPortalMode] = useState<'personal' | 'business' | 'admin'>('personal');
  const [currentTab, setCurrentTab] = useState<NavTab>('personal_dashboard');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [businessWallets, setBusinessWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);

  // KASHFLOW uses one consistent near-black workspace theme across every authenticated screen.
  const isDark = true;

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
    localStorage.setItem('kashflow_theme', 'dark');
  }, []);

  useEffect(() => {
    fetch('/api/v1/auth/me', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) {
          setCurrentUserRole(null);
          setAuthStatus('guest');
          return;
        }
        const data = await response.json();
        setCurrentUserRole(data.user?.role ?? 'PERSONAL_USER');
        setPortalMode(data.user?.role === 'PLATFORM_ADMIN' ? 'admin' : data.user?.role === 'BUSINESS_OWNER' || data.user?.role === 'BUSINESS_ADMIN' || data.user?.role === 'BUSINESS_EMPLOYEE' ? 'business' : 'personal');
        setCurrentTab(data.user?.role === 'PLATFORM_ADMIN' ? 'admin_dashboard' : data.user?.role === 'BUSINESS_OWNER' || data.user?.role === 'BUSINESS_ADMIN' || data.user?.role === 'BUSINESS_EMPLOYEE' ? 'business_dashboard' : 'personal_dashboard');
        setAuthStatus('authenticated');
      })
      .catch(() => {
        setCurrentUserRole(null);
        setAuthStatus('guest');
      });
  }, []);

  // Fetch Wallets & Transactions
  const refreshData = async () => {
    try {
      const walletType = portalMode === 'business' ? 'BUSINESS' : 'PERSONAL';
      const [walletRes, txRes] = await Promise.all([
        fetch(`/api/v1/wallets?type=${walletType}`, { credentials: 'include' }),
        fetch('/api/v1/transactions', { credentials: 'include' }),
      ]);

      if (!walletRes.ok || !txRes.ok) throw new Error('Unable to load the authenticated workspace data.');
      const walletData = await walletRes.json();
      const txData = await txRes.json();

      if (portalMode === 'business') {
        setBusinessWallets(walletData.wallets || []);
        setWallets([]);
      } else {
        setWallets(walletData.wallets || []);
        setBusinessWallets([]);
      }
      setTransactions(txData.transactions || []);
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  useEffect(() => {
    if (authStatus === 'authenticated') refreshData();
  }, [authStatus]);

  if (authStatus === 'checking') {
    return <div className="grid min-h-screen place-items-center bg-[#061c19] text-emerald-100">KASHFLOW · Loading secure workspace…</div>;
  }
  if (authStatus === 'guest') {
    if (authView === 'landing') return <LandingPage onSignIn={() => setAuthView('login')} onGetStarted={() => setAuthView('register')} />;
    return <AuthPage initialMode={authView} onBack={() => setAuthView('landing')} onAuthenticated={async () => { const response = await fetch('/api/v1/auth/me', { credentials: 'include' }); const data = response.ok ? await response.json() : null; const role = data?.user?.role ?? 'PERSONAL_USER'; const isBusiness = ['BUSINESS_OWNER', 'BUSINESS_ADMIN', 'BUSINESS_EMPLOYEE'].includes(role); const isAdmin = role === 'PLATFORM_ADMIN'; setCurrentUserRole(role); setPortalMode(isAdmin ? 'admin' : isBusiness ? 'business' : 'personal'); setCurrentTab(isAdmin ? 'admin_dashboard' : isBusiness ? 'business_dashboard' : 'personal_dashboard'); setAuthStatus('authenticated'); setAuthView('landing'); }} />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-150">
      {/* Universal Navigation with Theme Switcher */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => {
          const isBusiness = ['BUSINESS_OWNER', 'BUSINESS_ADMIN', 'BUSINESS_EMPLOYEE'].includes(currentUserRole || '');
          const isAdmin = currentUserRole === 'PLATFORM_ADMIN';
          const personalTabs: NavTab[] = ['personal_dashboard', 'personal_wallets', 'personal_transactions', 'personal_exchange', 'personal_crypto', 'personal_analytics', 'kash_ai'];
          const businessTabs: NavTab[] = ['business_dashboard', 'business_team', 'business_reconciliation', 'personal_transactions', 'kash_ai'];
          const allowed = isAdmin ? ['admin_dashboard', 'kash_ai'] : isBusiness ? businessTabs : personalTabs;
          if (allowed.includes(tab)) setCurrentTab(tab);
        }}
        portalMode={portalMode}
        onOpenSend={() => setIsSendOpen(true)}
        onOpenReceive={() => setIsReceiveOpen(true)}
        onOpenAI={() => setIsAIOpen(true)}
      />

      {/* Main Viewport Container (1440px max width desktop baseline) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 sm:pb-8">
        {currentTab === 'personal_dashboard' && (
          <PersonalDashboard
            wallets={wallets}
            transactions={transactions}
            onOpenSend={() => setIsSendOpen(true)}
            onOpenReceive={() => setIsReceiveOpen(true)}
            onOpenExchange={() => setCurrentTab('personal_exchange')}
            onOpenAI={() => setIsAIOpen(true)}
            onSelectTransaction={(tx) => setSelectedTransaction(tx)}
            onNavigateToTab={setCurrentTab}
            isDark={isDark}
          />
        )}

        {currentTab === 'personal_wallets' && (
          <WalletsView
            wallets={wallets}
            onOpenSend={() => setIsSendOpen(true)}
            onOpenReceive={() => setIsReceiveOpen(true)}
            onOpenExchange={() => setCurrentTab('personal_exchange')}
          />
        )}

        {currentTab === 'personal_transactions' && (
          <TransactionsView
            transactions={transactions}
            onSelectTransaction={(tx) => setSelectedTransaction(tx)}
            selectedTransaction={selectedTransaction}
            onCloseDrawer={() => setSelectedTransaction(null)}
          />
        )}

        {currentTab === 'personal_exchange' && (
          <CurrencyExchangeView
            wallets={wallets}
          />
        )}

        {currentTab === 'personal_crypto' && <CryptoSimulationView />}

        {currentTab === 'personal_analytics' && <AnalyticsView />}

        {currentTab === 'business_dashboard' && (
          <BusinessDashboard
            businessWallets={businessWallets}
            transactions={transactions}
            onOpenSend={() => setIsSendOpen(true)}
            onOpenReceive={() => setIsReceiveOpen(true)}
            onNavigateToTab={setCurrentTab}
          />
        )}

        {currentTab === 'business_team' && (
          businessWallets.length > 0
            ? <TeamManagement />
            : <BusinessDashboard
                businessWallets={businessWallets}
                transactions={transactions}
                onOpenSend={() => setIsSendOpen(true)}
                onOpenReceive={() => setIsReceiveOpen(true)}
                onNavigateToTab={setCurrentTab}
              />
        )}

        {currentTab === 'business_reconciliation' && (
          businessWallets.length > 0
            ? <ReconciliationView />
            : <BusinessDashboard
                businessWallets={businessWallets}
                transactions={transactions}
                onOpenSend={() => setIsSendOpen(true)}
                onOpenReceive={() => setIsReceiveOpen(true)}
                onNavigateToTab={setCurrentTab}
              />
        )}

        {currentTab === 'admin_dashboard' && (currentUserRole === 'PLATFORM_ADMIN' ? <AdminDashboard /> : <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 text-sm text-neutral-600 dark:text-neutral-300">Platform administrator access is required for this workspace.</div>)}

        {currentTab === 'kash_ai' && (
          <div className="py-2">
            <KashAIChat
              isOpen={true}
              onClose={() => setCurrentTab('personal_dashboard')}
              onActionConfirmed={refreshData}
              embedded={true}
            />
          </div>
        )}
      </main>

      {/* Floating KASH AI Drawer */}
      <KashAIChat
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        onActionConfirmed={refreshData}
      />

      {/* Send Money Modal with Numpad & Form */}
      <SendMoneyModal
        isOpen={isSendOpen}
        onClose={() => setIsSendOpen(false)}
        wallets={portalMode === 'business' ? businessWallets : wallets}
        onTransferSuccess={refreshData}
      />

      {/* Receive / PayPal Sandbox Checkout Modal */}
      <ReceiveMoneyModal
        isOpen={isReceiveOpen}
        onClose={() => setIsReceiveOpen(false)}
      />

      {/* Minimalist Black and White Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 py-6 text-center text-xs text-neutral-500 transition-colors duration-150">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-900 dark:text-neutral-300">KASHFLOW</span>
            <span>·</span>
            <span>Minimalist Financial OS</span>
            <button onClick={async () => { await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }); setCurrentUserRole(null); setAuthStatus('guest'); setAuthView('landing'); }} className="ml-4 rounded-full border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-900">Sign out</button>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>Ledger: Prototype</span>
            <span>·</span>
            <span className="text-neutral-900 dark:text-neutral-200 font-semibold">● Provider confirmation required</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
