import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Bitcoin, Check, CircleDollarSign, CreditCard, Globe2, LockKeyhole, MoveUpRight, ShieldCheck, Smartphone, WalletCards, Zap } from 'lucide-react';

type LandingPageProps = {
  onSignIn: () => void;
  onGetStarted: () => void;
};

const methods = [
  { name: 'Mobile Money', detail: 'Local payment rails', icon: Smartphone, tone: 'text-emerald-300' },
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
  return (
    <div className="min-h-screen overflow-hidden bg-[#061c19] text-[#f5f4ec] selection:bg-emerald-300 selection:text-[#06221d]">
      <div className="pointer-events-none fixed inset-0 opacity-40" aria-hidden="true">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-emerald-500/20 blur-[130px]" />
        <div className="absolute -right-40 top-1/3 h-[32rem] w-[32rem] rounded-full bg-teal-400/10 blur-[140px]" />
        <div className="absolute bottom-[-20rem] left-1/3 h-[35rem] w-[35rem] rounded-full bg-amber-300/10 blur-[150px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <a href="#" className="flex items-center gap-3" aria-label="KASHFLOW home">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-200/20 bg-emerald-300 text-lg font-black text-[#06221d] shadow-[0_8px_35px_rgba(52,211,153,.18)]">K</span>
          <span><strong className="block text-lg font-extrabold tracking-[.16em]">KASHFLOW</strong><small className="text-[10px] uppercase tracking-[.24em] text-emerald-100/55">Intelligent finance</small></span>
        </a>
        <nav className="hidden items-center gap-9 text-sm text-emerald-50/65 md:flex">
          <a className="transition hover:text-white" href="#ecosystem">Ecosystem</a>
          <a className="transition hover:text-white" href="#how-it-works">How it works</a>
          <a className="transition hover:text-white" href="#security">Security</a>
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={onSignIn} className="hidden rounded-full px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 sm:inline-flex">Sign in</button>
          <button onClick={onGetStarted} className="inline-flex items-center gap-2 rounded-full bg-[#d9c58d] px-5 py-2.5 text-sm font-bold text-[#14251e] shadow-lg shadow-amber-950/20 transition hover:-translate-y-0.5 hover:bg-[#ead9a7]">Get started <ArrowUpRight size={16}/></button>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid min-h-[690px] max-w-7xl items-center gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1.02fr_.98fr] lg:px-10 lg:pb-28 lg:pt-16">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .75, ease: 'easeOut' }} className="relative z-10">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-100/15 bg-white/[.045] px-4 py-2 text-xs font-medium tracking-wide text-emerald-100/80 backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> One intelligent financial experience
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-.055em] sm:text-6xl lg:text-[4.65rem]">
              Your money,<br/><span className="bg-gradient-to-r from-[#e7d69f] via-[#f7f1d9] to-emerald-200 bg-clip-text text-transparent">in one intelligent</span><br/>flow.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-emerald-50/60 sm:text-lg">
              Connect the way you move money. Bring mobile payments, global payment experiences and digital asset insights into one clear financial workspace.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button onClick={onGetStarted} className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#d9c58d] px-7 py-4 text-sm font-bold text-[#14251e] transition hover:-translate-y-1 hover:shadow-[0_15px_50px_rgba(217,197,141,.18)]">Create your account <ArrowRight size={17} className="transition group-hover:translate-x-1"/></button>
              <button onClick={onSignIn} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[.035] px-7 py-4 text-sm font-semibold text-white/85 backdrop-blur transition hover:bg-white/10">I already have an account</button>
            </div>
            <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs text-emerald-50/45">
              <span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-300"/> User-controlled transactions</span>
              <span className="inline-flex items-center gap-2"><LockKeyhole size={14} className="text-emerald-300"/> Security-first architecture</span>
            </div>
          </motion.div>

          <div className="relative mx-auto flex aspect-square w-full max-w-[590px] items-center justify-center">
            <div className="absolute inset-[7%] rounded-full border border-emerald-100/10" />
            <div className="absolute inset-[17%] rounded-full border border-dashed border-emerald-100/15 animate-[spin_70s_linear_infinite]" />
            <div className="absolute inset-[28%] rounded-full border border-emerald-100/10" />
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 55, repeat: Infinity, ease: 'linear' }} className="absolute inset-[12%]">
              <span className="absolute left-1/2 top-0 h-3 w-3 rounded-full bg-[#e4ce91] shadow-[0_0_25px_#e4ce91]" />
              <span className="absolute bottom-[4%] right-[12%] h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_22px_#6ee7b7]" />
            </motion.div>
            <motion.div animate={{ y: [0, -12, 0], rotate: [0, 1.5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="relative z-10 w-[72%] rounded-[2rem] border border-white/15 bg-gradient-to-br from-[#164b40]/95 to-[#092923]/95 p-6 shadow-[0_35px_100px_rgba(0,0,0,.45)] backdrop-blur-xl sm:p-8">
              <div className="flex items-center justify-between"><div><p className="text-xs text-emerald-100/50">KASHFLOW OVERVIEW</p><p className="mt-1 text-sm font-semibold">Connected finance</p></div><span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] text-emerald-200">LIVE CONCEPT</span></div>
              <div className="mt-8"><p className="text-xs text-emerald-100/45">Your financial ecosystem</p><div className="mt-2 flex items-end justify-between"><span className="text-3xl font-semibold tracking-tight">One flow<span className="text-[#e4ce91]">.</span></span><span className="text-xs text-emerald-200">Connected services</span></div></div>
              <div className="my-7 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"/>
              <div className="space-y-3">
                {methods.map(({name,detail,icon:Icon,tone},i)=><motion.div key={name} initial={{opacity:0,x:18}} animate={{opacity:1,x:0}} transition={{delay:.35+i*.16}} className="flex items-center justify-between rounded-2xl border border-white/[.08] bg-white/[.045] p-3.5"><div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl bg-white/[.07] ${tone}`}><Icon size={19}/></span><span><strong className="block text-sm">{name}</strong><small className="text-xs text-emerald-50/40">{detail}</small></span></div><ArrowUpRight size={16} className="text-emerald-50/35"/></motion.div>)}
              </div>
              <div className="mt-6 flex items-center justify-between text-[10px] uppercase tracking-[.18em] text-emerald-50/35"><span>Designed around your control</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300"/> KASH AI</span></div>
            </motion.div>
            {floaters.map((item,i)=><motion.div key={item.label} animate={{y:[0,-10,0],x:[0,i%2?5:-5,0]}} transition={{duration:5+i*.7,repeat:Infinity,ease:'easeInOut',delay:item.delay}} style={{top:item.top,left:item.left,right:item.right,bottom:item.bottom}} className="absolute z-20 rounded-2xl border border-white/15 bg-[#0b3029]/90 px-4 py-3 shadow-xl shadow-black/20 backdrop-blur-xl"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-[10px] font-bold text-[#e7d69f]">{item.label}</span><span><strong className="block text-xs">{item.value}</strong><small className="text-[10px] text-emerald-200/65">{item.change}</small></span></div></motion.div>)}
          </div>
        </section>

        <section id="ecosystem" className="border-y border-white/[.08] bg-white/[.025]">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-3 lg:px-10">
            {[
              {icon: Smartphone,title:'Local payment rails',copy:'A mobile-money-first approach designed for everyday payments and collections.'},
              {icon: Globe2,title:'Global connections',copy:'A unified experience designed to connect local financial activity with global services.'},
              {icon: CircleDollarSign,title:'Digital asset insights',copy:'Explore market information and simulated crypto scenarios without custody or live trading.'},
            ].map(({icon:Icon,title,copy})=><div key={title} className="flex gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-100/10 bg-emerald-200/[.07] text-emerald-200"><Icon size={20}/></span><div><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-emerald-50/50">{copy}</p></div></div>)}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-2 lg:px-10 lg:py-28">
          <div><p className="text-xs font-bold uppercase tracking-[.24em] text-[#d9c58d]">A clearer financial picture</p><h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Less fragmentation.<br/>More financial clarity.</h2></div>
          <div className="grid gap-5 sm:grid-cols-2"><div className="rounded-3xl border border-white/10 bg-white/[.035] p-6"><Zap className="text-[#e4ce91]"/><h3 className="mt-5 font-semibold">One workspace</h3><p className="mt-2 text-sm leading-6 text-emerald-50/50">See your financial activity through a single, understandable interface.</p></div><div className="rounded-3xl border border-white/10 bg-white/[.035] p-6"><WalletCards className="text-emerald-200"/><h3 className="mt-5 font-semibold">Your decisions</h3><p className="mt-2 text-sm leading-6 text-emerald-50/50">AI can assist and recommend. You stay in control of financial actions.</p></div></div>
        </section>

        <section id="security" className="mx-auto max-w-7xl px-6 pb-20 lg:px-10"><div className="flex flex-col justify-between gap-7 rounded-[2rem] border border-emerald-100/15 bg-gradient-to-br from-[#164438] to-[#0b2a24] p-8 sm:p-12 md:flex-row md:items-center"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-200/65">Built with responsibility</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Intelligence should support trust, not replace it.</h2><p className="mt-3 text-sm leading-7 text-emerald-50/55">KASHFLOW separates AI recommendations from backend validation and user authorization. Payment requests are not treated as completed until provider confirmation is verified.</p></div><div className="flex shrink-0 items-center gap-3 text-sm text-emerald-100"><ShieldCheck size={22}/><span>Security-first by design</span></div></div></section>
      </main>

      <footer className="relative z-10 border-t border-white/[.08] px-6 py-8 text-center text-xs text-emerald-50/35"><strong className="tracking-[.2em] text-emerald-50/65">KASHFLOW</strong><span className="mx-3">·</span>Beyond Payments. One Intelligent Financial Experience.</footer>
    </div>
  );
}
