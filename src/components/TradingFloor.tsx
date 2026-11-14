"use client";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Search } from "lucide-react";
import { Badge, Bar as HBar, Kpi, Panel, inputCls } from "./ui";
import { ClaimDetail, decisionTone } from "./ClaimDetail";
import { portfolioAnalytics, underwrite } from "@/lib/finance";
import { compact, money, pct } from "@/lib/format";
import { DENIAL_CATEGORIES, INSURERS } from "@/lib/seed";
import { useSubro } from "@/lib/store";

type SortKey = "collectible" | "expected" | "probability" | "billed" | "deadline";
export function TradingFloor() {
  const { claims, selectedId, select, purchases, reconciliation, config } = useSubro();
  const [q, setQ] = useState(""); const [insurer, setInsurer] = useState("ALL"); const [cat, setCat] = useState("ALL"); const [decision, setDecision] = useState("ALL"); const [sort, setSort] = useState<SortKey>("collectible");
  const a = useMemo(() => portfolioAnalytics(claims, config.minContribution), [claims, config.minContribution]);
  const rows = useMemo(() => claims.map((c) => ({ c, uw: underwrite(c, { minContribution: config.minContribution }) }))
    .filter(({ c, uw }) => (!q || `${c.id} ${c.clinic} ${c.insurer} ${c.denialReason}`.toLowerCase().includes(q.toLowerCase())) && (insurer === "ALL" || c.insurer === insurer) && (cat === "ALL" || c.denialCategory === cat) && (decision === "ALL" || uw.decision === decision))
    .sort((x, y) => sort === "collectible" ? y.c.collectible - x.c.collectible : sort === "expected" ? y.uw.expectedCollection - x.uw.expectedCollection : sort === "probability" ? y.c.recoveryProbability - x.c.recoveryProbability : sort === "billed" ? y.c.billed - x.c.billed : x.c.deadline.localeCompare(y.c.deadline)), [claims, q, insurer, cat, decision, sort, config.minContribution]);
  const selected = claims.find((c) => c.id === selectedId) ?? claims[0];
  const maxInsurer = Math.max(...a.byInsurer.map((x) => x.value), 1);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Receivables analyzed" value={money(a.billed)} hint={`${a.count} synthetic claims · billed ≠ collectible`} />
        <Kpi label="Insurer collectible" value={money(a.collectible)} hint="Allowed − patient responsibility" tone="text-teal-300" />
        <Kpi label="Modeled expected collection" value={money(a.expectedCollection)} hint="Σ collectible × modeled probability" />
        <Kpi label="Proposed financing (buys)" value={money(a.proposedAdvance)} hint={`${a.buyCount} buy · ${a.reviewCount} review · ${a.declineCount} decline`} />
        <Kpi label="Deployed capital" value={money(reconciliation.deployed)} hint={`${purchases.length} simulated purchases`} tone="text-cyan-300" />
        <Kpi label="Remaining capital" value={money(reconciliation.remainingCapacity)} hint={`of ${money(config.availableCapital)} facility`} tone={reconciliation.remainingCapacity < 0 ? "text-red-300" : "text-emerald-300"} />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Exposure by insurer" sub="Potential collectible concentration"><div className="space-y-2">{a.byInsurer.map((x) => <div key={x.name}><div className="mb-1 flex justify-between text-[11px]"><span className="text-zinc-400">{x.name}</span><span className="num text-zinc-200">{compact(x.value)} · {pct(x.value / a.collectible, 0)}</span></div><HBar value={x.value} max={maxInsurer} /></div>)}</div></Panel>
        <Panel title="Exposure by denial category" sub="Potential collectible"><div className="h-[212px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={a.byCategory} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}><CartesianGrid stroke="#20262e" horizontal={false} /><XAxis type="number" tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v: number) => compact(v)} /><YAxis type="category" dataKey="name" width={118} tick={{ fill: "#a1a1aa", fontSize: 10 }} /><Tooltip formatter={(v) => money(Number(v))} contentStyle={{ background: "#151a20", border: "1px solid #2b343f", fontSize: 12 }} /><Bar dataKey="value" fill="#2dd4bf" radius={[0, 2, 2, 0]} /></BarChart></ResponsiveContainer></div></Panel>
        <Panel title="Risk distribution" sub="Modeled recovery probability (assumption)"><div className="space-y-2.5">{a.risk.map((x) => <div key={x.name}><div className="mb-1 flex justify-between text-[11px]"><span className="text-zinc-400">{x.name}</span><span className="num text-zinc-200">{x.value} claims</span></div><HBar value={x.value} max={a.count} tone={x.name.startsWith("p ≥") ? "bg-emerald-500" : x.name.startsWith("p 50") ? "bg-teal-500" : x.name.startsWith("p 35") ? "bg-amber-500" : "bg-red-500"} /></div>)}</div><p className="mt-3 text-[11px] leading-relaxed text-zinc-500">Probabilities are underwriting assumptions pending validated empirical calibration. They are never presented as observed recovery rates.</p></Panel>
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Denied receivables book" sub={`${rows.length} of ${claims.length} claims · click a row for the underwriting file`} right={<Badge tone="zinc">SYNTHETIC SANDBOX</Badge>}>
          <div className="mb-3 grid gap-2 md:grid-cols-[1fr_170px_180px_150px_150px]">
            <div className="relative"><Search className="absolute top-2 left-2 h-4 w-4 text-zinc-600" /><input aria-label="Search claims" className={`${inputCls} pl-8`} placeholder="Search claim, clinic, insurer, reason…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <select aria-label="Insurer filter" className={inputCls} value={insurer} onChange={(e) => setInsurer(e.target.value)}><option value="ALL">All insurers</option>{INSURERS.map((x) => <option key={x}>{x}</option>)}</select>
            <select aria-label="Category filter" className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}><option value="ALL">All categories</option>{DENIAL_CATEGORIES.map((x) => <option key={x}>{x}</option>)}</select>
            <select aria-label="Decision filter" className={inputCls} value={decision} onChange={(e) => setDecision(e.target.value)}><option value="ALL">All decisions</option><option>BUY CANDIDATE</option><option>NEEDS REVIEW</option><option>DECLINE</option></select>
            <select aria-label="Sort claims" className={inputCls} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}><option value="collectible">Sort: collectible</option><option value="expected">Sort: expected collection</option><option value="probability">Sort: probability</option><option value="billed">Sort: billed</option><option value="deadline">Sort: deadline</option></select>
          </div>
          <div className="max-h-[560px] overflow-auto rounded-sm border border-[#20262e]">
            <table className="w-full min-w-[820px] text-[12px]">
              <thead className="sticky top-0 bg-[#151a20] text-left text-[10px] tracking-wider text-zinc-500 uppercase"><tr>{["Claim", "Clinic / Insurer", "Category", "Billed", "Collectible", "p (modeled)", "Expected", "Decision"].map((h, i) => <th key={h} className={`px-2.5 py-2 font-medium ${i >= 3 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
              <tbody>{rows.map(({ c, uw }) => <tr key={c.id} onClick={() => select(c.id)} className={`cursor-pointer border-t border-[#1d232b] hover:bg-[#171d24] ${c.id === selectedId ? "bg-[#14211f]" : ""}`}><td className="mono px-2.5 py-2 text-teal-300">{c.id}{c.scenario ? <span className="block font-sans text-[10px] text-zinc-500">{c.scenario}</span> : null}</td><td className="px-2.5 py-2 text-zinc-300">{c.clinic}<span className="block text-[11px] text-zinc-500">{c.insurer}</span></td><td className="px-2.5 py-2 text-zinc-400">{c.denialCategory}</td><td className="num px-2.5 py-2 text-zinc-400">{money(c.billed)}</td><td className="num px-2.5 py-2 font-medium text-zinc-100">{money(c.collectible)}</td><td className="num px-2.5 py-2">{pct(c.recoveryProbability, 0)}</td><td className="num px-2.5 py-2">{money(uw.expectedCollection)}</td><td className="px-2.5 py-2 text-right"><Badge tone={decisionTone(uw.decision)}>{uw.decision}</Badge></td></tr>)}</tbody>
            </table>
            {rows.length === 0 && <p className="p-6 text-center text-sm text-zinc-500">No claims match the active filters.</p>}
          </div>
        </Panel>
        {selected && <ClaimDetail claim={selected} />}
      </div>
    </div>
  );
}
