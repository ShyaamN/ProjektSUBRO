"use client";
import { Activity, BookOpen, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Coins, FolderOpen, Sparkles } from "lucide-react";
import { Arena } from "@/components/Arena";
import { CapitalDesk } from "@/components/CapitalDesk";
import { LedgerView } from "@/components/LedgerView";
import { Scenarios } from "@/components/Scenarios";
import { TradingFloor } from "@/components/TradingFloor";
import { UnderwritingDesk } from "@/components/UnderwritingDesk";
import { InfoTip } from "@/components/ui";
import { money } from "@/lib/format";
import { firstSection, SECTIONS } from "@/lib/nav";
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
  const { view, setView, subtab, setSubtab, reconciliation } = useSubro();
  const current = NAV.find((n) => n.id === view) ?? NAV[0];
  const sections = SECTIONS[view];
  const idx = Math.max(0, sections.findIndex((s) => s.id === subtab));
  const goSection = (i: number) => { const next = sections[Math.min(sections.length - 1, Math.max(0, i))]; if (next) setSubtab(next.id); };
  const goView = (v: View) => { setView(v); setSubtab(firstSection(v)); };

  return (
    <div className="grid h-screen overflow-hidden bg-[#f4f6f6] text-slate-800 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-white lg:border-r lg:border-b-0">
        <div className="px-5 pt-6 pb-4">
          <div className="text-[20px] font-bold tracking-[0.18em] text-slate-900">SUBRO</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">Turn denied claims into money.</p>
        </div>
        <nav aria-label="Main menu" className="min-h-0 flex-1 overflow-hidden px-3 pb-4">
          <div className="flex flex-wrap gap-1 lg:block lg:space-y-1">
            {NAV.map((n) => {
              const active = view === n.id;
              return (
                <div key={n.id} className="shrink-0 lg:shrink">
                  <button onClick={() => goView(n.id)} aria-current={active ? "page" : undefined} aria-expanded={active} className={`flex w-full min-w-[150px] items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm lg:min-w-0 ${active ? "bg-teal-50 font-semibold text-teal-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                    <n.icon className={`h-4.5 w-4.5 shrink-0 ${active ? "text-teal-700" : "text-slate-400"}`} />
                    <span className="flex-1">{n.label}</span>
                    {active && <ChevronDown className="h-4 w-4 text-teal-600" />}
                  </button>
                  {active && (
                    <div className="mt-0.5 ml-4 hidden border-l border-slate-200 pl-2 lg:block">
                      {SECTIONS[n.id].map((s) => (
                        <button key={s.id} onClick={() => setSubtab(s.id)} aria-current={subtab === s.id ? "page" : undefined} className={`block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] ${subtab === s.id ? "bg-teal-700 font-medium text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>{s.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-1 lg:hidden">
            {sections.map((s) => (
              <button key={s.id} onClick={() => setSubtab(s.id)} className={`rounded-full border px-3 py-1.5 text-[13px] whitespace-nowrap ${subtab === s.id ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-slate-600"}`}>{s.label}</button>
            ))}
          </div>
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="shrink-0 border-b border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 md:px-6">
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-semibold tracking-tight text-slate-900">{current.label}</h1>
              <InfoTip text={current.intro} label={`What is ${current.label}?`} />
            </div>
            <p className="ml-auto text-sm text-slate-500">Money we can still spend <span className="ml-1 text-base font-semibold text-teal-800">{money(reconciliation.available)}</span></p>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden px-4 py-4 md:px-6">
          {view === "trading" && <TradingFloor />}
          {view === "underwriting" && <UnderwritingDesk />}
          {view === "capital" && <CapitalDesk />}
          {view === "arena" && <Arena />}
          {view === "scenarios" && <Scenarios />}
          {view === "ledger" && <LedgerView />}
        </main>

        <footer className="flex shrink-0 items-center gap-3 border-t border-slate-200 bg-white px-4 py-2.5 md:px-6">
          <button type="button" onClick={() => goSection(idx - 1)} disabled={idx <= 0} aria-label="Previous section" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-teal-600 hover:text-teal-700 disabled:opacity-35"><ChevronLeft className="h-4 w-4" /></button>
          <p className="text-sm text-slate-500">{sections[idx]?.label} <span className="text-slate-400">· section {idx + 1} of {sections.length}</span></p>
          <span className="ml-auto hidden items-center gap-1.5 text-[12.5px] text-slate-400 sm:flex">All amounts are in dollars. <InfoTip text="Guesses are marked as guesses, so they are never mixed up with money that has really come in." label="About guesses and real money" /></span>
          <button type="button" onClick={() => goSection(idx + 1)} disabled={idx >= sections.length - 1} aria-label="Next section" className="flex h-9 items-center gap-1 rounded-lg bg-teal-700 px-3 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-35">Next <ChevronRight className="h-4 w-4" /></button>
        </footer>
      </div>
    </div>
  );
}

export default function Home() { return <SubroProvider><Shell /></SubroProvider>; }
