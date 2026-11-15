"use client";
import { BookOpen, FolderOpen, RotateCcw, ScrollText } from "lucide-react";
import { Autopilot } from "@/components/Autopilot";
import { LedgerView } from "@/components/LedgerView";
import { Workspace } from "@/components/Workspace";
import { money } from "@/lib/format";
import { SubroProvider, useSubro, type View } from "@/lib/store";

const NAV: { id: View; sub: string; label: string; icon: typeof FolderOpen }[] = [
  { id: "trading", sub: "glance", label: "Claims", icon: FolderOpen },
  { id: "autopilot", sub: "log", label: "Log", icon: ScrollText },
  { id: "ledger", sub: "money", label: "Money in and out", icon: BookOpen },
];

function Shell() {
  const { view, setView, setSubtab, reconciliation, resetAll, purchases, negs } = useSubro();
  const working = Object.values(negs).filter((n) => ["CHECKING", "FILING", "TALKING"].includes(n.stage)).length;
  const go = (n: (typeof NAV)[number]) => { setView(n.id); setSubtab(n.sub); };

  return (
    <div className="grid h-screen overflow-hidden bg-[#f4f6f6] text-slate-800 lg:grid-cols-[218px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-white lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-[17px] font-bold text-white shadow-sm">S</div>
          <div>
            <div className="text-[17px] font-bold tracking-[0.16em] text-slate-900">SUBRO</div>
            <p className="text-[12px] leading-snug text-slate-500">Turn denied claims into money.</p>
          </div>
        </div>
        <nav aria-label="Main menu" className="px-3">
          <div className="flex gap-1 lg:block lg:space-y-1">
            {NAV.map((n) => {
              const active = view === n.id;
              return (
                <button key={n.id} onClick={() => go(n)} aria-current={active ? "page" : undefined} className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition lg:w-full ${active ? "bg-teal-50 font-semibold text-teal-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                  <n.icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-teal-700" : "text-slate-400"}`} />
                  {n.label}
                  {n.id === "trading" && working > 0 && <span className="ml-auto flex items-center gap-1.5 text-[12px] font-medium text-teal-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-600" />Agent working</span>}
                </button>
              );
            })}
          </div>
        </nav>
        <div className="mt-auto hidden px-5 pb-5 lg:block">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-[12px] text-slate-500">Money left to spend</p>
            <p className="mt-0.5 text-[19px] font-semibold text-slate-900">{money(reconciliation.remainingCapacity)}</p>
            <p className="mt-1 text-[12px] text-slate-400">{purchases.length} claims owned</p>
          </div>
          <button className="mt-3 flex items-center gap-1.5 text-[13px] text-slate-400 transition hover:text-slate-600" onClick={() => { if (confirm("Start fresh? Every bought claim, chase, and money entry will be wiped.")) resetAll(); }}>
            <RotateCcw className="h-3.5 w-3.5" /> Start fresh
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3.5 md:px-6">
          <h1 className="text-[19px] font-semibold tracking-tight text-slate-900">{NAV.find((n) => n.id === view)?.label ?? "Claims"}</h1>
          <p className="ml-auto text-sm text-slate-500">Money we can still spend <span className="ml-1 text-base font-semibold text-teal-800">{money(reconciliation.available)}</span></p>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden px-4 py-4 md:px-6">
          {view === "trading" && <Workspace />}
          {view === "autopilot" && <Autopilot />}
          {view === "ledger" && <LedgerView />}
          {view !== "trading" && view !== "autopilot" && view !== "ledger" && <Workspace />}
        </main>
      </div>
    </div>
  );
}

export default function Home() { return <SubroProvider><Shell /></SubroProvider>; }
