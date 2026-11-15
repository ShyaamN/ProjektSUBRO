"use client";
import { useState } from "react";
import { Badge, Empty, InfoTip, Kpi, Pager, Panel, inputCls, useFitRows } from "./ui";
import { actualContribution } from "@/lib/capital";
import { money, timeFmt } from "@/lib/format";
import { auditLabel, purchaseLabel, txLabel } from "@/lib/labels";
import { useSubro } from "@/lib/store";

export function LedgerView() {
  const { ref: tableRef, rows: perPage } = useFitRows<HTMLDivElement>(60, 40, 4, 12);
  const { ref: histRef, rows: historyPerPage } = useFitRows<HTMLDivElement>(76, 0, 3, 10);
  const { ledger, purchases, audit, reconciliation, config, claims, subtab } = useSubro();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const txs = [...ledger].reverse().filter((t) => !q || `${t.claimId} ${txLabel(t.type)} ${t.memo}`.toLowerCase().includes(q.toLowerCase()));
  const stillExpected = purchases.filter((p) => p.status === "ACTIVE").reduce((a, p) => a + p.expectedCollection, 0);
  const source = subtab === "history" ? audit : subtab === "turned" ? purchases : txs;
  const pageSize = subtab === "history" ? historyPerPage : perPage;
  const pages = Math.max(1, Math.ceil(source.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const txRows = txs.slice(safePage * perPage, safePage * perPage + perPage);
  const purchaseRows = purchases.slice(safePage * perPage, safePage * perPage + perPage);
  const auditRows = audit.slice(safePage * historyPerPage, safePage * historyPerPage + historyPerPage);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Money we can still spend" value={money(reconciliation.available)} hint={`We started with ${money(config.availableCapital)}.`} tone="text-teal-800" />
        <Kpi label="Paid to clinics" value={money(reconciliation.deployed)} hint="What buying claims has cost so far." />
        <Kpi label="Money back from insurers" value={money(reconciliation.realized)} hint="Only money insurers have agreed to pay counts here." tone="text-emerald-700" />
        <Kpi label="Cost of chasing" value={money(reconciliation.expenses)} hint="What all the chases have cost so far." tone="text-amber-700" />
        <Kpi label="Still expected back" value={money(stillExpected)} hint="This is a guess about claims still being chased. It is not money we have." />
      </div>

      {subtab === "history" ? (
        <Panel title="History" sub="A simple list of everything that has happened, newest first." className="min-h-0 flex-1" right={<Pager page={safePage} pages={pages} onPage={setPage} />}>
          <div ref={histRef} className="min-h-0 flex-1 overflow-hidden"><ol>
            {auditRows.map((a) => (
              <li key={a.id} className="border-b border-slate-100 py-2.5 last:border-0">
                <div className="flex items-baseline justify-between gap-3"><p className="text-sm font-medium text-slate-800">{auditLabel(a.action)}</p><span className="text-xs whitespace-nowrap text-slate-400">{timeFmt(a.ts)}</span></div>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{a.detail}</p>
              </li>
            ))}
          </ol></div>
        </Panel>
      ) : subtab === "turned" ? (
        <Panel title="How each bought claim turned out" sub="The real result only appears once a chase has finished, and it is worked out from money that really came in." className="min-h-0 flex-1" right={<Pager page={safePage} pages={pages} onPage={setPage} />}>
          {purchases.length === 0 ? <Empty>Nothing bought yet.</Empty> : (
            <div ref={tableRef} className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full table-fixed text-sm">
                <colgroup><col className="w-[17%]" /><col className="w-[14%]" /><col className="w-[15%]" /><col className="w-[13%]" /><col className="w-[18%]" /><col className="w-[23%]" /></colgroup>
                <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-3 py-2.5 font-medium">Claim</th><th className="px-3 py-2.5 text-right font-medium">Paid to clinic</th><th className="px-3 py-2.5 text-right font-medium">Gain we expected</th><th className="px-3 py-2.5 text-right font-medium">Money back</th><th className="px-3 py-2.5 text-right font-medium">Real result</th><th className="px-3 py-2.5 text-right font-medium">Where it stands</th></tr></thead>
                <tbody>{purchaseRows.map((p) => {
                  const chaseCosts = ledger.filter((t) => t.claimId === p.claimId && t.type === "RECOVERY_EXPENSE").reduce((a2, t) => a2 - t.amount, 0);
                  const real = actualContribution(p, chaseCosts);
                  return (
                    <tr key={p.claimId} className="border-t border-slate-100">
                      <td className="mono px-4 py-2.5 text-[13px] font-medium text-teal-800">{p.claimId}<span className="block font-sans text-xs text-slate-400">{claims.find((c) => c.id === p.claimId)?.clinic}</span></td>
                      <td className="num px-4 py-2.5">{money(p.advance)}</td>
                      <td className="num px-4 py-2.5">{money(p.expectedContribution)}</td>
                      <td className="num px-4 py-2.5">{money(p.realizedCollection)}</td>
                      <td className={`num px-4 py-2.5 font-medium ${p.status === "SETTLED" ? (real >= 0 ? "text-emerald-700" : "text-red-700") : "text-slate-400"}`}>{p.status === "SETTLED" ? (real >= 0 ? `${money(real)} gain` : `${money(Math.abs(real))} loss`) : "Not finished yet"}</td>
                      <td className="px-4 py-2.5 text-right"><Badge tone={p.status === "SETTLED" ? "green" : p.status === "ACTIVE" ? "cyan" : "amber"}>{purchaseLabel(p.status)}</Badge></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : (
        <Panel title="Every dollar in and out" sub="One row for every time money moved. Money out and money in sit in their own columns, so the story is easy to follow." className="min-h-0 flex-1"
          right={<div className="flex items-center gap-3"><input aria-label="Search the money list" className={`${inputCls} w-[220px]`} placeholder="Search a claim or a note" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /><Pager page={safePage} pages={pages} onPage={setPage} /></div>}>
          {txs.length === 0 ? <Empty>Nothing here yet. Buy a claim and its first row will appear.</Empty> : (
            <div ref={tableRef} className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full table-fixed text-sm">
                <colgroup><col className="w-[10%]" /><col className="w-[13%]" /><col className="w-[47%]" /><col className="w-[15%]" /><col className="w-[15%]" /></colgroup>
                <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-3 py-2.5 font-medium">When</th><th className="px-3 py-2.5 font-medium">Claim</th><th className="px-3 py-2.5 font-medium">What happened</th><th className="px-3 py-2.5 text-right font-medium">Money out</th><th className="px-3 py-2.5 text-right font-medium">Money in</th></tr></thead>
                <tbody>{txRows.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-400">{timeFmt(t.ts)}</td>
                    <td className="mono px-4 py-2.5 text-[13px] font-medium text-teal-800">{t.claimId}</td>
                    <td className="px-4 py-2.5 text-slate-600"><span className="line-clamp-2"><span className="font-medium text-slate-800">{txLabel(t.type)}.</span> {t.memo}</span></td>
                    <td className="num px-4 py-2.5 text-red-700">{t.amount < 0 ? money(Math.abs(t.amount)) : ""}</td>
                    <td className="num px-4 py-2.5 text-emerald-700">{t.amount > 0 ? money(t.amount) : ""}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <p className="mt-2 flex shrink-0 items-center gap-1.5 text-sm text-slate-400">How the top number is worked out <InfoTip text="Money we can still spend is simple: what we started with, minus money out, plus money in. It is checked against every row in this list." label="How the top number is worked out" /></p>
        </Panel>
      )}
    </div>
  );
}
