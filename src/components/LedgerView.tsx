"use client";
import { useState } from "react";
import { Badge, Empty, Kpi, Panel, inputCls } from "./ui";
import { actualContribution } from "@/lib/capital";
import { money, moneySigned, timeFmt } from "@/lib/format";
import { useSubro } from "@/lib/store";

export function LedgerView() {
  const { ledger, purchases, audit, reconciliation, config, claims } = useSubro();
  const [q, setQ] = useState("");
  const txs = ledger.filter((t) => !q || `${t.claimId} ${t.type} ${t.memo}`.toLowerCase().includes(q.toLowerCase()));
  const expectedOutstanding = purchases.filter((p) => p.status === "ACTIVE").reduce((a, p) => a + p.expectedCollection, 0);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Kpi label="Available capital (sim.)" value={money(reconciliation.available)} hint={`Facility ${money(config.availableCapital)} + ledger cash effects`} tone="text-teal-300" />
        <Kpi label="Deployed advances" value={money(reconciliation.deployed)} hint="Simulated — no real transfers" />
        <Kpi label="Realized collections (sim.)" value={money(reconciliation.realized)} hint="Only insurer-simulator outcomes post here" tone="text-emerald-300" />
        <Kpi label="Recovery expenses (realized)" value={money(reconciliation.expenses)} hint="Agent operating costs at terminal states" tone="text-amber-300" />
        <Kpi label="Expected outstanding" value={money(expectedOutstanding)} hint="Expected value — NOT realized; never commingled above" />
      </div>
      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-3">
          <Panel title="Financial ledger" sub={`${reconciliation.txCount} transactions · every mutation carries an idempotency key and is applied exactly once`} right={<input aria-label="Search ledger" className={`${inputCls} w-[220px]`} placeholder="Search claim / type / memo…" value={q} onChange={(e) => setQ(e.target.value)} />}>
            {txs.length === 0 ? <Empty>No ledger transactions match. Accept a simulated offer to post the first advance.</Empty> : <div className="max-h-[480px] overflow-auto rounded-sm border border-[#20262e]"><table className="w-full min-w-[700px] text-[12px]"><thead className="sticky top-0 bg-[#151a20] text-left text-[10px] tracking-wider text-zinc-500 uppercase"><tr><th className="px-2.5 py-2">Time</th><th className="px-2.5 py-2">Claim</th><th className="px-2.5 py-2">Type</th><th className="px-2.5 py-2 text-right">Capital effect</th><th className="px-2.5 py-2">Memo</th><th className="px-2.5 py-2">Basis</th></tr></thead><tbody>{[...txs].reverse().map((t) => <tr key={t.id} className="border-t border-[#1d232b]"><td className="mono px-2.5 py-2 text-zinc-500">{timeFmt(t.ts)}</td><td className="mono px-2.5 py-2 text-teal-300">{t.claimId}</td><td className="px-2.5 py-2">{t.type}</td><td className={`num px-2.5 py-2 ${t.amount > 0 ? "text-emerald-300" : t.amount < 0 ? "text-red-300" : "text-zinc-500"}`}>{t.amount === 0 ? "—" : moneySigned(t.amount)}</td><td className="max-w-[300px] px-2.5 py-2 text-zinc-400">{t.memo}<span className="mono block text-[10px] text-zinc-600">{t.idempotencyKey}</span></td><td className="px-2.5 py-2"><Badge tone={t.realized ? "green" : "zinc"}>{t.realized ? "REALIZED (SIM.)" : "EXPECTED / EARMARK"}</Badge></td></tr>)}</tbody></table></div>}
          </Panel>
          <Panel title="Purchase outcomes — expected vs actual" sub="Actual contribution = realized simulated collection − advance − agent operating expenses">
            {purchases.length === 0 ? <Empty>No simulated purchases yet.</Empty> : <div className="overflow-auto"><table className="w-full min-w-[640px] text-[12px]"><thead className="text-left text-[10px] tracking-wider text-zinc-500 uppercase"><tr><th className="py-1.5">Claim</th><th className="num">Advance</th><th className="num">Expected contrib.</th><th className="num">Realized (sim.)</th><th className="num">Actual contrib.</th><th>Status</th></tr></thead><tbody>{purchases.map((p) => { const exp = ledger.filter((t) => t.claimId === p.claimId && t.type === "RECOVERY_EXPENSE").reduce((a, t) => a - t.amount, 0); return <tr key={p.claimId} className="border-t border-[#1d232b]"><td className="mono py-2 text-teal-300">{p.claimId}<span className="block font-sans text-[10px] text-zinc-600">{claims.find((c) => c.id === p.claimId)?.clinic}</span></td><td className="num">{money(p.advance)}</td><td className="num">{moneySigned(p.expectedContribution)}</td><td className="num">{money(p.realizedCollection)}</td><td className={`num ${p.status === "SETTLED" ? (actualContribution(p, exp) >= 0 ? "text-emerald-300" : "text-red-300") : "text-zinc-500"}`}>{p.status === "SETTLED" ? moneySigned(actualContribution(p, exp)) : "— pending"}</td><td><Badge tone={p.status === "SETTLED" ? "green" : p.status === "ACTIVE" ? "cyan" : "amber"}>{p.status}</Badge></td></tr>; })}</tbody></table></div>}
          </Panel>
        </div>
        <Panel title="Audit trail" sub="Structured, append-only operational record">
          <ol className="max-h-[640px] space-y-0 overflow-auto pr-1">{audit.map((a) => <li key={a.id} className="border-b border-[#1d232b] py-2 last:border-0"><div className="flex justify-between gap-2"><span className="mono text-[11px] font-semibold text-zinc-200">{a.action}</span><span className="mono text-[10px] text-zinc-600">{timeFmt(a.ts)}</span></div><p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{a.detail}</p><p className="text-[10px] text-zinc-600">actor: {a.actor}</p></li>)}</ol>
        </Panel>
      </div>
      <p className="text-[11px] text-zinc-600">Reconciliation: available capital = facility + Σ signed ledger effects = {money(reconciliation.available)}. No entry in this ledger represents a real bank transfer, insurer payment, or claim collection.</p>
    </div>
  );
}
