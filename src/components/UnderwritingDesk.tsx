"use client";
import { useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge, Field, InfoTip, Kpi, Panel, btnPrimary, inputCls } from "./ui";
import { underwrite } from "@/lib/finance";
import { money, pct } from "@/lib/format";
import { decisionLabel, decisionTone } from "@/lib/labels";
import { useSubro } from "@/lib/store";

export function UnderwritingDesk() {
  const { claims, selectedId } = useSubro();
  const claim = claims.find((c) => c.id === selectedId) ?? claims[0];
  return <DeskInner key={claim.id} />;
}

function DeskInner() {
  const { claims, selectedId, select, updateProbability, acceptOffer, purchases, config } = useSubro();
  const claim = claims.find((c) => c.id === selectedId) ?? claims[0];
  const [prob, setProb] = useState(claim.recoveryProbability);
  const [payNow, setPayNow] = useState(Math.round(claim.collectible * 0.6));
  const [cost, setCost] = useState(claim.estimatedCost);
  const [leastGain, setLeastGain] = useState(config.minContribution);
  const [msg, setMsg] = useState("");
  const uw = useMemo(() => underwrite(claim, { probability: prob, advance: payNow, cost, minContribution: leastGain }), [claim, prob, payNow, cost, leastGain]);
  const purchased = purchases.some((p) => p.claimId === claim.id);
  const ahead = uw.expectedContribution >= 0;

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Panel title="Pick a claim, then play with the numbers" sub="Move anything on this side and watch the answer change at once.">
        <Field label="Claim">
          <select className={inputCls} value={claim.id} onChange={(e) => select(e.target.value)}>{claims.map((c) => <option key={c.id} value={c.id}>{c.id} · {c.clinic} · insurer may owe {money(c.collectible)}</option>)}</select>
        </Field>
        <div className="mt-5 space-y-5">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label htmlFor="chance" className="flex items-center gap-1.5 text-sm font-medium text-slate-700">Chance we get paid <InfoTip text="This is our best guess, not a promise. Try 50 to see how fast a good deal can turn bad. Save this guess and the claims page uses it too." label="About this guess" /></label>
              <span className="num text-sm font-semibold text-teal-800">{pct(prob, 0)}</span>
            </div>
            <input id="chance" type="range" min={0} max={1} step={0.01} value={prob} onChange={(e) => setProb(Number(e.target.value))} className="w-full" aria-label="Chance we get paid" />
            <div className="mt-2 flex gap-2">
              <input aria-label="Chance as a number out of 100" className={inputCls} type="number" min={0} max={100} value={Math.round(prob * 100)} onChange={(e) => setProb(Math.min(100, Math.max(0, Number(e.target.value))) / 100)} />
              <button className={btnPrimary} onClick={() => { updateProbability(claim.id, prob); setMsg("Saved. The claims page now uses this guess too."); }}>Save this guess</button>
            </div>
          </div>
          <Field label="We pay the clinic now ($)" help="This is the price of buying the claim from the clinic."><input className={inputCls} type="number" min={0} value={payNow} onChange={(e) => setPayNow(Number(e.target.value))} /></Field>
          <Field label="Cost to chase it ($)" help="Letters, calls, staff time, and fees while we chase the insurer."><input className={inputCls} type="number" min={0} value={cost} onChange={(e) => setCost(Number(e.target.value))} /></Field>
          <Field label="Least gain we will accept ($)" help="If the expected gain falls below this, we will not buy at that price."><input className={inputCls} type="number" value={leastGain} onChange={(e) => setLeastGain(Number(e.target.value))} /></Field>
        </div>
        {msg && <p className="mt-4 rounded-lg bg-teal-50 px-3 py-2.5 text-sm text-teal-900" role="status">{msg}</p>}
      </Panel>

      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Kpi label="On average we expect to get back" value={money(uw.expectedCollection)} hint={`${money(claim.collectible)} times a ${pct(prob, 0)} chance`} tone="text-teal-800" />
          <Kpi label={ahead ? "Expected gain" : "Expected loss"} value={money(Math.abs(uw.expectedContribution))} hint={ahead ? "What is left after we pay the clinic and chase the claim." : "What we would lose on average at this price."} tone={ahead ? "text-emerald-700" : "text-red-700"} />
          <Kpi label="Most we should pay" value={money(Math.max(0, uw.maxPrice))} hint="Pay more than this and the deal stops making sense." />
        </div>

        <Panel title={`Answer for claim ${claim.id}`} sub="Plain answer first, then the checks behind it." right={<Badge tone={decisionTone(uw.decision)}>{decisionLabel(uw.decision)}</Badge>}>
          <p className="text-[17px] leading-relaxed text-slate-800">
            On average, we expect to get back <strong>{money(uw.expectedCollection)}</strong>. After paying the clinic <strong>{money(payNow)}</strong> and spending <strong>{money(cost)}</strong> to chase it, we would end up{" "}
            {ahead ? <strong className="text-emerald-700">{money(uw.expectedContribution)} ahead</strong> : <strong className="text-red-700">{money(Math.abs(uw.expectedContribution))} behind</strong>}.
          </p>
          {!ahead && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2.5 text-sm leading-relaxed text-red-800">So we should either pay no more than {money(Math.max(0, uw.maxPrice))}, or walk away from this one.</p>}

          <h3 className="mt-6 text-sm font-semibold text-slate-800">Before we buy, we check five things</h3>
          <ul className="mt-2 divide-y divide-slate-100">
            {uw.checks.map((c) => (
              <li key={c.label} className="flex gap-3 py-3">
                {c.pass ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}
                <div><p className="text-sm font-medium text-slate-800">{c.label}</p><p className="mt-0.5 text-sm leading-relaxed text-slate-500">{c.detail}</p></div>
              </li>
            ))}
          </ul>
          <ul className="mt-2 space-y-1.5">{uw.reasons.map((r) => <li key={r} className="text-sm leading-relaxed text-slate-600">• {r}</li>)}</ul>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button className={btnPrimary} disabled={purchased || uw.decision !== "BUY CANDIDATE"} onClick={() => setMsg(acceptOffer(claim, payNow).message)}>{purchased ? "We already bought this one" : "Buy at this price"}</button>
            {msg && <span className="text-sm text-slate-500" role="status">{msg}</span>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
