"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge, Bar, Kpi, Panel, inputCls } from "./ui";
import { ClaimDetail } from "./ClaimDetail";
import { portfolioAnalytics, underwrite } from "@/lib/finance";
import { compact, money, pct } from "@/lib/format";
import { decisionLabel, decisionTone } from "@/lib/labels";
import { DENIAL_CATEGORIES, INSURERS } from "@/lib/seed";
import { useSubro } from "@/lib/store";

type SortKey = "collectible" | "expected" | "probability" | "deadline";

const CATEGORY_WORDS: Record<string, string> = {
  "Medical Necessity": "Insurer says the care was not needed",
  "Prior Authorization": "No approval was given first",
  "Coding / Documentation": "The bill and the notes do not match",
  Eligibility: "Patient cover is in doubt",
  "Timely Filing": "Claim may have arrived too late",
  "Coordination of Benefits": "Another insurer may need to pay first",
  "Duplicate Claim": "Claim may have been sent twice",
  "Bundling / Edits": "Charge may already be included in another charge",
};

export function TradingFloor() {
  const { claims, selectedId, select, reconciliation, config } = useSubro();
  const [q, setQ] = useState(""); const [insurer, setInsurer] = useState("ALL"); const [cat, setCat] = useState("ALL"); const [verdict, setVerdict] = useState("ALL"); const [sort, setSort] = useState<SortKey>("collectible");
  const a = useMemo(() => portfolioAnalytics(claims, config.minContribution), [claims, config.minContribution]);
  const rows = useMemo(() => claims.map((c) => ({ c, uw: underwrite(c, { minContribution: config.minContribution }) }))
    .filter(({ c, uw }) => (!q || `${c.id} ${c.clinic} ${c.insurer} ${c.denialReason}`.toLowerCase().includes(q.toLowerCase())) && (insurer === "ALL" || c.insurer === insurer) && (cat === "ALL" || c.denialCategory === cat) && (verdict === "ALL" || uw.decision === verdict))
    .sort((x, y) => sort === "collectible" ? y.c.collectible - x.c.collectible : sort === "expected" ? y.uw.expectedCollection - x.uw.expectedCollection : sort === "probability" ? y.c.recoveryProbability - x.c.recoveryProbability : x.c.deadline.localeCompare(y.c.deadline)), [claims, q, insurer, cat, verdict, sort, config.minContribution]);
  const selected = claims.find((c) => c.id === selectedId) ?? claims[0];
  const maxInsurer = Math.max(...a.byInsurer.map((x) => x.value), 1);
  const maxCategory = Math.max(...a.byCategory.map((x) => x.value), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Insurers may still owe" value={money(a.collectible)} hint={`Across all ${a.count} claims on this page.`} tone="text-teal-800" />
        <Kpi label="We expect to get back" value={money(a.expectedCollection)} hint="On average, based on our best guess for each claim." />
        <Kpi label="Claims worth buying today" value={String(a.buyCount)} hint={`${money(a.proposedAdvance)} would pay those clinics now.`} tone="text-emerald-700" />
        <Kpi label="Money left to spend" value={money(reconciliation.remainingCapacity)} hint={`Out of ${money(config.availableCapital)} in total.`} tone={reconciliation.remainingCapacity < 0 ? "text-red-700" : "text-slate-900"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Which insurers may owe the most" sub="The taller the bar, the more money that insurer may still owe.">
          <div className="space-y-3">{a.byInsurer.map((x) => <div key={x.name}><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="text-slate-600">{x.name}</span><span className="num font-medium text-slate-800">{compact(x.value)}</span></div><Bar value={x.value} max={maxInsurer} /></div>)}</div>
        </Panel>
        <Panel title="Why claims get turned down" sub="Grouped by the main reason the insurer gave.">
          <div className="space-y-3">{a.byCategory.map((x) => <div key={x.name}><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="text-slate-600">{CATEGORY_WORDS[x.name] ?? x.name}</span><span className="num font-medium text-slate-800">{compact(x.value)}</span></div><Bar value={x.value} max={maxCategory} tone="bg-sky-500" /></div>)}</div>
        </Panel>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel title="All claims" sub="Pick any row to see the full story on the right." right={<span className="text-sm text-slate-400">{rows.length} shown</span>}>
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <div className="relative md:col-span-2"><Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" /><input aria-label="Search claims" className={`${inputCls} pl-9`} placeholder="Search by clinic, insurer, or claim number" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <select aria-label="Filter by insurer" className={inputCls} value={insurer} onChange={(e) => setInsurer(e.target.value)}><option value="ALL">All insurers</option>{INSURERS.map((x) => <option key={x}>{x}</option>)}</select>
            <select aria-label="Filter by reason" className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}><option value="ALL">All reasons</option>{DENIAL_CATEGORIES.map((x) => <option key={x} value={x}>{CATEGORY_WORDS[x] ?? x}</option>)}</select>
            <select aria-label="Filter by verdict" className={inputCls} value={verdict} onChange={(e) => setVerdict(e.target.value)}><option value="ALL">All verdicts</option><option value="BUY CANDIDATE">Worth buying</option><option value="NEEDS REVIEW">Needs a closer look</option><option value="DECLINE">Skip it</option></select>
            <select aria-label="Sort claims" className={inputCls} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}><option value="collectible">Biggest amount first</option><option value="expected">Biggest expected amount first</option><option value="probability">Best chance first</option><option value="deadline">Soonest deadline first</option></select>
          </div>
          <div className="max-h-[620px] overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500"><tr>{["Claim", "Clinic and insurer", "Why it was turned down", "Insurer may owe", "Chance we get paid", "Verdict"].map((h, i) => <th key={h} className={`px-4 py-3 font-medium ${i >= 3 && i <= 4 ? "text-right" : ""} ${i === 5 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
              <tbody>{rows.map(({ c, uw }) => (
                <tr key={c.id} onClick={() => select(c.id)} className={`cursor-pointer border-t border-slate-100 hover:bg-teal-50/50 ${c.id === selectedId ? "bg-teal-50" : ""}`}>
                  <td className="mono px-4 py-3 text-[13px] font-medium text-teal-800">{c.id}</td>
                  <td className="px-4 py-3 text-slate-700">{c.clinic}<span className="block text-xs text-slate-400">{c.insurer}</span></td>
                  <td className="max-w-[230px] px-4 py-3 text-slate-500">{c.denialReason}</td>
                  <td className="num px-4 py-3 font-medium text-slate-900">{money(c.collectible)}</td>
                  <td className="num px-4 py-3 text-slate-600">{pct(c.recoveryProbability, 0)}</td>
                  <td className="px-4 py-3 text-right"><Badge tone={decisionTone(uw.decision)}>{decisionLabel(uw.decision)}</Badge></td>
                </tr>))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Nothing matches. Try clearing one of the choices above.</p>}
          </div>
        </Panel>
        {selected && <ClaimDetail claim={selected} />}
      </div>
    </div>
  );
}
