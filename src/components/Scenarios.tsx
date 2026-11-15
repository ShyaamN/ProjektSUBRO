"use client";
import { FlaskConical, Play, RotateCcw } from "lucide-react";
import { Badge, Panel, btnGhost, btnPrimary } from "./ui";
import { underwrite } from "@/lib/finance";
import { money, moneySigned } from "@/lib/format";
import { useSubro } from "@/lib/store";

const EXPECTED: Record<string, string> = {
  "CASE-1042": "Buy candidate (+$70). Agent cites E-1042-A, mock insurer approves $500, ledger posts realized simulation.",
  "CASE-2088": "Decline despite $20,000 collectible — procedural window expired. Agent stops without submitting.",
  "CASE-3021": "Needs review. Agent requests E-3021-A and pauses; it must not manufacture the clinical document.",
  "CASE-4109": "Insurer repeats fingerprint INS-4109-R1 / identical draft is blocked — agent escalates or terminates for lack of progress.",
  "CASE-5060": "Contradictory service dates (2026-09-18 vs 2026-09-21) are flagged for human reconciliation, never auto-resolved.",
  "CASE-6077": "Partial simulated payment $350 on $800 collectible — ledger records $350 realized, not $800 expected.",
};
export function Scenarios() {
  const { claims, select, setView, runs, runFull, acceptOffer, resetAll, purchases, ledger } = useSubro();
  const scenarios = claims.filter((c) => c.scenario);
  return (
    <div className="space-y-3">
      <Panel title="Scenario Laboratory" sub="Deterministic synthetic cases with asserted system behavior. Modify assumptions in the Underwriting Desk and re-run to observe changed decisions." right={<button className={btnGhost} onClick={() => { if (confirm("Reset the entire sandbox to its initial state? All simulated purchases, ledger entries, and agent runs will be cleared.")) resetAll(); }}><RotateCcw className="mr-1 inline h-4 w-4" />Reset sandbox</button>}>
        <div className="grid gap-3 lg:grid-cols-2">
          {scenarios.map((c) => { const uw = underwrite(c, {}); const run = runs[c.id]; const realized = ledger.filter((t) => t.claimId === c.id && t.type === "REALIZED_COLLECTION").reduce((a, t) => a + t.amount, 0); return (
            <article key={c.id} className="border border-[#242c35] bg-[#10141a] p-3.5">
              <div className="flex items-start justify-between gap-2"><div><h3 className="mono text-[13px] font-semibold text-teal-300">{c.id} · {c.scenario}</h3><p className="mt-1 text-[12px] text-zinc-400">{c.clinic} · {c.insurer} · collectible {money(c.collectible)}</p></div><Badge tone={uw.decision === "BUY CANDIDATE" ? "green" : uw.decision === "NEEDS REVIEW" ? "amber" : "red"}>{uw.decision}</Badge></div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]"><div className="bg-[#0d1116] py-2"><dt className="text-zinc-500">EXPECTED COLL.</dt><dd className="num mt-1 text-zinc-100">{money(uw.expectedCollection)}</dd></div><div className="bg-[#0d1116] py-2"><dt className="text-zinc-500">CONTRIBUTION</dt><dd className="num mt-1 text-zinc-100">{moneySigned(uw.expectedContribution)}</dd></div><div className="bg-[#0d1116] py-2"><dt className="text-zinc-500">AGENT / REALIZED</dt><dd className="mt-1 text-zinc-100">{run ? run.status : "NOT RUN"} · {money(realized)}</dd></div></dl>
              <p className="mt-3 flex gap-2 text-[12px] leading-relaxed text-zinc-400"><FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />{EXPECTED[c.id]}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={btnPrimary} onClick={() => { select(c.id); if (uw.decision === "BUY CANDIDATE" && !purchases.some((p) => p.claimId === c.id)) acceptOffer(c); runFull(c); }}><Play className="mr-1 inline h-4 w-4" />Finance (if eligible) &amp; run agent</button>
                <button className={btnGhost} onClick={() => { select(c.id); setView("arena"); }}>Inspect in Arena</button>
                <button className={btnGhost} onClick={() => { select(c.id); setView("underwriting"); }}>Reprice</button>
              </div>
            </article>); })}
        </div>
        <p className="mt-3 text-[11px] text-zinc-600">Reset restores the seeded 120-claim portfolio, $250,000 simulated facility, empty ledger, and no agent runs. All data is synthetic.</p>
      </Panel>
    </div>
  );
}
