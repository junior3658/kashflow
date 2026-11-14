import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound, Building2, Globe2, Sparkles, ArrowRight, Smartphone, CreditCard } from 'lucide-react';

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

  const fieldClass = "mt-2 w-full rounded-xl border border-white/10 bg-[#111a35] px-4 py-3.5 text-white outline-none transition placeholder:text-white/25 focus:border-indigo-300/70 focus:ring-2 focus:ring-indigo-300/10";
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080d20] text-slate-100">
      <div className="pointer-events-none fixed inset-0" aria-hidden="true"><div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-500/20 blur-[130px]"/><div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-sky-500/15 blur-[130px]"/></div>
      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[1.04fr_.96fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[.07] px-10 py-9 lg:flex xl:px-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_40%_48%,rgba(99,102,241,.18),transparent_58%)]"/>
          <button onClick={onBack} className="relative z-10 inline-flex w-fit items-center gap-2 text-sm text-indigo-100/60 transition hover:text-white"><ArrowLeft size={16}/> Back to KASHFLOW</button>
          <div className="relative z-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200/15 bg-white/[.04] px-3 py-2 text-[10px] font-semibold uppercase tracking-[.22em] text-indigo-100/75"><Sparkles size={13}/> One intelligent financial flow</div>
            <h2 className="max-w-xl text-5xl font-semibold leading-[1.08] tracking-[-.05em] xl:text-6xl">Your financial world.<br/><span className="bg-gradient-to-r from-indigo-200 via-white to-sky-200 bg-clip-text text-transparent">Connected in 3D.</span></h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-indigo-50/55">A single workspace to understand your money movement, explore connected payment experiences and make informed decisions.</p>
            <div className="payment-cube-stage relative mx-auto mt-8 flex h-[330px] w-full max-w-[480px] items-center justify-center">
              <div className="cube-glow"/>
              <div className="payment-cube">
                <div className="cube-face cube-front"><span className="cube-kicker">GLOBAL PAYMENTS</span><span className="paypal-mark">P</span><strong className="text-2xl">PayPal</strong><span className="cube-caption">Global payment experience</span></div>
                <div className="cube-face cube-right"><span className="cube-kicker">CARD NETWORK</span><div className="mastercard-mark"><i/><i/></div><strong className="text-xl tracking-[.12em]">mastercard</strong><span className="cube-caption">Card payment ecosystem</span></div>
                <div className="cube-face cube-back"><span className="cube-kicker">LOCAL PAYMENTS</span><span className="mobile-money-mark"><Smartphone size={54}/></span><strong className="text-xl">Mobile Money</strong><span className="cube-caption">Airtel · Orange · M-Pesa</span></div>
                <div className="cube-face cube-left"><span className="cube-kicker">ONE FINANCIAL FLOW</span><span className="grid h-16 w-16 place-items-center rounded-2xl border border-white/20 bg-white/10 text-4xl font-black">K</span><strong className="text-2xl tracking-[.14em]">KASHFLOW</strong><span className="cube-caption">One intelligent workspace</span></div>
                <div className="cube-face cube-top"><span className="text-4xl font-black tracking-widest">K</span><span className="text-xs uppercase tracking-[.3em]">KASHFLOW</span></div>
                <div className="cube-face cube-bottom"><span className="text-xs font-semibold uppercase tracking-[.3em]">CONNECTED FINANCE</span><span className="text-3xl">✦</span></div>
              </div>
              <div className="cube-orbit cube-orbit-one"/><div className="cube-orbit cube-orbit-two"/>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[{icon:Globe2,label:'Global reach'},{icon:Smartphone,label:'Local rails'},{icon:ShieldCheck,label:'User control'}].map(({icon:Icon,label})=><div key={label} className="rounded-2xl border border-white/[.08] bg-white/[.035] p-3 text-center"><Icon className="mx-auto mb-2 text-indigo-200" size={18}/><span className="text-[10px] text-indigo-50/55">{label}</span></div>)}
            </div>
          </div>
          <p className="relative z-10 text-[10px] tracking-wide text-indigo-100/35">KASHFLOW · INTELLIGENT FINANCIAL EXPERIENCE</p>
        </aside>

        <section className="relative flex min-h-screen items-center justify-center px-5 py-8 sm:px-10 lg:px-12 xl:px-20">
          <div className="w-full max-w-[510px]">
            <div className="mb-8 flex items-center justify-between lg:justify-end">
              <button onClick={onBack} className="inline-flex items-center gap-2 text-xs text-indigo-100/55 hover:text-white lg:hidden"><ArrowLeft size={15}/> Home</button>
              <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-300 font-black text-[#10152d]">K</span><strong className="text-xs tracking-[.18em]">KASHFLOW</strong></div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-[#101832]/85 p-6 shadow-[0_30px_100px_rgba(0,0,0,.38)] backdrop-blur-2xl sm:p-9">
              <div className="mb-7"><p className="text-[10px] font-bold uppercase tracking-[.24em] text-indigo-300">{mode === 'register' ? 'Create your account' : mode === 'verify' ? 'Identity confirmation' : 'Welcome back'}</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-[2.15rem]">{mode === 'register' ? 'Build your workspace.' : mode === 'verify' ? 'One last security step.' : 'Good to see you again.'}</h1><p className="mt-2 text-sm leading-6 text-slate-300/55">{mode === 'verify' ? 'Enter the six-digit code sent to your email address.' : mode === 'register' ? 'Create a secure account and choose how you want to use KASHFLOW.' : 'Sign in to continue to your financial workspace.'}</p></div>
              {error && <div role="alert" className="mb-5 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div>}
              {notice && <div role="status" className="mb-5 rounded-xl border border-indigo-300/20 bg-indigo-300/10 p-3 text-sm text-indigo-100">{notice}</div>}
              <form onSubmit={submit} className="space-y-4">
                {mode === 'register' && <>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setAccountType('PERSONAL')} className={`rounded-2xl border p-3.5 text-left transition ${accountType === 'PERSONAL' ? 'border-indigo-300/70 bg-indigo-400/15 ring-1 ring-indigo-300/30' : 'border-white/10 bg-white/[.025] hover:bg-white/[.06]'}`}><UserRound className="text-indigo-300" size={19}/><strong className="mt-2 block text-sm">Personal</strong><span className="mt-1 block text-[10px] leading-4 text-slate-300/50">Everyday finances</span></button>
                    <button type="button" onClick={() => setAccountType('BUSINESS')} className={`rounded-2xl border p-3.5 text-left transition ${accountType === 'BUSINESS' ? 'border-indigo-300/70 bg-indigo-400/15 ring-1 ring-indigo-300/30' : 'border-white/10 bg-white/[.025] hover:bg-white/[.06]'}`}><Building2 className="text-indigo-300" size={19}/><strong className="mt-2 block text-sm">Business</strong><span className="mt-1 block text-[10px] leading-4 text-slate-300/50">Company workspace</span></button>
                  </div>
                  <label className="block text-xs font-medium text-slate-200/75">Full name<input required minLength={2} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} className={fieldClass} placeholder="Your full name"/></label>
                  {accountType === 'BUSINESS' && <label className="block text-xs font-medium text-slate-200/75">Business / organization name<input required minLength={2} maxLength={120} value={businessName} onChange={e=>setBusinessName(e.target.value)} className={fieldClass} placeholder="Your company name"/></label>}
                </>}
                {mode !== 'verify' && <label className="block text-xs font-medium text-slate-200/75">Email address<span className="relative mt-2 block"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-200/35" size={17}/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className={fieldClass + ' pl-11'} placeholder="you@example.com"/></span></label>}
                {mode === 'verify' && <label className="block text-xs font-medium text-slate-200/75">Verification code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} className={fieldClass + ' py-4 text-center text-2xl tracking-[.5em]'} placeholder="000000"/></label>}
                {mode !== 'verify' && <label className="block text-xs font-medium text-slate-200/75">Password<span className="relative mt-2 block"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-200/35" size={17}/><input required minLength={mode === 'register' ? 10 : 1} type={showPassword?'text':'password'} autoComplete={mode==='register'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} className={fieldClass + ' pl-11 pr-12'} placeholder={mode==='register'?'At least 10 characters':'Your password'}/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-100/45">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span></label>}
                <button disabled={busy} className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-300 to-sky-200 px-5 py-4 text-sm font-bold text-[#10152d] shadow-lg shadow-indigo-950/30 transition hover:-translate-y-0.5 hover:shadow-indigo-500/20 disabled:cursor-wait disabled:opacity-60">{busy?'Please wait…':mode==='register'?'Create account':mode==='verify'?'Verify email':'Sign in'} <ArrowRight size={16} className="transition group-hover:translate-x-1"/><ShieldCheck size={16}/></button>
              </form>
              {mode === 'verify' && <button type="button" disabled={busy} onClick={resendCode} className="mt-4 w-full text-center text-xs font-semibold text-indigo-200 hover:text-white disabled:opacity-50">Resend verification code</button>}
              {mode === 'login' && <button type="button" disabled={busy || !email} onClick={resendCode} className="mt-4 w-full text-center text-xs font-semibold text-indigo-100/55 hover:text-white disabled:opacity-40">Need a new verification code?</button>}
              {mode !== 'verify' && <p className="mt-7 text-center text-xs text-slate-300/50">{mode==='register'?'Already have an account?':'New to KASHFLOW?'} <button onClick={()=>{setMode(mode==='register'?'login':'register');setError('');setNotice('');}} className="ml-1 font-semibold text-indigo-200 hover:text-white">{mode==='register'?'Sign in':'Create an account'}</button></p>}
            </div>
            <p className="mt-5 flex items-center justify-center gap-2 text-[10px] text-indigo-100/35"><LockKeyhole size={12}/> Protected session · Email verification · You stay in control</p>
          </div>
        </section>
      </div>
    </main>
  );
}
