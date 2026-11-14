import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Bitcoin, Check, CircleDollarSign, CreditCard, Globe2, LockKeyhole, MoveUpRight, ShieldCheck, Smartphone, WalletCards, Zap } from 'lucide-react';

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
  return (
    <div className="min-h-screen overflow-hidden bg-[#090d1f] text-[#f5f4ec] selection:bg-indigo-300 selection:text-[#06221d]">
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
            <p className="mt-7 max-w-xl text-base leading-8 text-indigo-50/60 sm:text-lg">
              Connect the way you move money. Bring mobile payments, global payment experiences and digital asset insights into one clear financial workspace.
            </p>
            <a href="#ecosystem" className="mt-9 inline-flex items-center gap-2 text-sm font-semibold text-indigo-200 transition hover:text-white">Explore the KASHFLOW ecosystem <ArrowRight size={16}/></a>
            <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs text-indigo-50/45">
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
                <div className="cube-face cube-front"><span className="cube-kicker">GLOBAL PAYMENTS</span><span className="paypal-mark">P</span><strong className="text-2xl tracking-tight">PayPal</strong><span className="cube-caption">Move money worldwide</span></div>
                <div className="cube-face cube-right"><span className="cube-kicker">CARD NETWORK</span><div className="mastercard-mark"><i/><i/></div><strong className="text-xl tracking-[.12em]">mastercard</strong><span className="cube-caption">Pay with confidence</span></div>
                <div className="cube-face cube-back"><span className="cube-kicker">LOCAL PAYMENTS</span><span className="mobile-money-mark"><Smartphone size={54}/><span className="mobile-signal">•••</span></span><strong className="text-2xl">Mobile Money</strong><span className="cube-caption">Airtel · Orange · M-Pesa</span></div>
                <div className="cube-face cube-left"><span className="cube-kicker">ONE FINANCIAL FLOW</span><span className="grid h-16 w-16 place-items-center rounded-2xl border border-white/20 bg-white/10 text-4xl font-black">K</span><strong className="text-2xl tracking-[.14em]">KASHFLOW</strong><span className="cube-caption">One intelligent workspace</span></div>
                <div className="cube-face cube-top"><span className="text-4xl font-black tracking-widest">K</span><span className="text-xs uppercase tracking-[.3em]">KASHFLOW</span></div>
                <div className="cube-face cube-bottom"><span className="text-xs font-semibold uppercase tracking-[.3em]">CONNECTED FINANCE</span><span className="text-3xl">✦</span></div>
              </div>
              <div className="cube-orbit cube-orbit-one"/><div className="cube-orbit cube-orbit-two"/>
            </div>
            {floaters.map((item,i)=><motion.div key={item.label} animate={{y:[0,-10,0],x:[0,i%2?5:-5,0]}} transition={{duration:5+i*.7,repeat:Infinity,ease:'easeInOut',delay:item.delay}} style={{top:item.top,left:item.left,right:item.right,bottom:item.bottom}} className="absolute z-20 rounded-2xl border border-white/15 bg-[#0b3029]/90 px-4 py-3 shadow-xl shadow-black/20 backdrop-blur-xl"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-[10px] font-bold text-[#c7d2fe]">{item.label}</span><span><strong className="block text-xs">{item.value}</strong><small className="text-[10px] text-indigo-200/65">{item.change}</small></span></div></motion.div>)}
          </div>
        </section>

        <section id="ecosystem" className="border-y border-white/[.08] bg-white/[.025]">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-3 lg:px-10">
            {[
              {icon: Smartphone,title:'Local payment rails',copy:'A mobile-money-first approach designed for everyday payments and collections.'},
              {icon: Globe2,title:'Global connections',copy:'A unified experience designed to connect local financial activity with global services.'},
              {icon: CircleDollarSign,title:'Digital asset insights',copy:'Explore market information and simulated crypto scenarios without custody or live trading.'},
            ].map(({icon:Icon,title,copy})=><div key={title} className="flex gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-indigo-100/10 bg-indigo-200/[.07] text-indigo-200"><Icon size={20}/></span><div><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-indigo-50/50">{copy}</p></div></div>)}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-2 lg:px-10 lg:py-28">
          <div><p className="text-xs font-bold uppercase tracking-[.24em] text-[#8b9cff]">A clearer financial picture</p><h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Less fragmentation.<br/>More financial clarity.</h2></div>
          <div className="grid gap-5 sm:grid-cols-2"><div className="rounded-3xl border border-white/10 bg-white/[.035] p-6"><Zap className="text-[#a5b4fc]"/><h3 className="mt-5 font-semibold">One workspace</h3><p className="mt-2 text-sm leading-6 text-indigo-50/50">See your financial activity through a single, understandable interface.</p></div><div className="rounded-3xl border border-white/10 bg-white/[.035] p-6"><WalletCards className="text-indigo-200"/><h3 className="mt-5 font-semibold">Your decisions</h3><p className="mt-2 text-sm leading-6 text-indigo-50/50">AI can assist and recommend. You stay in control of financial actions.</p></div></div>
        </section>

        <section id="security" className="mx-auto max-w-7xl px-6 pb-20 lg:px-10"><div className="flex flex-col justify-between gap-7 rounded-[2rem] border border-indigo-100/15 bg-gradient-to-br from-[#202e61] to-[#111a35] p-8 sm:p-12 md:flex-row md:items-center"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.22em] text-indigo-200/65">Built with responsibility</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Intelligence should support trust, not replace it.</h2><p className="mt-3 text-sm leading-7 text-indigo-50/55">KASHFLOW separates AI recommendations from backend validation and user authorization. Payment requests are not treated as completed until provider confirmation is verified.</p></div><div className="flex shrink-0 items-center gap-3 text-sm text-indigo-100"><ShieldCheck size={22}/><span>Security-first by design</span></div></div></section>
      </main>

      <footer className="relative z-10 border-t border-white/[.08] bg-[#070b19]/90 px-6 pb-9 pt-12">
        <div className="mx-auto max-w-7xl lg:px-4">
          <div className="flex flex-col justify-between gap-5 border-b border-white/[.08] pb-8 sm:flex-row sm:items-end">
            <div><p className="text-[10px] font-bold uppercase tracking-[.28em] text-indigo-300/75">Connected ecosystem</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">One flow. Multiple ways to move.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-indigo-50/45">A unified experience designed around global payment services, local mobile money and KASHFLOW intelligence.</p></div>
            <span className="text-[10px] uppercase tracking-[.2em] text-indigo-100/35">Ecosystem overview · Not a claim of formal partnership</span>
          </div>
          <div className="grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {name:'PayPal',tag:'Global payment experience',mark:'P',style:'from-blue-500/25 to-sky-300/5',sub:'International payments'},
              {name:'Mobile Money',tag:'Local payment rails',mark:'M',style:'from-emerald-400/20 to-teal-300/5',sub:'Airtel · Orange · M-Pesa'},
              {name:'KASHFLOW',tag:'The intelligent layer',mark:'K',style:'from-indigo-400/25 to-violet-300/5',sub:'One financial workspace'},
              {name:'Card networks',tag:'Card payment ecosystem',mark:'◉',style:'from-amber-300/20 to-orange-300/5',sub:'Card experiences'},
            ].map((item)=><div key={item.name} className="group [perspective:1000px]">
              <div className="relative h-36 rounded-2xl transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                <div className={`absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${item.style} p-5 [backface-visibility:hidden]`}>
                  <div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-[.2em] text-indigo-100/45">KASHFLOW NETWORK</span><ArrowUpRight size={15} className="text-indigo-100/45"/></div>
                  <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl border border-white/15 bg-white/[.08] text-2xl font-black text-white shadow-lg">{item.mark}</span><div><strong className="block text-base text-white">{item.name}</strong><span className="mt-1 block text-[10px] text-indigo-50/50">{item.tag}</span></div></div>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-indigo-200/20 bg-[#17234a] p-5 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]"><span className="mb-2 text-[9px] font-bold uppercase tracking-[.2em] text-indigo-200/55">Designed to connect</span><strong className="text-sm text-white">{item.name}</strong><span className="mt-2 text-xs text-indigo-100/55">{item.sub}</span></div>
              </div>
            </div>)}
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-white/[.08] pt-6 text-center text-[11px] text-indigo-50/35 sm:flex-row sm:text-left"><div><strong className="tracking-[.22em] text-indigo-50/75">KASHFLOW</strong><span className="mx-2">·</span>Beyond Payments. One Intelligent Financial Experience.</div><div className="flex items-center gap-2"><ShieldCheck size={13} className="text-indigo-300"/> AI recommends. You authorize. Providers confirm.</div><span>© {new Date().getFullYear()} KASHFLOW</span></div>
        </div>
      </footer>
    </div>
  );
}
