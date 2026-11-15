"use client";
import { useMemo, useState } from "react";
import { Badge, Bar, Field, Kpi, Panel, btnPrimary, inputCls } from "./ui";
import { allocatePortfolio } from "@/lib/capital";
import { money, pct } from "@/lib/format";
import { categoryLabel, purchaseLabel } from "@/lib/labels";
import { DENIAL_CATEGORIES } from "@/lib/seed";
import { useSubro } from "@/lib/store";
import type { CapitalConfig } from "@/lib/types";

const CARE_WORDS: Record<CapitalConfig["riskTolerance"], { label: string; help: string }> = {
  CONSERVATIVE: { label: "Careful", help: "Only buy claims where our chance of getting paid is at least 60 out of 100." },
  BALANCED: { label: "In the middle", help: "Buy claims where our chance of getting paid is at least 45 out of 100." },
  AGGRESSIVE: { label: "Bold", help: "Buy claims where our chance of getting paid is at least 30 out of 100." },
};

export function CapitalDesk() {
  const s = useSubro();
  const [msg, setMsg] = useState("");
  const purchasedIds = useMemo(() => new Set(s.purchases.map((p) => p.claimId)), [s.purchases]);
  const withEachInsurer = useMemo(() => { const m: Record<string, number> = {}; s.purchases.forEach((p) => { const ins = s.claims.find((c) => c.id === p.claimId)?.insurer ?? "Unknown insurer"; m[ins] = (m[ins] ?? 0) + p.advance; }); return m; }, [s.purchases, s.claims]);
  const plan = useMemo(() => allocatePortfolio(s.claims, s.config, purchasedIds, withEachInsurer, s.reconciliation.deployed), [s.claims, s.config, purchasedIds, withEachInsurer, s.reconciliation.deployed]);
  const set = (patch: Partial<CapitalConfig>) => s.setConfig({ ...s.config, ...patch });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Money we can spend in total" value={money(s.config.availableCapital)} />
        <Kpi label="Already spent on claims" value={money(s.reconciliation.deployed)} hint={`Across ${s.purchases.length} bought claims.`} tone="text-sky-800" />
        <Kpi label="Money left to spend" value={money(s.reconciliation.remainingCapacity)} hint="We can never spend more than this." tone={s.reconciliation.remainingCapacity < 0 ? "text-red-700" : "text-emerald-700"} />
        <Kpi label="Gain we expect from the list below" value={money(plan.totalExpectedContribution)} hint={`From ${plan.selected.length} more claims.`} tone="text-teal-800" />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel title="Your rules" sub="Change a rule and the list of claims to buy updates at once.">
            <div className="space-y-5">
              <Field label="Money we can spend in total ($)" help="Once this runs out, no more claims can be bought."><input className={inputCls} type="number" min={0} value={s.config.availableCapital} onChange={(e) => set({ availableCapital: Number(e.target.value) })} /></Field>
              <Field label="Least gain we accept per claim ($)" help="Claims expected to gain less than this stay off the list."><input className={inputCls} type="number" value={s.config.minContribution} onChange={(e) => set({ minContribution: Number(e.target.value) })} /></Field>
              <div>
                <div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="font-medium text-slate-700">Biggest share that can sit with one insurer</span><span className="font-semibold text-teal-800">{pct(s.config.maxInsurerConcentration, 0)}</span></div>
                <input aria-label="Biggest share with one insurer" type="range" min={0.05} max={1} step={0.05} value={s.config.maxInsurerConcentration} onChange={(e) => set({ maxInsurerConcentration: Number(e.target.value) })} className="w-full" />
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">This stops us putting too much money on one insurer paying up.</p>
              </div>
              <Field label="How careful should we be?" help={CARE_WORDS[s.config.riskTolerance].help}>
                <select className={inputCls} value={s.config.riskTolerance} onChange={(e) => set({ riskTolerance: e.target.value as CapitalConfig["riskTolerance"] })}>{(Object.keys(CARE_WORDS) as CapitalConfig["riskTolerance"][]).map((k) => <option key={k} value={k}>{CARE_WORDS[k].label}</option>)}</select>
              </Field>
              <Field label="Which kinds of claims can we buy?" help="Turn kinds off if you want the helper to leave them alone.">
                <select className={inputCls} value={s.config.eligibleCategories === "ALL" ? "ALL" : "CUSTOM"} onChange={(e) => set({ eligibleCategories: e.target.value === "ALL" ? "ALL" : [...DENIAL_CATEGORIES] })}><option value="ALL">All kinds</option><option value="CUSTOM">Let me choose</option></select>
              </Field>
              {s.config.eligibleCategories !== "ALL" && <div className="space-y-2">{DENIAL_CATEGORIES.map((cat) => <label key={cat} className="flex items-center gap-2.5 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4" checked={(s.config.eligibleCategories as string[]).includes(cat)} onChange={(e) => { const cur = s.config.eligibleCategories === "ALL" ? [...DENIAL_CATEGORIES] : [...s.config.eligibleCategories]; set({ eligibleCategories: e.target.checked ? [...cur, cat] : cur.filter((x) => x !== cat) }); }} />{categoryLabel(cat)}</label>)}</div>}
            </div>
          </Panel>

          <Panel title="Money sitting with each insurer" sub="Bars fill up to the biggest share you allow above.">
            {Object.entries(withEachInsurer).length === 0 ? <p className="text-sm text-slate-500">Nothing bought yet, so no money is sitting with any insurer.</p> : <div className="space-y-3">{Object.entries(withEachInsurer).map(([k, v]) => <div key={k}><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="text-slate-600">{k}</span><span className="num font-medium text-slate-800">{money(v)}</span></div><Bar value={v} max={Math.max(1, s.config.availableCapital * s.config.maxInsurerConcentration)} tone={v > s.config.availableCapital * s.config.maxInsurerConcentration ? "bg-red-500" : "bg-sky-500"} /></div>)}</div>}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Claims we suggest buying" sub="We start with the claims that gain the most for each dollar spent, and we stop when the money or your rules run out."
            right={<button className={btnPrimary} disabled={plan.selected.length === 0} onClick={() => { s.acceptMany(plan.selected.map((x) => x.claim)); setMsg("Done. Every claim that still fit your rules has been bought. Anything that did not fit was left alone, and the reasons are listed below."); }}>Buy all of these</button>}>
            {msg && <p className="mb-4 rounded-lg bg-teal-50 px-3 py-2.5 text-sm leading-relaxed text-teal-900" role="status">{msg}</p>}
            <div className="mb-4 grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 py-3"><div className="text-xs text-slate-500">We would spend</div><div className="num mt-1 text-lg font-semibold text-slate-900">{money(plan.totalAdvance)}</div></div>
              <div className="rounded-xl bg-slate-50 py-3"><div className="text-xs text-slate-500">We expect to get back</div><div className="num mt-1 text-lg font-semibold text-slate-900">{money(plan.totalExpectedCollection)}</div></div>
              <div className="rounded-xl bg-slate-50 py-3"><div className="text-xs text-slate-500">Expected gain</div><div className="num mt-1 text-lg font-semibold text-teal-800">{money(plan.totalExpectedContribution)}</div></div>
            </div>
            <div className="max-h-[380px] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-3 font-medium">Claim</th><th className="px-4 py-3 font-medium">Clinic</th><th className="px-4 py-3 text-right font-medium">Pay now</th><th className="px-4 py-3 text-right font-medium">Expect back</th><th className="px-4 py-3 text-right font-medium">Expected gain</th></tr></thead>
                <tbody>{plan.selected.map((x) => <tr key={x.claim.id} className="border-t border-slate-100"><td className="mono px-4 py-3 text-[13px] font-medium text-teal-800">{x.claim.id}</td><td className="px-4 py-3 text-slate-600">{x.claim.clinic}<span className="block text-xs text-slate-400">{x.claim.insurer}</span></td><td className="num px-4 py-3">{money(x.advance)}</td><td className="num px-4 py-3">{money(x.expectedCollection)}</td><td className="num px-4 py-3 font-medium text-emerald-700">{money(x.expectedContribution)}</td></tr>)}</tbody>
              </table>
              {plan.selected.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No more claims fit your rules right now. Try adding money or being a little bolder.</p>}
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-slate-600">Why are {plan.skipped.length} claims not on the list?</summary>
              <ul className="mt-3 max-h-[200px] space-y-1.5 overflow-auto">{plan.skipped.slice(0, 60).map((x, i) => <li key={i} className="text-[13px] text-slate-500"><span className="mono text-slate-700">{x.claimId}</span> · {x.reason}</li>)}</ul>
            </details>
          </Panel>

          <Panel title="Claims we already bought" sub="These are the claims we now own and can chase.">
            {s.purchases.length === 0 ? <p className="text-sm text-slate-500">Nothing bought yet. Buy from the list above, from a claim on the claims page, or from the decide page.</p> : (
              <div className="overflow-auto"><table className="w-full min-w-[600px] text-sm"><thead className="text-left text-xs text-slate-500"><tr><th className="py-2 font-medium">Claim</th><th className="text-right font-medium">Paid to clinic</th><th className="text-right font-medium">Expect back</th><th className="text-right font-medium">Back so far</th><th className="text-right font-medium">Where it stands</th></tr></thead>
                <tbody>{s.purchases.map((p) => <tr key={p.claimId} className="border-t border-slate-100"><td className="mono py-3 text-[13px] font-medium text-teal-800">{p.claimId}</td><td className="num">{money(p.advance)}</td><td className="num">{money(p.expectedCollection)}</td><td className="num">{money(p.realizedCollection)}</td><td className="text-right"><Badge tone={p.status === "SETTLED" ? "green" : p.status === "ACTIVE" ? "cyan" : "amber"}>{purchaseLabel(p.status)}</Badge></td></tr>)}</tbody></table></div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
