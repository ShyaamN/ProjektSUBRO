"use client";
import { Badge, InfoTip, Panel, btnGhost, btnPrimary } from "./ui";
import { underwrite } from "@/lib/finance";
import { dateFmt, money, pct } from "@/lib/format";
import { authLabel, decisionLabel, decisionTone, evidenceLabel } from "@/lib/labels";
import { useSubro } from "@/lib/store";
import type { Claim } from "@/lib/types";

export { decisionTone };

export function ClaimDetail({ claim }: { claim: Claim }) {
  const { acceptOffer, purchases, setView, setSubtab } = useSubro();
  const uw = underwrite(claim, {});
  const purchased = purchases.find((p) => p.claimId === claim.id);
  const ahead = uw.expectedContribution >= 0;

  return (
    <Panel title={claim.clinic} className="h-full" right={<Badge tone={decisionTone(uw.decision)}>{decisionLabel(uw.decision)}</Badge>}>
      <div className="grid min-h-0 gap-6 lg:grid-cols-2">
        <div>
          <p className="mono mb-3 text-[13px] text-slate-400">Claim number {claim.id}</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {[["Insurer", claim.insurer], ["Care took place", dateFmt(claim.serviceDate)], ["Claim was sent", dateFmt(claim.submissionDate)], ["Insurer said no", dateFmt(claim.denialDate)], ["Last day to act", dateFmt(claim.deadline)], ["Approval to chase it", authLabel(claim.authorizationStatus)]].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="mt-0.5 text-slate-800">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-900">Why the insurer said no: {claim.denialReason}</p>

          <h3 className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-slate-800">The maths, in plain words <InfoTip text="The chance of getting paid is our best guess today. It is not a promise, and it can change when new papers turn up." label="About these numbers" /></h3>
          <dl className="mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">First amount on the bill</dt><dd className="num text-slate-800">{money(claim.billed)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Price the insurer agreed to</dt><dd className="num text-slate-800">{money(claim.allowed)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">The patient owes</dt><dd className="num text-slate-800">{money(claim.patientResponsibility)}</dd></div>
            <div className="flex justify-between gap-3 border-t border-slate-100 pt-2 font-medium"><dt className="text-slate-700">So the insurer may still owe</dt><dd className="num text-teal-800">{money(claim.collectible)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Chance we get paid (our best guess)</dt><dd className="num text-slate-800">{pct(claim.recoveryProbability, 0)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">On average, we expect to get back</dt><dd className="num text-slate-800">{money(uw.expectedCollection)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">We would pay the clinic now</dt><dd className="num text-slate-800">{money(uw.advance)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">It may cost this much to chase</dt><dd className="num text-slate-800">{money(claim.estimatedCost)}</dd></div>
          </dl>
          <p className={`mt-3 rounded-lg px-3 py-2.5 text-sm leading-relaxed ${ahead ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>
            {ahead
              ? `On average we would end up ${money(uw.expectedContribution)} ahead. The most we should pay is ${money(Math.max(0, uw.maxPrice))}.`
              : `On average we would end up ${money(Math.abs(uw.expectedContribution))} behind at this price. The most we should pay is ${money(Math.max(0, uw.maxPrice))}, or we should walk away.`}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-800">Papers we have</h3>
          <ul className="mt-2 space-y-2">
            {claim.evidence.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-slate-700">{e.type}<span className="block text-xs text-slate-400">From {e.provenance.toLowerCase()}{e.note ? `. ${e.note}` : ""}</span></span>
                <Badge tone={e.status === "AVAILABLE" ? "green" : e.status === "MISSING" ? "red" : "amber"}>{evidenceLabel(e.status)}</Badge>
              </li>
            ))}
          </ul>

          <h3 className="mt-5 text-sm font-semibold text-slate-800">Why we land here</h3>
          <ul className="mt-2 space-y-1.5">{uw.reasons.map((r) => <li key={r} className="text-sm leading-relaxed text-slate-600">• {r}</li>)}</ul>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {purchased
              ? <Badge tone="cyan">Bought for {money(purchased.advance)}</Badge>
              : <button className={btnPrimary} disabled={uw.decision !== "BUY CANDIDATE"} onClick={() => alert(acceptOffer(claim).message)}>Buy this claim</button>}
            <button className={btnGhost} onClick={() => { setView("underwriting"); setSubtab("answer"); }}>Change the numbers</button>
            {uw.decision !== "BUY CANDIDATE" && !purchased && <InfoTip text="The buy button stays off until every check passes. Change the numbers to see what would have to change." label="Why buying is off" />}
          </div>
        </div>
      </div>
    </Panel>
  );
}
