"use client";
import { useMemo, useState } from "react";
import { Badge, Bar, Field, InfoTip, Kpi, Pager, Panel, btnPrimary, inputCls, useFitRows } from "./ui";
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
  const { ref: tableRef, rows: perPage } = useFitRows<HTMLDivElement>(56, 40, 4, 12);
  const s = useSubro();
  const [msg, setMsg] = useState("");
  const [page, setPage] = useState(0);
  const purchasedIds = useMemo(() => new Set(s.purchases.map((p) => p.claimId)), [s.purchases]);
  const withEachInsurer = useMemo(() => { const m: Record<string, number> = {}; s.purchases.forEach((p) => { const ins = s.claims.find((c) => c.id === p.claimId)?.insurer ?? "Unknown insurer"; m[ins] = (m[ins] ?? 0) + p.advance; }); return m; }, [s.purchases, s.claims]);
  const plan = useMemo(() => allocatePortfolio(s.claims, s.config, purchasedIds, withEachInsurer, s.config.availableCapital - s.reconciliation.available), [s.claims, s.config, purchasedIds, withEachInsurer, s.reconciliation]);
  const set = (patch: Partial<CapitalConfig>) => { s.setConfig({ ...s.config, ...patch }); setPage(0); };
  const pages = Math.max(1, Math.ceil(plan.selected.length / perPage));
  const safePage = Math.min(page, pages - 1);
  const planRows = plan.selected.slice(safePage * perPage, safePage * perPage + perPage);
  const boughtPages = Math.max(1, Math.ceil(s.purchases.length / perPage));
  const boughtRows = s.purchases.slice(safePage * perPage, safePage * perPage + perPage);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Money we can spend in total" value={money(s.config.availableCapital)} />
        <Kpi label="Already spent on claims" value={money(s.reconciliation.deployed)} hint={`Across ${s.purchases.length} bought claims.`} tone="text-sky-800" />
        <Kpi label="Money free to spend" value={money(s.reconciliation.available)} hint="Cash in the pot right now: what we started with, minus money out, plus money back in." tone={s.reconciliation.available < 0 ? "text-red-700" : "text-emerald-700"} />
        <Kpi label="Gain we expect from the list" value={money(plan.totalExpectedContribution)} hint={`From ${plan.selected.length} more claims.`} tone="text-teal-800" />
      </div>

      {s.subtab === "rules" && (
        <div className="grid min-h-0 flex-1 items-start gap-4 xl:grid-cols-2">
          <Panel title="Your rules" sub="Change a rule and the suggested list updates at once." className="h-full">
            <div className="space-y-4">
              <Field label="Money we can spend in total ($)" help="Once this runs out, no more claims can be bought."><input className={inputCls} type="number" min={0} value={s.config.availableCapital} onChange={(e) => set({ availableCapital: Number(e.target.value) })} /></Field>
              <Field label="Least gain we accept per claim ($)" help="Claims expected to gain less than this stay off the list."><input className={inputCls} type="number" value={s.config.minContribution} onChange={(e) => set({ minContribution: Number(e.target.value) })} /></Field>
              <div>
                <div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="flex items-center gap-1.5 font-medium text-slate-700">Biggest share that can sit with one insurer <InfoTip text="This stops us putting too much money on one insurer paying up. If that insurer keeps saying no, only this share of the money is at risk." label="Why this limit exists" /></span><span className="font-semibold text-teal-800">{pct(s.config.maxInsurerConcentration, 0)}</span></div>
                <input aria-label="Biggest share with one insurer" type="range" min={0.05} max={1} step={0.05} value={s.config.maxInsurerConcentration} onChange={(e) => set({ maxInsurerConcentration: Number(e.target.value) })} className="w-full" />
              </div>
              <Field label="How careful should we be?" help={CARE_WORDS[s.config.riskTolerance].help}>
                <select className={inputCls} value={s.config.riskTolerance} onChange={(e) => set({ riskTolerance: e.target.value as CapitalConfig["riskTolerance"] })}>{(Object.keys(CARE_WORDS) as CapitalConfig["riskTolerance"][]).map((k) => <option key={k} value={k}>{CARE_WORDS[k].label}</option>)}</select>
              </Field>
              <Field label="Which kinds of claims can we buy?" help="Turn kinds off if you want the helper to leave them alone.">
                <select className={inputCls} value={s.config.eligibleCategories === "ALL" ? "ALL" : "CUSTOM"} onChange={(e) => set({ eligibleCategories: e.target.value === "ALL" ? "ALL" : [...DENIAL_CATEGORIES] })}><option value="ALL">All kinds</option><option value="CUSTOM">Let me choose</option></select>
              </Field>
              {s.config.eligibleCategories !== "ALL" && <div className="grid grid-cols-2 gap-2">{DENIAL_CATEGORIES.map((cat) => <label key={cat} className="flex items-center gap-2.5 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4" checked={(s.config.eligibleCategories as string[]).includes(cat)} onChange={(e) => { const cur = s.config.eligibleCategories === "ALL" ? [...DENIAL_CATEGORIES] : [...s.config.eligibleCategories]; set({ eligibleCategories: e.target.checked ? [...cur, cat] : cur.filter((x) => x !== cat) }); }} />{categoryLabel(cat)}</label>)}</div>}
            </div>
          </Panel>
          <Panel title="Money sitting with each insurer" sub="Bars fill up to the biggest share your rules allow." className="h-full">
            {Object.entries(withEachInsurer).length === 0 ? <p className="text-sm text-slate-500">Nothing bought yet, so no money is sitting with any insurer.</p> : <div className="space-y-3">{Object.entries(withEachInsurer).map(([k, v]) => <div key={k}><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="text-slate-600">{k}</span><span className="num font-medium text-slate-800">{money(v)}</span></div><Bar value={v} max={Math.max(1, s.config.availableCapital * s.config.maxInsurerConcentration)} tone={v > s.config.availableCapital * s.config.maxInsurerConcentration ? "bg-red-500" : "bg-sky-500"} /></div>)}</div>}
          </Panel>
        </div>
      )}

      {s.subtab === "suggested" && (
        <Panel title="Claims we suggest buying" sub="We start with the claims that gain the most for each dollar spent, and stop when the money or your rules run out." className="min-h-0 flex-1"
          right={<div className="flex items-center gap-3"><Pager page={safePage} pages={pages} onPage={setPage} /><button className={btnPrimary} disabled={plan.selected.length === 0} onClick={() => { s.acceptMany(plan.selected.map((x) => x.claim)); setMsg("Done. Every claim that still fitted your rules has been bought."); setPage(0); }}>Buy all of these</button></div>}>
          {msg && <p className="mb-3 shrink-0 rounded-lg bg-teal-50 px-3 py-2.5 text-sm text-teal-900" role="status">{msg}</p>}
          <div className="mb-3 grid shrink-0 grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-slate-50 py-2.5"><div className="text-xs text-slate-500">We would spend</div><div className="num mt-1 text-lg font-semibold text-slate-900">{money(plan.totalAdvance)}</div></div>
            <div className="rounded-xl bg-slate-50 py-2.5"><div className="text-xs text-slate-500">We expect to get back</div><div className="num mt-1 text-lg font-semibold text-slate-900">{money(plan.totalExpectedCollection)}</div></div>
            <div className="rounded-xl bg-slate-50 py-2.5"><div className="text-xs text-slate-500">Expected gain</div><div className="num mt-1 text-lg font-semibold text-teal-800">{money(plan.totalExpectedContribution)}</div></div>
          </div>
          <div ref={tableRef} className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full table-fixed text-sm">
              <colgroup><col className="w-[14%]" /><col className="w-[32%]" /><col className="w-[18%]" /><col className="w-[18%]" /><col className="w-[18%]" /></colgroup>
              <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-3 py-2.5 font-medium">Claim</th><th className="px-3 py-2.5 font-medium">Clinic</th><th className="px-3 py-2.5 text-right font-medium">Pay now</th><th className="px-3 py-2.5 text-right font-medium">Expect back</th><th className="px-3 py-2.5 text-right font-medium">Expected gain</th></tr></thead>
              <tbody>{planRows.map((x) => <tr key={x.claim.id} className="border-t border-slate-100"><td className="mono truncate px-3 py-2 text-[13px] font-medium text-teal-800">{x.claim.id}</td><td className="px-3 py-2 text-slate-600"><span className="block truncate">{x.claim.clinic}</span><span className="block truncate text-xs text-slate-400">{x.claim.insurer}</span></td><td className="num px-3 py-2">{money(x.advance)}</td><td className="num px-3 py-2">{money(x.expectedCollection)}</td><td className="num px-3 py-2 font-medium text-emerald-700">{money(x.expectedContribution)}</td></tr>)}</tbody>
            </table>
            {plan.selected.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No more claims fit your rules right now. Try adding money or being a little bolder.</p>}
          </div>
          <p className="mt-2 shrink-0 text-[13px] text-slate-400">{plan.skipped.length} claims were left off this list. The usual reasons: we would lose money, a paper is missing, or the money ran out.</p>
        </Panel>
      )}

      {s.subtab === "bought" && (
        <Panel title="Claims we already bought" sub="These are the claims we now own and can chase." className="min-h-0 flex-1" right={<Pager page={safePage} pages={boughtPages} onPage={setPage} />}>
          {s.purchases.length === 0 ? <p className="text-sm text-slate-500">Nothing bought yet. Buy from the suggested list, or from any claim.</p> : (
            <div ref={tableRef} className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full table-fixed text-sm">
                <colgroup><col className="w-[16%]" /><col className="w-[19%]" /><col className="w-[19%]" /><col className="w-[19%]" /><col className="w-[27%]" /></colgroup>
                <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-3 py-2.5 font-medium">Claim</th><th className="px-3 py-2.5 text-right font-medium">Paid to clinic</th><th className="px-3 py-2.5 text-right font-medium">Expect back</th><th className="px-3 py-2.5 text-right font-medium">Back so far</th><th className="px-3 py-2.5 text-right font-medium">Where it stands</th></tr></thead>
                <tbody>{boughtRows.map((p) => <tr key={p.claimId} className="border-t border-slate-100"><td className="mono truncate px-3 py-2.5 text-[13px] font-medium text-teal-800">{p.claimId}</td><td className="num px-3 py-2.5">{money(p.advance)}</td><td className="num px-3 py-2.5">{money(p.expectedCollection)}</td><td className="num px-3 py-2.5">{money(p.realizedCollection)}</td><td className="px-3 py-2.5 text-right"><Badge tone={p.status === "SETTLED" ? "green" : p.status === "ACTIVE" ? "cyan" : "amber"}>{purchaseLabel(p.status)}</Badge></td></tr>)}</tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
