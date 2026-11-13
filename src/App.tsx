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
import { Wallet, Transaction } from './backend/types';
import { LandingPage } from './components/landing/LandingPage';
import { AuthPage } from './components/auth/AuthPage';

export default function App() {
  const [authStatus, setAuthStatus] = useState<'checking' | 'guest' | 'authenticated'>('checking');
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

  // Theme state: default is LIGHT (white dominates), supports dual theme (Light / Dark)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kashflow_theme') === 'dark';
    }
    return false;
  });

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('kashflow_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('kashflow_theme', 'light');
      }
      return next;
    });
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    fetch('/api/v1/auth/me', { credentials: 'include' })
      .then((response) => setAuthStatus(response.ok ? 'authenticated' : 'guest'))
      .catch(() => setAuthStatus('guest'));
  }, []);

  // Fetch Wallets & Transactions
  const refreshData = async () => {
    try {
      const [wPersonalRes, wBusinessRes, txRes] = await Promise.all([
        fetch('/api/v1/wallets?type=PERSONAL'),
        fetch('/api/v1/wallets?type=BUSINESS'),
        fetch('/api/v1/transactions'),
      ]);

      const wPersonalData = await wPersonalRes.json();
      const wBusinessData = await wBusinessRes.json();
      const txData = await txRes.json();

      setWallets(wPersonalData.wallets || []);
      setBusinessWallets(wBusinessData.wallets || []);
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
    return <AuthPage initialMode={authView} onBack={() => setAuthView('landing')} onAuthenticated={() => { setAuthStatus('authenticated'); setAuthView('landing'); refreshData(); }} />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-150">
      {/* Universal Navigation with Theme Switcher */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        portalMode={portalMode}
        onChangePortal={(mode) => {
          setPortalMode(mode);
          if (mode === 'personal') setCurrentTab('personal_dashboard');
          if (mode === 'business') setCurrentTab('business_dashboard');
          if (mode === 'admin') setCurrentTab('admin_dashboard');
        }}
        onOpenSend={() => setIsSendOpen(true)}
        onOpenReceive={() => setIsReceiveOpen(true)}
        onOpenAI={() => setIsAIOpen(true)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* Main Viewport Container (1440px max width desktop baseline) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
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
            onExchangeCompleted={refreshData}
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

        {currentTab === 'business_team' && <TeamManagement />}

        {currentTab === 'business_reconciliation' && <ReconciliationView />}

        {currentTab === 'admin_dashboard' && <AdminDashboard />}

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
        onPaymentCaptured={refreshData}
      />

      {/* Minimalist Black and White Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 py-6 text-center text-xs text-neutral-500 transition-colors duration-150">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-900 dark:text-neutral-300">KASHFLOW</span>
            <span>·</span>
            <span>Minimalist Financial OS</span>
            <button onClick={async () => { await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }); setAuthStatus('guest'); setAuthView('landing'); }} className="ml-4 rounded-full border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-900">Sign out</button>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>Ledger: Double-Entry Balanced</span>
            <span>·</span>
            <span className="text-neutral-900 dark:text-neutral-200 font-semibold">● Verified Operations</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
