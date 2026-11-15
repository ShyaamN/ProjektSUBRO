"use client";
import { Play, RotateCcw } from "lucide-react";
import { Badge, InfoTip, btnGhost, btnPrimary } from "./ui";
import { underwrite } from "@/lib/finance";
import { money } from "@/lib/format";
import { agentStatusLabel, decisionLabel, decisionTone } from "@/lib/labels";
import { useSubro } from "@/lib/store";

const STORY: Record<string, string> = {
  "CASE-1042": "The insurer may owe $500 and the key paper is ready to go. We pay the clinic $300, spend about $30 chasing it, and on average we end up $70 ahead. Run it and the insurer pays in full.",
  "CASE-2088": "The insurer may owe $20,000, which looks great at first glance. But the last day to act has already passed, so we walk away, and the helper never writes to the insurer at all.",
  "CASE-3021": "The one paper we really need is missing. The helper asks the clinic for it and waits. It will never make a paper up.",
  "CASE-4109": "This insurer keeps giving the same answer, word for word. The helper notices that nothing is changing and stops instead of writing the same letter forever.",
  "CASE-5060": "Two papers give two different dates for the same care. The helper hands it to a person and does not pick the date that helps us most.",
  "CASE-6077": "The insurer pays only $350 of the $800 it may owe. The books show the $350 that really came in, not the $800 we hoped for, and the final result is worked out from that.",
};

export function Scenarios() {
  const { claims, select, setView, setSubtab, subtab, runs, runFull, acceptOffer, resetAll, purchases, ledger } = useSubro();
  const all = claims.filter((c) => c.scenario);
  const scenarios = subtab === "second" ? all.slice(3) : all.slice(0, 3);
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 items-center gap-2">
        <p className="text-[15px] font-semibold text-slate-800">Stories that show how it works</p>
        <InfoTip text="Each card is a real claim in the list. Press its button and watch what the helper does, then look at the money page to see how it was written down." label="About these stories" />
        <span className="ml-auto" />
        <button className={btnGhost} onClick={() => { if (confirm("Start fresh? Every bought claim, every chase, and all the money entries will be wiped, and the demo will go back to how it started.")) resetAll(); }}><RotateCcw className="mr-1.5 inline h-4 w-4" />Start fresh</button>
        <InfoTip text="Start fresh wipes everything and puts all 120 claims back how they started, so you can run any story again from zero." label="About starting fresh" />
      </div>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-3">
        {scenarios.map((c) => {
          const uw = underwrite(c, {});
          const run = runs[c.id];
          const moneyBack = ledger.filter((t) => t.claimId === c.id && t.type === "REALIZED_COLLECTION").reduce((a2, t) => a2 + t.amount, 0);
          const ahead = uw.expectedContribution >= 0;
          return (
            <article key={c.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,42,51,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-900"><span className="mono text-teal-800">{c.id}</span> · {c.scenario}</h3>
                  <p className="mt-1 text-sm text-slate-500">{c.clinic} · {c.insurer}</p>
                </div>
                <Badge tone={decisionTone(uw.decision)}>{decisionLabel(uw.decision)}</Badge>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{STORY[c.id]}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 px-1 py-2.5"><dt className="text-[11px] text-slate-500">Insurer may owe</dt><dd className="num mt-1 text-sm font-semibold text-slate-900">{money(c.collectible)}</dd></div>
                <div className="rounded-xl bg-slate-50 px-1 py-2.5"><dt className="text-[11px] text-slate-500">{ahead ? "Expected gain" : "Expected loss"}</dt><dd className={`num mt-1 text-sm font-semibold ${ahead ? "text-emerald-700" : "text-red-700"}`}>{money(Math.abs(uw.expectedContribution))}</dd></div>
                <div className="rounded-xl bg-slate-50 px-1 py-2.5"><dt className="text-[11px] text-slate-500">Money back so far</dt><dd className="num mt-1 text-sm font-semibold text-slate-900">{money(moneyBack)}</dd></div>
              </dl>
              {run && <p className="mt-3 text-sm text-slate-600">Chase result so far: <span className="font-medium text-slate-800">{agentStatusLabel(run.status)}</span></p>}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <button className={btnPrimary} onClick={() => { select(c.id); if (uw.decision === "BUY CANDIDATE" && !purchases.some((p) => p.claimId === c.id)) acceptOffer(c); runFull(c); }}><Play className="mr-1.5 inline h-4 w-4" />Run this example</button>
                <button className={btnGhost} onClick={() => { select(c.id); setView("arena"); setSubtab("chase"); }}>Watch the chase</button>
                <button className={btnGhost} onClick={() => { select(c.id); setView("underwriting"); setSubtab("answer"); }}>Change the numbers</button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
