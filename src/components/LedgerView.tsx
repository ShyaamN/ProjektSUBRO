"use client";
import { useState } from "react";
import { Badge, Empty, InfoTip, Kpi, Panel, inputCls } from "./ui";
import { actualContribution } from "@/lib/capital";
import { money, timeFmt } from "@/lib/format";
import { auditLabel, purchaseLabel, txLabel } from "@/lib/labels";
import { useSubro } from "@/lib/store";

export function LedgerView() {
  const { ledger, purchases, audit, reconciliation, config, claims } = useSubro();
  const [q, setQ] = useState("");
  const txs = ledger.filter((t) => !q || `${t.claimId} ${txLabel(t.type)} ${t.memo}`.toLowerCase().includes(q.toLowerCase()));
  const stillExpected = purchases.filter((p) => p.status === "ACTIVE").reduce((a, p) => a + p.expectedCollection, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Money we can still spend" value={money(reconciliation.available)} hint={`We started with ${money(config.availableCapital)}.`} tone="text-teal-800" />
        <Kpi label="Paid to clinics" value={money(reconciliation.deployed)} hint="What buying claims has cost so far." />
        <Kpi label="Money back from insurers" value={money(reconciliation.realized)} hint="Only money insurers have agreed to pay counts here." tone="text-emerald-700" />
        <Kpi label="Cost of chasing" value={money(reconciliation.expenses)} hint="What all the chases have cost so far." tone="text-amber-700" />
        <Kpi label="Still expected back" value={money(stillExpected)} hint="This is a guess about claims still being chased. It is not money we have." />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Panel title="Every dollar in and out" sub="One row for every time money moved. Money out and money in sit in their own columns, so the story is easy to follow."
            right={<input aria-label="Search the money list" className={`${inputCls} w-[230px]`} placeholder="Search a claim or a note" value={q} onChange={(e) => setQ(e.target.value)} />}>
            {txs.length === 0 ? <Empty>Nothing here yet. Buy a claim and its first row will appear.</Empty> : (
              <div className="max-h-[480px] overflow-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-3 font-medium">When</th><th className="px-4 py-3 font-medium">Claim</th><th className="px-4 py-3 font-medium">What happened</th><th className="px-4 py-3 text-right font-medium">Money out</th><th className="px-4 py-3 text-right font-medium">Money in</th></tr></thead>
                  <tbody>{[...txs].reverse().map((t) => (
                    <tr key={t.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-400">{timeFmt(t.ts)}</td>
                      <td className="mono px-4 py-3 text-[13px] font-medium text-teal-800">{t.claimId}</td>
                      <td className="max-w-[320px] px-4 py-3 text-slate-600"><span className="font-medium text-slate-800">{txLabel(t.type)}.</span> {t.memo}</td>
                      <td className="num px-4 py-3 text-red-700">{t.amount < 0 ? money(Math.abs(t.amount)) : ""}</td>
                      <td className="num px-4 py-3 text-emerald-700">{t.amount > 0 ? money(t.amount) : ""}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-400">How the top number is worked out <InfoTip text="Money we can still spend is simple: what we started with, minus money out, plus money in. It is checked against every row in this list." label="How the top number is worked out" /></p>
          </Panel>

          <Panel title="How each bought claim turned out" sub="The real result only appears once a chase has finished, and it is worked out from money that really came in.">
            {purchases.length === 0 ? <Empty>Nothing bought yet.</Empty> : (
              <div className="overflow-auto"><table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs text-slate-500"><tr><th className="py-2 font-medium">Claim</th><th className="text-right font-medium">Paid to clinic</th><th className="text-right font-medium">Gain we expected</th><th className="text-right font-medium">Money back</th><th className="text-right font-medium">Real result</th><th className="text-right font-medium">Where it stands</th></tr></thead>
                <tbody>{purchases.map((p) => {
                  const chaseCosts = ledger.filter((t) => t.claimId === p.claimId && t.type === "RECOVERY_EXPENSE").reduce((a2, t) => a2 - t.amount, 0);
                  const real = actualContribution(p, chaseCosts);
                  return (
                    <tr key={p.claimId} className="border-t border-slate-100">
                      <td className="mono py-3 text-[13px] font-medium text-teal-800">{p.claimId}<span className="block font-sans text-xs text-slate-400">{claims.find((c) => c.id === p.claimId)?.clinic}</span></td>
                      <td className="num">{money(p.advance)}</td>
                      <td className="num">{money(p.expectedContribution)}</td>
                      <td className="num">{money(p.realizedCollection)}</td>
                      <td className={`num font-medium ${p.status === "SETTLED" ? (real >= 0 ? "text-emerald-700" : "text-red-700") : "text-slate-400"}`}>{p.status === "SETTLED" ? (real >= 0 ? `${money(real)} gain` : `${money(Math.abs(real))} loss`) : "Not finished yet"}</td>
                      <td className="text-right"><Badge tone={p.status === "SETTLED" ? "green" : p.status === "ACTIVE" ? "cyan" : "amber"}>{purchaseLabel(p.status)}</Badge></td>
                    </tr>
                  );
                })}</tbody>
              </table></div>
            )}
          </Panel>
        </div>

        <Panel title="History" sub="A simple list of everything that has happened, newest first.">
          <ol className="max-h-[680px] overflow-auto pr-1">
            {audit.map((a) => (
              <li key={a.id} className="border-b border-slate-100 py-3 last:border-0">
                <div className="flex items-baseline justify-between gap-3"><p className="text-sm font-medium text-slate-800">{auditLabel(a.action)}</p><span className="text-xs whitespace-nowrap text-slate-400">{timeFmt(a.ts)}</span></div>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{a.detail}</p>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
