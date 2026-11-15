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
  const workingClaim = Object.values(negs).find((n) => ["CHECKING", "FILING", "TALKING"].includes(n.stage));
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
                </button>
              );
            })}
          </div>
        </nav>
        {workingClaim && (
          <div className="mx-3 mt-4 hidden items-center gap-2.5 rounded-xl border border-teal-100 bg-teal-50 px-3.5 py-2.5 lg:flex" role="status">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-teal-600" />
            <span className="min-w-0 text-[12.5px] leading-snug"><span className="block font-medium text-teal-900">Agent at work</span><span className="mono block truncate text-teal-700">{workingClaim.claimId}</span></span>
          </div>
        )}
        <div className="mt-auto hidden px-5 pt-4 pb-6 lg:block">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-[12px] text-slate-500">Money free to spend</p>
            <p className="mt-0.5 text-[19px] font-semibold text-slate-900">{money(reconciliation.available)}</p>
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
