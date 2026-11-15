"use client";
import { useMemo, useState } from "react";
import { Badge, Bar, Field, Kpi, Panel, btnPrimary, inputCls } from "./ui";
import { allocatePortfolio } from "@/lib/capital";
import { money, pct } from "@/lib/format";
import { DENIAL_CATEGORIES } from "@/lib/seed";
import { useSubro } from "@/lib/store";
import type { CapitalConfig } from "@/lib/types";

export function CapitalDesk() {
  const s = useSubro();
  const [msg, setMsg] = useState("");
  const purchasedIds = useMemo(() => new Set(s.purchases.map((p) => p.claimId)), [s.purchases]);
  const reservedByInsurer = useMemo(() => { const m: Record<string, number> = {}; s.purchases.forEach((p) => { const ins = s.claims.find((c) => c.id === p.claimId)?.insurer ?? "?"; m[ins] = (m[ins] ?? 0) + p.advance; }); return m; }, [s.purchases, s.claims]);
  const plan = useMemo(() => allocatePortfolio(s.claims, s.config, purchasedIds, reservedByInsurer, s.reconciliation.deployed), [s.claims, s.config, purchasedIds, reservedByInsurer, s.reconciliation.deployed]);
  const set = (patch: Partial<CapitalConfig>) => s.setConfig({ ...s.config, ...patch });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="Facility capital" value={money(s.config.availableCapital)} hint="Simulated — no real funds" />
        <Kpi label="Deployed" value={money(s.reconciliation.deployed)} hint={`${s.purchases.length} active simulated purchases`} tone="text-cyan-300" />
        <Kpi label="Remaining capacity" value={money(s.reconciliation.remainingCapacity)} tone={s.reconciliation.remainingCapacity < 0 ? "text-red-300" : "text-emerald-300"} hint="Purchases beyond this are blocked atomically" />
        <Kpi label="Plan expected contribution" value={money(plan.totalExpectedContribution)} hint={`${plan.selected.length} additional candidates`} tone="text-teal-300" />
      </div>
      <div className="grid items-start gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel title="Capital policy" sub="Changes re-run allocation and reprice buys immediately">
          <div className="space-y-3">
            <Field label="Available capital ($)"><input className={inputCls} type="number" min={0} value={s.config.availableCapital} onChange={(e) => set({ availableCapital: Number(e.target.value) })} /></Field>
            <Field label="Minimum acceptable contribution ($)"><input className={inputCls} type="number" value={s.config.minContribution} onChange={(e) => set({ minContribution: Number(e.target.value) })} /></Field>
            <div><div className="mb-1 flex justify-between text-[11px]"><span className="tracking-wider text-zinc-500 uppercase">Max concentration per insurer</span><span className="text-teal-300">{pct(s.config.maxInsurerConcentration, 0)}</span></div><input aria-label="Max insurer concentration" type="range" min={0.05} max={1} step={0.05} value={s.config.maxInsurerConcentration} onChange={(e) => set({ maxInsurerConcentration: Number(e.target.value) })} className="w-full" /></div>
            <Field label="Risk tolerance (modeled-probability floor)"><select className={inputCls} value={s.config.riskTolerance} onChange={(e) => set({ riskTolerance: e.target.value as CapitalConfig["riskTolerance"] })}><option>CONSERVATIVE</option><option>BALANCED</option><option>AGGRESSIVE</option></select></Field>
            <Field label="Eligible denial categories"><select className={inputCls} value={s.config.eligibleCategories === "ALL" ? "ALL" : "CUSTOM"} onChange={(e) => set({ eligibleCategories: e.target.value === "ALL" ? "ALL" : [...DENIAL_CATEGORIES] })}><option value="ALL">All categories</option><option value="CUSTOM">Custom (all selected below)</option></select></Field>
            {s.config.eligibleCategories !== "ALL" && <div className="space-y-1">{DENIAL_CATEGORIES.map((cat) => <label key={cat} className="flex items-center gap-2 text-[12px] text-zinc-300"><input type="checkbox" checked={(s.config.eligibleCategories as string[]).includes(cat)} onChange={(e) => { const cur = s.config.eligibleCategories === "ALL" ? [...DENIAL_CATEGORIES] : [...s.config.eligibleCategories]; set({ eligibleCategories: e.target.checked ? [...cur, cat] : cur.filter((x) => x !== cat) }); }} />{cat}</label>)}</div>}
          </div>
          <div className="mt-4 border-t border-[#20262e] pt-3">
            <div className="mb-2 text-[10px] tracking-wider text-zinc-500 uppercase">Deployed concentration by insurer</div>
            {Object.entries(reservedByInsurer).length === 0 ? <p className="text-[12px] text-zinc-500">No capital deployed yet.</p> : Object.entries(reservedByInsurer).map(([k, v]) => <div key={k} className="mb-2"><div className="mb-1 flex justify-between text-[11px]"><span className="text-zinc-400">{k}</span><span className="num">{money(v)} · {pct(v / s.config.availableCapital, 0)}</span></div><Bar value={v} max={s.config.availableCapital * s.config.maxInsurerConcentration} tone={v > s.config.availableCapital * s.config.maxInsurerConcentration ? "bg-red-500" : "bg-cyan-500"} /></div>)}
          </div>
        </Panel>

        <div className="space-y-3">
          <Panel title="Allocation plan" sub="Greedy by expected contribution per dollar of advance, under capital + concentration constraints" right={<button className={btnPrimary} disabled={plan.selected.length === 0} onClick={() => { const r = s.acceptMany(plan.selected.map((x) => x.claim)); setMsg(`Allocation executed against current state. Skipped items remain unfinanced for the reasons listed below.${r.message ? ` ${r.message}` : ""}`); }}>Deploy plan (simulated)</button>}>
            {msg && <p className="mb-3 rounded-sm border border-teal-900/60 bg-teal-950/30 px-3 py-2 text-[12px] text-teal-200" role="status">{msg}</p>}
            <div className="mb-3 grid grid-cols-3 gap-2 text-center text-[12px]"><div className="bg-[#10141a] py-2"><div className="text-[10px] text-zinc-500 uppercase">Advance</div><div className="num mt-1 font-semibold">{money(plan.totalAdvance)}</div></div><div className="bg-[#10141a] py-2"><div className="text-[10px] text-zinc-500 uppercase">Expected collection</div><div className="num mt-1 font-semibold">{money(plan.totalExpectedCollection)}</div></div><div className="bg-[#10141a] py-2"><div className="text-[10px] text-zinc-500 uppercase">Expected contribution</div><div className="num mt-1 font-semibold text-teal-300">{money(plan.totalExpectedContribution)}</div></div></div>
            <div className="max-h-[340px] overflow-auto rounded-sm border border-[#20262e]"><table className="w-full min-w-[640px] text-[12px]"><thead className="sticky top-0 bg-[#151a20] text-left text-[10px] tracking-wider text-zinc-500 uppercase"><tr><th className="px-2.5 py-2">Claim</th><th className="px-2.5 py-2">Insurer</th><th className="num px-2.5 py-2">Advance</th><th className="num px-2.5 py-2">Expected</th><th className="num px-2.5 py-2">Contribution</th><th className="num px-2.5 py-2">Efficiency</th></tr></thead><tbody>{plan.selected.map((x) => <tr key={x.claim.id} className="border-t border-[#1d232b]"><td className="mono px-2.5 py-2 text-teal-300">{x.claim.id}</td><td className="px-2.5 py-2 text-zinc-400">{x.claim.insurer}</td><td className="num px-2.5 py-2">{money(x.advance)}</td><td className="num px-2.5 py-2">{money(x.expectedCollection)}</td><td className="num px-2.5 py-2 text-emerald-300">{money(x.expectedContribution)}</td><td className="num px-2.5 py-2">{pct(x.efficiency)}</td></tr>)}</tbody></table>{plan.selected.length === 0 && <p className="p-5 text-center text-zinc-500">No additional candidates satisfy the current policy.</p>}</div>
            <details className="mt-3"><summary className="cursor-pointer text-[12px] text-zinc-400">Why were {plan.skipped.length} claims skipped?</summary><div className="mt-2 max-h-[180px] space-y-1 overflow-auto">{plan.skipped.slice(0, 60).map((x, i) => <p key={i} className="text-[11px] text-zinc-500"><span className="mono text-zinc-400">{x.claimId}</span> — {x.reason}</p>)}</div></details>
          </Panel>
          <Panel title="Financed portfolio" sub="Simulated purchases — advances are ledger reservations, not real transfers">
            {s.purchases.length === 0 ? <p className="text-[12px] text-zinc-500">No purchases yet. Deploy the allocation plan or accept an offer from a claim file.</p> : <div className="overflow-auto"><table className="w-full min-w-[620px] text-[12px]"><thead className="text-left text-[10px] tracking-wider text-zinc-500 uppercase"><tr><th className="py-1.5">Claim</th><th className="num">Advance</th><th className="num">Expected</th><th className="num">Realized (sim.)</th><th>Status</th></tr></thead><tbody>{s.purchases.map((p) => <tr key={p.claimId} className="border-t border-[#1d232b]"><td className="mono py-2 text-teal-300">{p.claimId}</td><td className="num">{money(p.advance)}</td><td className="num">{money(p.expectedCollection)}</td><td className="num">{money(p.realizedCollection)}</td><td><Badge tone={p.status === "SETTLED" ? "green" : p.status === "ACTIVE" ? "cyan" : "amber"}>{p.status}</Badge></td></tr>)}</tbody></table></div>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
