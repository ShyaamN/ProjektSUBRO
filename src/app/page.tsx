"use client";
import { Activity, BookOpen, ClipboardCheck, Coins, FolderOpen, Sparkles } from "lucide-react";
import { Arena } from "@/components/Arena";
import { CapitalDesk } from "@/components/CapitalDesk";
import { LedgerView } from "@/components/LedgerView";
import { Scenarios } from "@/components/Scenarios";
import { TradingFloor } from "@/components/TradingFloor";
import { UnderwritingDesk } from "@/components/UnderwritingDesk";
import { money } from "@/lib/format";
import { SubroProvider, useSubro, type View } from "@/lib/store";

const NAV: { id: View; label: string; icon: typeof FolderOpen; intro: string }[] = [
  { id: "trading", label: "Claims", icon: FolderOpen, intro: "Every claim an insurer turned down, and what each one could be worth." },
  { id: "underwriting", label: "Decide", icon: ClipboardCheck, intro: "Should we buy this claim? The numbers, in plain words." },
  { id: "capital", label: "Buy claims", icon: Coins, intro: "Pick the claims worth buying with the money we have." },
  { id: "arena", label: "Chase a claim", icon: Activity, intro: "Watch the helper chase a claim, step by step." },
  { id: "scenarios", label: "Examples", icon: Sparkles, intro: "Ready made stories that show how it all works." },
  { id: "ledger", label: "Money in and out", icon: BookOpen, intro: "Every dollar that went out and came back, in one place." },
];

function Shell() {
  const { view, setView, reconciliation } = useSubro();
  const current = NAV.find((n) => n.id === view) ?? NAV[0];
  return (
    <div className="min-h-screen bg-[#f4f6f6] text-slate-800 lg:grid lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <div className="px-5 pt-6 pb-4">
          <div className="text-[20px] font-bold tracking-[0.18em] text-slate-900">SUBRO</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">Turn denied claims into money.</p>
        </div>
        <nav aria-label="Main menu" className="flex gap-1 overflow-x-auto px-3 pb-4 lg:block lg:space-y-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)} aria-current={view === n.id ? "page" : undefined} className={`flex min-w-[150px] items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm lg:w-full lg:min-w-0 ${view === n.id ? "bg-teal-50 font-semibold text-teal-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
              <n.icon className={`h-4.5 w-4.5 shrink-0 ${view === n.id ? "text-teal-700" : "text-slate-400"}`} />
              {n.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-5 md:px-6">
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">{current.label}</h1>
              <p className="mt-0.5 text-sm text-slate-500">{current.intro}</p>
            </div>
            <p className="ml-auto text-sm text-slate-500">Money we can still spend <span className="ml-1 text-base font-semibold text-teal-800">{money(reconciliation.available)}</span></p>
          </div>
        </header>
        <main className="mx-auto max-w-[1280px] px-4 py-6 md:px-6">
          {view === "trading" && <TradingFloor />}
          {view === "underwriting" && <UnderwritingDesk />}
          {view === "capital" && <CapitalDesk />}
          {view === "arena" && <Arena />}
          {view === "scenarios" && <Scenarios />}
          {view === "ledger" && <LedgerView />}
          <footer className="mt-10 pb-4 text-[12.5px] text-slate-400">All amounts are in dollars. Guesses are marked as guesses, so they are never mixed up with money that has really come in.</footer>
        </main>
      </div>
    </div>
  );
}

export default function Home() { return <SubroProvider><Shell /></SubroProvider>; }
