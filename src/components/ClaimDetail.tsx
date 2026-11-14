"use client";
import { Badge, Panel, btnPrimary } from "./ui";
import { underwrite } from "@/lib/finance";
import { dateFmt, money, pct } from "@/lib/format";
import { useSubro } from "@/lib/store";
import type { Claim } from "@/lib/types";

export const decisionTone = (d: string) => (d === "BUY CANDIDATE" ? "green" : d === "NEEDS REVIEW" ? "amber" : "red") as "green" | "amber" | "red";

export function ClaimDetail({ claim }: { claim: Claim }) {
  const { acceptOffer, purchases, setView } = useSubro();
  const uw = underwrite(claim, {});
  const purchased = purchases.find((p) => p.claimId === claim.id);
  return (
    <Panel title={`Claim ${claim.id}`} sub={claim.scenario ? `Scenario: ${claim.scenario}` : "Synthetic denied receivable"} right={<Badge tone={decisionTone(uw.decision)}>{uw.decision}</Badge>}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
        {[["Clinic", claim.clinic], ["Insurer", claim.insurer], ["Service", dateFmt(claim.serviceDate)], ["Denied", dateFmt(claim.denialDate)], ["Deadline", dateFmt(claim.deadline)], ["Category", claim.denialCategory], ["Authorization", claim.authorizationStatus], ["Duration (est.)", `${claim.estimatedDurationDays} days`]].map(([k, v]) => (
          <div key={k}><dt className="text-[10px] tracking-wider text-zinc-500 uppercase">{k}</dt><dd className="mt-0.5 text-zinc-200">{v}</dd></div>
        ))}
      </dl>
      <p className="mt-3 border-l-2 border-amber-800/60 pl-2 text-[12px] leading-relaxed text-zinc-400">{claim.denialReason}</p>
      <div className="mt-3 space-y-1 border-t border-[#20262e] pt-3 text-[12px]">
        {[["Billed charges (not collectible)", money(claim.billed)], ["Contractually allowed", money(claim.allowed)], ["Patient responsibility", `− ${money(claim.patientResponsibility)}`], ["Potential insurer collectible", money(claim.collectible)], ["Modeled recovery probability*", pct(claim.recoveryProbability, 0)], ["Expected collection", money(uw.expectedCollection)], ["Proposed advance (60% of collectible)", money(uw.advance)], ["Expected recovery expenses", `− ${money(claim.estimatedCost)}`], ["Expected contribution", money(uw.expectedContribution)], ["Maximum acceptable price", money(Math.max(0, uw.maxPrice))], ["Risk reserve (earmark)", money(uw.riskReserve)]].map(([k, v], i) => (
          <div key={k} className={`flex justify-between ${i === 3 || i === 9 ? "font-semibold text-teal-300" : "text-zinc-400"}`}><span>{k}</span><span className="num text-zinc-200">{v}</span></div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-zinc-600">* Modeled assumption — not validated empirical recovery data.</p>
      <div className="mt-3 border-t border-[#20262e] pt-3">
        <div className="mb-1.5 text-[10px] tracking-wider text-zinc-500 uppercase">Evidence &amp; provenance</div>
        {claim.evidence.map((e) => <div key={e.id} className="mb-1 flex items-start justify-between gap-2 text-[11px]"><span className="mono text-zinc-300">{e.id} · {e.type}<span className="block font-sans text-zinc-500">{e.provenance}{e.note ? ` — ${e.note}` : ""}</span></span><Badge tone={e.status === "AVAILABLE" ? "green" : e.status === "MISSING" ? "red" : "amber"}>{e.status}</Badge></div>)}
      </div>
      <div className="mt-3 space-y-1 border-t border-[#20262e] pt-3">{uw.reasons.map((r) => <p key={r} className="text-[11px] leading-relaxed text-zinc-400">· {r}</p>)}</div>
      <div className="mt-3 flex gap-2">
        {purchased ? <Badge tone="cyan">FINANCED · advance {money(purchased.advance)} · {purchased.status}</Badge> : <button className={btnPrimary} disabled={uw.decision !== "BUY CANDIDATE"} onClick={() => alert(acceptOffer(claim).message)}>Accept simulated offer</button>}
        <button className="rounded-sm border border-[#2b343f] px-3 py-1.5 text-[13px] text-zinc-300 hover:text-white" onClick={() => setView("underwriting")}>Open in Underwriting Desk</button>
      </div>
    </Panel>
  );
}
