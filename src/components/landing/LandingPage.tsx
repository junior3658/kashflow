import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Bitcoin, BrainCircuit, CircleDollarSign, CreditCard, Globe2, LockKeyhole, ShieldCheck, Zap, Smartphone, WalletCards, ArrowLeftRight } from 'lucide-react';

type LandingPageProps = {
  onSignIn: () => void;
  onGetStarted: () => void;
};

const methods = [
  { name: 'Mobile Money', detail: 'Local payment rails', icon: Smartphone, tone: 'text-indigo-300' },
  { name: 'PayPal', detail: 'Global payment network', icon: CreditCard, tone: 'text-sky-300' },
  { name: 'Digital assets', detail: 'Market insights & simulation', icon: Bitcoin, tone: 'text-amber-300' },
];

const floaters = [
  { label: 'BTC', value: 'Bitcoin', change: '+2.84%', top: '8%', left: '5%', delay: 0 },
  { label: 'USDT', value: 'Stablecoin', change: '1.00 USD', top: '27%', right: '1%', delay: 0.8 },
  { label: 'PAY', value: 'PayPal', change: 'Global', bottom: '8%', left: '9%', delay: 1.4 },
  { label: 'MM', value: 'Mobile Money', change: 'Connected', bottom: '17%', right: '4%', delay: 0.4 },
];

export function LandingPage({ onSignIn, onGetStarted }: LandingPageProps) {
  const footerModules = [
    { name: 'Wallets & Balances', tag: 'Your financial overview', icon: WalletCards, tone: 'text-indigo-200', global: 'Digital wallets provide a structured place to view and organize balances across financial services.', app: 'KASHFLOW brings internal ledger balances and provider balances into one view, while clearly distinguishing verified funds from estimates and prototype data.' },
    { name: 'Mobile Money', tag: 'Local payment experience', icon: Smartphone, tone: 'text-emerald-200', global: 'Mobile money enables people to send, receive and store value through mobile-network financial services.', app: 'KASHFLOW is designed to connect local collection and payout journeys through supported providers. A payment is only marked complete after verified provider confirmation.' },
    { name: 'PayPal', tag: 'Global payment experience', icon: Globe2, tone: 'text-sky-200', global: 'PayPal is a global digital payment service used for online payments and transfers where its services are available.', app: 'KASHFLOW reserves a place for PayPal payment experiences and orchestration. Availability depends on supported account, region and API capabilities; no connection is implied until configured.' },
    { name: 'FX Exchange', tag: 'Currency conversion tools', icon: ArrowLeftRight, tone: 'text-violet-200', global: 'Foreign-exchange tools help users understand how one currency converts into another using an exchange rate.', app: 'KASHFLOW provides an exchange workspace for viewing conversion scenarios and rates. Any real conversion requires a supported provider and explicit user confirmation.' },
    { name: 'Crypto Simulation', tag: 'Digital asset insights', icon: Bitcoin, tone: 'text-amber-200', global: 'Crypto market tools help users explore digital-asset prices, market movements and potential scenarios.', app: 'KASHFLOW offers market insights and simulation for learning and analysis. It does not custody crypto or execute live crypto trades.' },
    { name: 'KASH AI & Analytics', tag: 'Intelligence and clarity', icon: BrainCircuit, tone: 'text-indigo-200', global: 'AI analytics can summarize financial activity, identify patterns and help people reason about possible decisions.', app: 'KASH AI provides explanations and recommendations using available data. Deterministic backend rules validate actions, and the user remains responsible for authorization.' },
  ];
  const [activeModule, setActiveModule] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setActiveModule((current) => (current + 1) % footerModules.length), 4000);
    return () => window.clearInterval(timer);
  }, []);
  const ActiveModuleIcon = footerModules[activeModule].icon;

  return (
    <div className="min-h-screen overflow-hidden bg-[#050607] text-[#f5f4ec] selection:bg-indigo-300 selection:text-[#06221d]">
      <div className="pointer-events-none fixed inset-0 opacity-40" aria-hidden="true">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-indigo-500/20 blur-[130px]" />
        <div className="absolute -right-40 top-1/3 h-[32rem] w-[32rem] rounded-full bg-teal-400/10 blur-[140px]" />
        <div className="absolute bottom-[-20rem] left-1/3 h-[35rem] w-[35rem] rounded-full bg-amber-300/10 blur-[150px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <a href="#" className="flex items-center gap-3" aria-label="KASHFLOW home">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-indigo-200/20 bg-indigo-300 text-lg font-black text-[#06221d] shadow-[0_8px_35px_rgba(52,211,153,.18)]">K</span>
          <span><strong className="block text-lg font-extrabold tracking-[.16em]">KASHFLOW</strong><small className="text-[10px] uppercase tracking-[.24em] text-indigo-100/55">Intelligent finance</small></span>
        </a>
        <nav className="hidden items-center gap-9 text-sm text-indigo-50/65 md:flex">
          <a className="transition hover:text-white" href="#ecosystem">Ecosystem</a>
          <a className="transition hover:text-white" href="#how-it-works">How it works</a>
          <a className="transition hover:text-white" href="#security">Security</a>
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={onSignIn} className="hidden rounded-full px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 sm:inline-flex">Sign in</button>
          <button onClick={onGetStarted} className="inline-flex items-center gap-2 rounded-full bg-[#8b9cff] px-5 py-2.5 text-sm font-bold text-[#10152d] shadow-lg shadow-amber-950/20 transition hover:-translate-y-0.5 hover:bg-[#b7c2ff]">Get started <ArrowUpRight size={16}/></button>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid min-h-[690px] max-w-7xl items-center gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1.02fr_.98fr] lg:px-10 lg:pb-28 lg:pt-16">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .75, ease: 'easeOut' }} className="relative z-10">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-100/15 bg-white/[.045] px-4 py-2 text-xs font-medium tracking-wide text-indigo-100/80 backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-300" /> One intelligent financial experience
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-.055em] sm:text-6xl lg:text-[4.65rem]">
              Your money,<br/><span className="bg-gradient-to-r from-[#c7d2fe] via-[#f7f1d9] to-indigo-200 bg-clip-text text-transparent">in one intelligent</span><br/>flow.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-white/60 sm:text-lg">
              Connect the way you move money. Bring mobile payments, global payment experiences and digital asset insights into one clear financial workspace.
            </p>
            <a href="#ecosystem" className="mt-9 inline-flex items-center gap-2 text-sm font-semibold text-indigo-200 transition hover:text-white">Explore the KASHFLOW ecosystem <ArrowRight size={16}/></a>
            <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs text-white/45">
              <span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-indigo-300"/> User-controlled transactions</span>
              <span className="inline-flex items-center gap-2"><LockKeyhole size={14} className="text-indigo-300"/> Security-first architecture</span>
            </div>
          </motion.div>

          <div className="relative mx-auto flex aspect-square w-full max-w-[590px] items-center justify-center">
            <div className="absolute inset-[7%] rounded-full border border-indigo-100/10" />
            <div className="absolute inset-[17%] rounded-full border border-dashed border-indigo-100/15 animate-[spin_70s_linear_infinite]" />
            <div className="absolute inset-[28%] rounded-full border border-indigo-100/10" />
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 55, repeat: Infinity, ease: 'linear' }} className="absolute inset-[12%]">
              <span className="absolute left-1/2 top-0 h-3 w-3 rounded-full bg-[#a5b4fc] shadow-[0_0_25px_#a5b4fc]" />
              <span className="absolute bottom-[4%] right-[12%] h-2.5 w-2.5 rounded-full bg-indigo-300 shadow-[0_0_22px_#6ee7b7]" />
            </motion.div>
            <div className="payment-cube-stage relative z-10 flex h-[390px] w-full items-center justify-center sm:h-[470px]" aria-label="Rotating three-dimensional cube showing PayPal, Mastercard and Mobile Money">
              <div className="cube-glow"/>
              <div className="payment-cube">
                <div className="cube-face cube-front"><span className="cube-kicker">WALLETS & BALANCES</span><WalletCards size={48} className="text-indigo-200"/><strong className="text-2xl">Wallets</strong><span className="cube-caption">A clear view of your balances</span></div>
                <div className="cube-face cube-right"><span className="cube-kicker">LOCAL PAYMENTS</span><Smartphone size={48} className="text-emerald-200"/><strong className="text-xl">Mobile Money</strong><span className="cube-caption">Local collection & payouts</span></div>
                <div className="cube-face cube-back"><span className="cube-kicker">GLOBAL PAYMENTS</span><span className="grid h-14 w-14 place-items-center rounded-2xl border border-sky-200/20 bg-sky-300/10 text-sky-200"><Globe2 size={34}/></span><strong className="text-2xl">PayPal</strong><span className="cube-caption">Global payment experience</span></div>
                <div className="cube-face cube-left"><span className="cube-kicker">CURRENCY TOOLS</span><Globe2 size={48} className="text-sky-200"/><strong className="text-2xl">FX Exchange</strong><span className="cube-caption">Explore currency conversion</span></div>
                <div className="cube-face cube-top"><span className="cube-kicker">DIGITAL ASSETS</span><Bitcoin size={48} className="text-amber-200"/><strong className="text-xl">Crypto Sim</strong><span className="cube-caption">Market insights & simulation</span></div>
                <div className="cube-face cube-bottom"><span className="cube-kicker">INTELLIGENT ASSISTANCE</span><Zap size={48} className="text-indigo-200"/><strong className="text-xl">KASH AI</strong><span className="cube-caption">Insights. You stay in control.</span></div>
              </div>
              <div className="cube-orbit cube-orbit-one"/><div className="cube-orbit cube-orbit-two"/>
            </div>
            {floaters.map((item,i)=><motion.div key={item.label} animate={{y:[0,-10,0],x:[0,i%2?5:-5,0]}} transition={{duration:5+i*.7,repeat:Infinity,ease:'easeInOut',delay:item.delay}} style={{top:item.top,left:item.left,right:item.right,bottom:item.bottom}} className="absolute z-20 rounded-2xl border border-white/15 bg-[#101a18]/90 px-4 py-3 shadow-xl shadow-black/20 backdrop-blur-xl"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-[10px] font-bold text-[#c7d2fe]">{item.label}</span><span><strong className="block text-xs">{item.value}</strong><small className="text-[10px] text-indigo-200/65">{item.change}</small></span></div></motion.div>)}
          </div>
        </section>

        <section id="ecosystem" className="border-y border-white/[.08] bg-white/[.025]">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-3 lg:px-10">
            {[
              {icon: Smartphone,title:'Local payment rails',copy:'A mobile-money-first approach designed for everyday payments and collections.'},
              {icon: Globe2,title:'Global connections',copy:'A unified experience designed to connect local financial activity with global services.'},
              {icon: CircleDollarSign,title:'Digital asset insights',copy:'Explore market information and simulated crypto scenarios without custody or live trading.'},
            ].map(({icon:Icon,title,copy})=><div key={title} className="flex gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.045] text-indigo-100"><Icon size={20}/></span><div><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-white/50">{copy}</p></div></div>)}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-2 lg:px-10 lg:py-28">
          <div><p className="text-xs font-bold uppercase tracking-[.24em] text-[#8b9cff]">A clearer financial picture</p><h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Less fragmentation.<br/>More financial clarity.</h2></div>
          <div className="grid gap-5 sm:grid-cols-2"><div className="rounded-3xl border border-white/10 bg-white/[.035] p-6"><Zap className="text-[#a5b4fc]"/><h3 className="mt-5 font-semibold">One workspace</h3><p className="mt-2 text-sm leading-6 text-indigo-50/50">See your financial activity through a single, understandable interface.</p></div><div className="rounded-3xl border border-white/10 bg-white/[.035] p-6"><WalletCards className="text-indigo-200"/><h3 className="mt-5 font-semibold">Your decisions</h3><p className="mt-2 text-sm leading-6 text-indigo-50/50">AI can assist and recommend. You stay in control of financial actions.</p></div></div>
        </section>

        <section id="security" className="mx-auto max-w-7xl px-6 pb-20 lg:px-10"><div className="flex flex-col justify-between gap-7 rounded-[2rem] border border-indigo-100/15 bg-gradient-to-br from-[#17191d] via-[#101214] to-[#08090a] p-8 sm:p-12 md:flex-row md:items-center"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.22em] text-indigo-200/65">Built with responsibility</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Intelligence should support trust, not replace it.</h2><p className="mt-3 text-sm leading-7 text-indigo-50/55">KASHFLOW separates AI recommendations from backend validation and user authorization. Payment requests are not treated as completed until provider confirmation is verified.</p></div><div className="flex shrink-0 items-center gap-3 text-sm text-indigo-100"><ShieldCheck size={22}/><span>Security-first by design</span></div></div></section>
      </main>

      <footer className="relative z-10 border-t border-white/[.08] bg-[#030405]/95 px-6 pb-9 pt-12">
        <div className="mx-auto max-w-7xl lg:px-4">
          <div className="flex flex-col justify-between gap-5 border-b border-white/[.08] pb-8 sm:flex-row sm:items-end">
            <div><p className="text-[10px] font-bold uppercase tracking-[.28em] text-white/55">Connected ecosystem</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">One flow. Multiple ways to move.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-indigo-50/45">A unified experience designed around global payment services, local mobile money and KASHFLOW intelligence.</p></div>
            <span className="text-[10px] uppercase tracking-[.2em] text-indigo-100/35">Ecosystem overview · Not a claim of formal partnership</span>
          </div>
          <div className="grid gap-6 py-8 lg:grid-cols-[.8fr_1.2fr]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
              {footerModules.map((item,index)=>{
                const Icon=item.icon;
                const selected=activeModule===index;
                return <button key={item.name} type="button" onClick={()=>setActiveModule(index)} aria-pressed={selected}
                  className={`group flex min-h-[88px] items-center gap-3 rounded-2xl border p-3 text-left transition duration-300 ${selected?'border-white/25 bg-white/[.10] shadow-[0_12px_35px_rgba(0,0,0,.28)]':'border-white/[.07] bg-white/[.025] hover:border-white/15 hover:bg-white/[.055]'}`}>
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/20 ${item.tone}`}><Icon size={21}/></span>
                  <span className="min-w-0"><strong className="block text-xs leading-5 text-white">{item.name}</strong><span className="mt-1 block text-[10px] leading-4 text-white/40">{item.tag}</span></span>
                  {selected&&<span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,.8)]"/>}
                </button>;
              })}
            </div>
            <div className="relative min-h-[280px] overflow-hidden rounded-[1.7rem] border border-white/10 bg-gradient-to-br from-white/[.08] via-white/[.035] to-transparent p-6 shadow-[0_25px_80px_rgba(0,0,0,.32)] sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/[.045] blur-3xl"/>
              <AnimatePresence mode="wait">
                <motion.div key={activeModule} initial={{opacity:0,y:12,filter:'blur(5px)'}} animate={{opacity:1,y:0,filter:'blur(0px)'}} exit={{opacity:0,y:-8,filter:'blur(4px)'}} transition={{duration:.35}} className="relative">
                  <div className="flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.2em] text-white/45">KASHFLOW ecosystem · {String(activeModule+1).padStart(2,'0')} / 06</span>
                    <ActiveModuleIcon size={27} className={footerModules[activeModule].tone}/>
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{footerModules[activeModule].name}</h3>
                  <p className="mt-1 text-xs text-white/40">{footerModules[activeModule].tag}</p>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-white/40">Son utilité globale</p><p className="mt-2 text-sm leading-6 text-white/65">{footerModules[activeModule].global}</p></div>
                    <div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-indigo-200/65">Son rôle dans KASHFLOW</p><p className="mt-2 text-sm leading-6 text-white/65">{footerModules[activeModule].app}</p></div>
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="absolute bottom-0 left-0 h-[2px] w-full bg-white/[.06]"><motion.div key={activeModule} initial={{width:'0%'}} animate={{width:'100%'}} transition={{duration:4,ease:'linear'}} className="h-full bg-gradient-to-r from-white/30 via-indigo-200/80 to-white/30"/></div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-white/[.08] pt-6 text-center text-[11px] text-indigo-50/35 sm:flex-row sm:text-left"><div><strong className="tracking-[.22em] text-indigo-50/75">KASHFLOW</strong><span className="mx-2">·</span>Beyond Payments. One Intelligent Financial Experience.</div><div className="flex items-center gap-2"><ShieldCheck size={13} className="text-indigo-300"/> AI recommends. You authorize. Providers confirm.</div><span>© {new Date().getFullYear()} KASHFLOW</span></div>
        </div>
      </footer>
    </div>
  );
}
