import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';

type AuthPageProps = {
  initialMode: 'login' | 'register';
  onBack: () => void;
  onAuthenticated: () => void;
};

export function AuthPage({ initialMode, onBack, onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>(initialMode);
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
      const payload = mode === 'register' ? { fullName: name, email, password } : mode === 'verify' ? { email, code } : { email, password };
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
      const response = await fetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to resend the code.');
      setMode('verify');
      setNotice('If this account needs verification, a new code has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend the code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#061c19] px-5 py-12 text-[#f5f4ec]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none"><div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-emerald-500/15 blur-[120px]"/><div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-amber-300/10 blur-[120px]"/></div>
      <section className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0b2924]/90 p-7 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-9">
        <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 text-sm text-emerald-100/55 transition hover:text-white"><ArrowLeft size={16}/> Back to home</button>
        <div className="mb-8 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d9c58d] font-black text-[#14251e]">K</span><div><strong className="block tracking-[.16em]">KASHFLOW</strong><span className="text-[10px] uppercase tracking-[.2em] text-emerald-100/40">Secure access</span></div></div>
        <div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#d9c58d]">{mode === 'register' ? 'Create account' : mode === 'verify' ? 'Email verification' : 'Welcome back'}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{mode === 'register' ? 'Start your flow.' : mode === 'verify' ? 'Verify your email.' : 'Sign in to KASHFLOW.'}</h1><p className="mt-2 text-sm leading-6 text-emerald-50/50">{mode === 'verify' ? 'Enter the six-digit code sent to your email address.' : 'Your financial workspace, connected and under your control.'}</p></div>
        {error && <div role="alert" className="mb-5 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div>}
        {notice && <div role="status" className="mb-5 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100">{notice}</div>}
        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && <label className="block text-sm text-emerald-50/70">Full name<input required minLength={2} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.045] px-4 py-3.5 text-white outline-none transition placeholder:text-white/20 focus:border-emerald-300/50" placeholder="Your full name"/></label>}
          {mode !== 'verify' && <label className="block text-sm text-emerald-50/70">Email address<span className="relative mt-2 block"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-100/30" size={17}/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[.045] py-3.5 pl-11 pr-4 text-white outline-none transition placeholder:text-white/20 focus:border-emerald-300/50" placeholder="you@example.com"/></span></label>}
          {mode === 'verify' && <label className="block text-sm text-emerald-50/70">Verification code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.045] px-4 py-4 text-center text-2xl tracking-[.5em] text-white outline-none focus:border-emerald-300/50" placeholder="000000"/></label>}
          {mode !== 'verify' && <label className="block text-sm text-emerald-50/70">Password<span className="relative mt-2 block"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-100/30" size={17}/><input required minLength={mode === 'register' ? 10 : 1} type={showPassword?'text':'password'} autoComplete={mode==='register'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[.045] py-3.5 pl-11 pr-12 text-white outline-none transition placeholder:text-white/20 focus:border-emerald-300/50" placeholder={mode==='register'?'At least 10 characters':'Your password'}/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-100/40">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span></label>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d9c58d] px-5 py-4 text-sm font-bold text-[#14251e] transition hover:bg-[#ead9a7] disabled:cursor-wait disabled:opacity-60">{busy?'Please wait…':mode==='register'?'Create account':mode==='verify'?'Verify email':'Sign in'} <ShieldCheck size={16}/></button>
        </form>
        {mode === 'verify' && <button type="button" disabled={busy} onClick={resendCode} className="mt-4 w-full text-center text-xs font-semibold text-[#e5d39c] hover:text-white disabled:opacity-50">Resend verification code</button>}
        {mode === 'login' && <button type="button" disabled={busy || !email} onClick={resendCode} className="mt-4 w-full text-center text-xs font-semibold text-emerald-100/55 hover:text-white disabled:opacity-40">Need a new verification code?</button>}
        {mode !== 'verify' && <p className="mt-7 text-center text-sm text-emerald-50/45">{mode==='register'?'Already registered?':'New to KASHFLOW?'} <button onClick={()=>{setMode(mode==='register'?'login':'register');setError('');setNotice('');}} className="font-semibold text-[#e5d39c] hover:text-white">{mode==='register'?'Sign in':'Create an account'}</button></p>}
      </section>
    </main>
  );
}
