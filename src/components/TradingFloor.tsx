"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge, Bar, Kpi, Pager, Panel, inputCls, useFitRows } from "./ui";
import { ClaimDetail } from "./ClaimDetail";
import { portfolioAnalytics, underwrite } from "@/lib/finance";
import { compact, money, pct } from "@/lib/format";
import { categoryLabel, decisionLabel, decisionTone } from "@/lib/labels";
import { DENIAL_CATEGORIES, INSURERS } from "@/lib/seed";
import { useSubro } from "@/lib/store";

export function TradingFloor() {
  const { claims, selectedId, select, setSubtab, subtab, reconciliation, config } = useSubro();
  const { ref: tableRef, rows: perPage } = useFitRows<HTMLDivElement>(56, 40, 4, 14);
  const [q, setQ] = useState(""); const [insurer, setInsurer] = useState("ALL"); const [cat, setCat] = useState("ALL"); const [verdict, setVerdict] = useState("ALL"); const [sort, setSort] = useState("collectible");
  const [page, setPage] = useState(0);
  const a = useMemo(() => portfolioAnalytics(claims, config.minContribution), [claims, config.minContribution]);
  const rows = useMemo(() => claims.map((c) => ({ c, uw: underwrite(c, { minContribution: config.minContribution }) }))
    .filter(({ c, uw }) => (!q || `${c.id} ${c.clinic} ${c.insurer} ${c.denialReason}`.toLowerCase().includes(q.toLowerCase())) && (insurer === "ALL" || c.insurer === insurer) && (cat === "ALL" || c.denialCategory === cat) && (verdict === "ALL" || uw.decision === verdict))
    .sort((x, y) => sort === "collectible" ? y.c.collectible - x.c.collectible : sort === "expected" ? y.uw.expectedCollection - x.uw.expectedCollection : sort === "probability" ? y.c.recoveryProbability - x.c.recoveryProbability : x.c.deadline.localeCompare(y.c.deadline)), [claims, q, insurer, cat, verdict, sort, config.minContribution]);
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const safePage = Math.min(page, pages - 1);
  const pageRows = rows.slice(safePage * perPage, safePage * perPage + perPage);
  const selected = claims.find((c) => c.id === selectedId) ?? claims[0];
  const maxInsurer = Math.max(...a.byInsurer.map((x) => x.value), 1);
  const maxCategory = Math.max(...a.byCategory.map((x) => x.value), 1);
  const changeFilter = (fn: () => void) => { fn(); setPage(0); };

  if (subtab === "one") return <div className="h-full min-h-0">{selected && <ClaimDetail claim={selected} />}</div>;

  if (subtab === "list") return (
    <div className="flex h-full min-h-0 flex-col">
      <Panel title="All claims" sub="Pick any row to open the full story of that claim." className="flex min-h-0 flex-1 flex-col" right={<Pager page={safePage} pages={pages} onPage={setPage} />}>
        <div className="mb-3 grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative sm:col-span-2 xl:col-span-4"><Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" /><input aria-label="Search claims" className={`${inputCls} pl-9`} placeholder="Search by clinic, insurer, or claim number" value={q} onChange={(e) => changeFilter(() => setQ(e.target.value))} /></div>
          <select aria-label="Filter by insurer" className={inputCls} value={insurer} onChange={(e) => changeFilter(() => setInsurer(e.target.value))}><option value="ALL">All insurers</option>{INSURERS.map((x) => <option key={x}>{x}</option>)}</select>
          <select aria-label="Filter by reason" className={inputCls} value={cat} onChange={(e) => changeFilter(() => setCat(e.target.value))}><option value="ALL">All reasons</option>{DENIAL_CATEGORIES.map((x) => <option key={x} value={x}>{categoryLabel(x)}</option>)}</select>
          <select aria-label="Filter by verdict" className={inputCls} value={verdict} onChange={(e) => changeFilter(() => setVerdict(e.target.value))}><option value="ALL">All verdicts</option><option value="BUY CANDIDATE">Worth buying</option><option value="NEEDS REVIEW">Needs a closer look</option><option value="DECLINE">Skip it</option></select>
          <select aria-label="Sort claims" className={inputCls} value={sort} onChange={(e) => changeFilter(() => setSort(e.target.value))}><option value="collectible">Biggest first</option><option value="expected">Expected biggest</option><option value="probability">Best chance first</option><option value="deadline">Deadline soonest</option></select>
        </div>
        <div ref={tableRef} className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full table-fixed text-sm">
            <colgroup><col className="w-[11%]" /><col className="w-[24%]" /><col className="w-[27%]" /><col className="w-[13%]" /><col className="w-[12%]" /><col className="w-[13%]" /></colgroup>
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr>{["Claim", "Clinic and insurer", "Why it was turned down", "Insurer may owe", "Chance we get paid", "Verdict"].map((h, i) => <th key={h} className={`truncate px-3 py-2.5 font-medium ${i >= 3 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
            <tbody>{pageRows.map(({ c, uw }) => (
              <tr key={c.id} onClick={() => { select(c.id); setSubtab("one"); }} className={`cursor-pointer border-t border-slate-100 hover:bg-teal-50/60 ${c.id === selectedId ? "bg-teal-50" : ""}`}>
                <td className="mono truncate px-3 py-2 text-[13px] font-medium text-teal-800">{c.id}</td>
                <td className="px-3 py-2 text-slate-700"><span className="block truncate">{c.clinic}</span><span className="block truncate text-xs text-slate-400">{c.insurer}</span></td>
                <td className="truncate px-3 py-2 text-slate-500">{c.denialReason}</td>
                <td className="num px-3 py-2 font-medium text-slate-900">{money(c.collectible)}</td>
                <td className="num px-3 py-2 text-slate-600">{pct(c.recoveryProbability, 0)}</td>
                <td className="px-3 py-2 text-right"><Badge tone={decisionTone(uw.decision)}>{decisionLabel(uw.decision)}</Badge></td>
              </tr>))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Nothing matches. Try clearing one of the choices above.</p>}
        </div>
        <p className="mt-2 shrink-0 text-[13px] text-slate-400">{rows.length} claims match · showing {pageRows.length} on this page</p>
      </Panel>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Insurers may still owe" value={money(a.collectible)} hint={`Across all ${a.count} claims in the book.`} tone="text-teal-800" />
        <Kpi label="We expect to get back" value={money(a.expectedCollection)} hint="On average, based on our best guess for each claim." />
        <Kpi label="Claims worth buying today" value={String(a.buyCount)} hint={`${money(a.proposedAdvance)} would pay those clinics now.`} tone="text-emerald-700" />
        <Kpi label="Money left to spend" value={money(reconciliation.remainingCapacity)} hint={`Out of ${money(config.availableCapital)} in total.`} tone={reconciliation.remainingCapacity < 0 ? "text-red-700" : "text-slate-900"} />
      </div>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <Panel title="Which insurers may owe the most" sub="The longer the bar, the more money that insurer may still owe.">
          <div className="space-y-3">{a.byInsurer.map((x) => <div key={x.name}><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="text-slate-600">{x.name}</span><span className="num font-medium text-slate-800">{compact(x.value)}</span></div><Bar value={x.value} max={maxInsurer} /></div>)}</div>
        </Panel>
        <Panel title="Why claims get turned down" sub="Grouped by the main reason the insurer gave.">
          <div className="space-y-3">{a.byCategory.map((x) => <div key={x.name}><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="text-slate-600">{categoryLabel(x.name)}</span><span className="num font-medium text-slate-800">{compact(x.value)}</span></div><Bar value={x.value} max={maxCategory} tone="bg-sky-500" /></div>)}</div>
        </Panel>
      </div>
    </div>
  );
}
