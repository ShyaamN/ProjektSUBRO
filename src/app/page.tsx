"use client";
import { useEffect, useState } from "react";
import { Activity, BookOpenCheck, FlaskConical, Landmark, LayoutDashboard, ScanSearch, ShieldAlert } from "lucide-react";
import { Arena } from "@/components/Arena";
import { CapitalDesk } from "@/components/CapitalDesk";
import { LedgerView } from "@/components/LedgerView";
import { Scenarios } from "@/components/Scenarios";
import { TradingFloor } from "@/components/TradingFloor";
import { UnderwritingDesk } from "@/components/UnderwritingDesk";
import { money } from "@/lib/format";
import { SubroProvider, useSubro, type View } from "@/lib/store";

const NAV: { id: View; label: string; icon: typeof LayoutDashboard; hint: string }[] = [
  { id: "trading", label: "Trading Floor", icon: LayoutDashboard, hint: "Portfolio intelligence" },
  { id: "underwriting", label: "Underwriting Desk", icon: ScanSearch, hint: "Deterministic pricing" },
  { id: "capital", label: "Capital Allocation", icon: Landmark, hint: "Constrained deployment" },
  { id: "arena", label: "Recovery Arena", icon: Activity, hint: "Bounded autonomous ops" },
  { id: "scenarios", label: "Scenario Laboratory", icon: FlaskConical, hint: "Asserted test cases" },
  { id: "ledger", label: "Ledger & Audit", icon: BookOpenCheck, hint: "Reconciled simulated books" },
];

function Shell() {
  const { view, setView, reconciliation, config, purchases, claims } = useSubro();
  const [ai, setAi] = useState("checking…");
  useEffect(() => { fetch("/api/status").then((r) => r.json()).then((d) => setAi(d.llmConfigured ? "LLM configured (server-side)" : "LLM not configured — deterministic drafting active")).catch(() => setAi("status unavailable — deterministic drafting active")); }, []);
  return (
    <div className="min-h-screen bg-[#0b0e11] text-zinc-200 lg:grid lg:grid-cols-[228px_minmax(0,1fr)]">
      <aside className="border-b border-[#20262e] bg-[#0d1116] lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 lg:block">
          <div><div className="text-[17px] font-bold tracking-[0.22em] text-white">SUBRO</div><div className="mt-0.5 text-[10px] tracking-[0.14em] text-teal-400 uppercase">ProjektSUBRO · Capital Ops</div></div>
          <span className="rounded-sm border border-amber-800/70 bg-amber-950/40 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-amber-300 lg:mt-3 lg:inline-block">SYNTHETIC SANDBOX</span>
        </div>
        <nav aria-label="Primary" className="flex gap-1 overflow-x-auto px-2 pb-3 lg:block lg:space-y-0.5">
          {NAV.map((n) => <button key={n.id} onClick={() => setView(n.id)} aria-current={view === n.id ? "page" : undefined} className={`flex min-w-[168px] items-center gap-2.5 rounded-sm px-2.5 py-2 text-left lg:w-full lg:min-w-0 ${view === n.id ? "bg-[#16211f] text-white" : "text-zinc-400 hover:bg-[#131920] hover:text-zinc-200"}`}><n.icon className={`h-4 w-4 shrink-0 ${view === n.id ? "text-teal-300" : "text-zinc-500"}`} /><span><span className="block text-[13px] font-medium">{n.label}</span><span className="block text-[10px] text-zinc-500">{n.hint}</span></span></button>)}
        </nav>
        <div className="hidden border-t border-[#20262e] px-4 py-3 text-[11px] leading-relaxed text-zinc-500 lg:block">No real patients, insurers, funds, or collections. Every transaction is simulated and labeled as such.</div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-[#20262e] bg-[#0d1116]/95 backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5">
            <h1 className="text-[14px] font-semibold text-white">{NAV.find((n) => n.id === view)?.label}</h1>
            <span className="hidden text-[11px] text-zinc-500 md:inline">{claims.length} synthetic claims · {purchases.length} financed · facility {money(config.availableCapital)}</span>
            <span className="ml-auto flex items-center gap-2 text-[11px] text-zinc-400"><ShieldAlert className="h-3.5 w-3.5 text-amber-400" />{ai}</span>
            <span className="text-[11px]"><span className="text-zinc-500">Available (sim.) </span><span className="num font-semibold text-teal-300">{money(reconciliation.available)}</span></span>
          </div>
        </header>
        <main className="mx-auto max-w-[1560px] p-3 md:p-4">
          {view === "trading" && <TradingFloor />}
          {view === "underwriting" && <UnderwritingDesk />}
          {view === "capital" && <CapitalDesk />}
          {view === "arena" && <Arena />}
          {view === "scenarios" && <Scenarios />}
          {view === "ledger" && <LedgerView />}
          <footer className="mt-6 border-t border-[#20262e] pt-3 pb-2 text-[11px] leading-relaxed text-zinc-600">SUBRO synthetic sandbox. Modeled probabilities are assumptions, expected values are not realized outcomes, and no ledger entry represents a real transfer or collection. Architecture is prepared for Supabase/PostgreSQL persistence (see <span className="mono">supabase/schema.sql</span>) and server-side LLM drafting when credentials are configured; the platform remains fully operational without them.</footer>
        </main>
      </div>
    </div>
  );
}

export default function Home() { return <SubroProvider><Shell /></SubroProvider>; }
