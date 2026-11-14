import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound, Building2 } from 'lucide-react';

type AuthPageProps = { initialMode: 'login' | 'register'; onBack: () => void; onAuthenticated: () => void };
type AccountType = 'PERSONAL' | 'BUSINESS';

export function AuthPage({ initialMode, onBack, onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>(initialMode);
  const [accountType, setAccountType] = useState<AccountType>('PERSONAL');
  const [businessName, setBusinessName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const endpoint = mode === 'register' ? '/api/v1/auth/register' : mode === 'verify' ? '/api/v1/auth/verify-email' : '/api/v1/auth/login';
      const payload = mode === 'register'
        ? { fullName: name, email, password, accountType, ...(accountType === 'BUSINESS' ? { businessName } : {}) }
        : mode === 'verify' ? { email, code } : { email, password };
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Authentication failed. Please try again.');
      if (mode === 'register') { setMode('verify'); setNotice('A verification code has been sent to your email address.'); }
      else if (mode === 'verify') { setNotice('Email verified. Your account is ready.'); onAuthenticated(); }
      else onAuthenticated();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unexpected error.'); }
    finally { setBusy(false); }
  }

  async function resendCode() {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/v1/auth/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to resend the code.');
      setMode('verify'); setNotice('If this account needs verification, a new code has been sent.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to resend the code.'); }
    finally { setBusy(false); }
  }

  const fieldClass = "mt-2 w-full rounded-xl border border-white/10 bg-white/[.045] px-4 py-3.5 text-white outline-none transition placeholder:text-white/25 focus:border-indigo-300/60";
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090d1f] px-5 py-12 text-slate-100">
      <div className="pointer-events-none fixed inset-0"><div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-500/20 blur-[130px]"/><div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-sky-500/15 blur-[130px]"/></div>
      <section className="relative w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#111a35]/90 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-9">
        <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 text-sm text-indigo-100/60 transition hover:text-white"><ArrowLeft size={16}/> Back to home</button>
        <div className="mb-8 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-400 font-black text-[#10152d] shadow-lg shadow-indigo-500/20">K</span><div><strong className="block tracking-[.16em]">KASHFLOW</strong><span className="text-[10px] uppercase tracking-[.2em] text-indigo-100/45">Secure financial workspace</span></div></div>
        <div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[.2em] text-indigo-300">{mode === 'register' ? 'Create account' : mode === 'verify' ? 'Email verification' : 'Welcome back'}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{mode === 'register' ? 'Choose your workspace.' : mode === 'verify' ? 'Verify your email.' : 'Sign in to KASHFLOW.'}</h1><p className="mt-2 text-sm leading-6 text-slate-300/60">{mode === 'verify' ? 'Enter the six-digit code sent to your email address.' : 'One platform, with a workspace designed around how you manage money.'}</p></div>
        {error && <div role="alert" className="mb-5 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div>}
        {notice && <div role="status" className="mb-5 rounded-xl border border-indigo-300/20 bg-indigo-300/10 p-3 text-sm text-indigo-100">{notice}</div>}
        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && <>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setAccountType('PERSONAL')} className={`rounded-2xl border p-4 text-left transition ${accountType === 'PERSONAL' ? 'border-indigo-300/70 bg-indigo-400/15 ring-1 ring-indigo-300/30' : 'border-white/10 bg-white/[.025] hover:bg-white/[.06]'}`}>
                <UserRound className={accountType === 'PERSONAL' ? 'text-indigo-300' : 'text-slate-400'} size={21}/><strong className="mt-3 block text-sm">Personal</strong><span className="mt-1 block text-xs leading-5 text-slate-300/50">For your everyday finances</span>
              </button>
              <button type="button" onClick={() => setAccountType('BUSINESS')} className={`rounded-2xl border p-4 text-left transition ${accountType === 'BUSINESS' ? 'border-indigo-300/70 bg-indigo-400/15 ring-1 ring-indigo-300/30' : 'border-white/10 bg-white/[.025] hover:bg-white/[.06]'}`}>
                <Building2 className={accountType === 'BUSINESS' ? 'text-indigo-300' : 'text-slate-400'} size={21}/><strong className="mt-3 block text-sm">Business</strong><span className="mt-1 block text-xs leading-5 text-slate-300/50">For a company or organization</span>
              </button>
            </div>
            <label className="block text-sm text-slate-200/75">Full name<input required minLength={2} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} className={fieldClass} placeholder="Your full name"/></label>
            {accountType === 'BUSINESS' && <label className="block text-sm text-slate-200/75">Business / organization name<input required minLength={2} maxLength={120} value={businessName} onChange={e=>setBusinessName(e.target.value)} className={fieldClass} placeholder="Your company name"/></label>}
          </>}
          {mode !== 'verify' && <label className="block text-sm text-slate-200/75">Email address<span className="relative mt-2 block"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-200/35" size={17}/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className={`${fieldClass} pl-11`} placeholder="you@example.com"/></span></label>}
          {mode === 'verify' && <label className="block text-sm text-slate-200/75">Verification code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} className={`${fieldClass} py-4 text-center text-2xl tracking-[.5em]`} placeholder="000000"/></label>}
          {mode !== 'verify' && <label className="block text-sm text-slate-200/75">Password<span className="relative mt-2 block"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-200/35" size={17}/><input required minLength={mode === 'register' ? 10 : 1} type={showPassword?'text':'password'} autoComplete={mode==='register'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} className={`${fieldClass} pl-11 pr-12`} placeholder={mode==='register'?'At least 10 characters':'Your password'}/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-100/45">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span></label>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-400 px-5 py-4 text-sm font-bold text-[#10152d] transition hover:bg-indigo-300 disabled:cursor-wait disabled:opacity-60">{busy?'Please wait…':mode==='register'?'Create account':mode==='verify'?'Verify email':'Sign in'} <ShieldCheck size={16}/></button>
        </form>
        {mode === 'verify' && <button type="button" disabled={busy} onClick={resendCode} className="mt-4 w-full text-center text-xs font-semibold text-indigo-200 hover:text-white disabled:opacity-50">Resend verification code</button>}
        {mode === 'login' && <button type="button" disabled={busy || !email} onClick={resendCode} className="mt-4 w-full text-center text-xs font-semibold text-indigo-100/60 hover:text-white disabled:opacity-40">Need a new verification code?</button>}
        {mode !== 'verify' && <p className="mt-7 text-center text-sm text-slate-300/50">{mode==='register'?'Already registered?':'New to KASHFLOW?'} <button onClick={()=>{setMode(mode==='register'?'login':'register');setError('');setNotice('');}} className="font-semibold text-indigo-200 hover:text-white">{mode==='register'?'Sign in':'Create an account'}</button></p>}
      </section>
    </main>
  );
}
