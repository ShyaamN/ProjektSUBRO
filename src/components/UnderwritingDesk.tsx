"use client";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge, Field, Kpi, Panel, btnPrimary, inputCls } from "./ui";
import { decisionTone } from "./ClaimDetail";
import { underwrite } from "@/lib/finance";
import { money, moneySigned, pct } from "@/lib/format";
import { useSubro } from "@/lib/store";

export function UnderwritingDesk() {
  const { claims, selectedId, select, updateProbability, acceptOffer, purchases, config } = useSubro();
  const claim = claims.find((c) => c.id === selectedId) ?? claims[0];
  const [prob, setProb] = useState(claim.recoveryProbability); const [advance, setAdvance] = useState(Math.round(claim.collectible * 0.6)); const [cost, setCost] = useState(claim.estimatedCost); const [min, setMin] = useState(config.minContribution); const [msg, setMsg] = useState("");
  useEffect(() => { setProb(claim.recoveryProbability); setAdvance(Math.round(claim.collectible * 0.6)); setCost(claim.estimatedCost); }, [claim.id, claim.recoveryProbability, claim.collectible, claim.estimatedCost]);
  const uw = useMemo(() => underwrite(claim, { probability: prob, advance, cost, minContribution: min }), [claim, prob, advance, cost, min]);
  const purchased = purchases.some((p) => p.claimId === claim.id);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Panel title="Claim selection" sub="Every claim receives the same deterministic checks">
          <Field label="Claim"><select className={inputCls} value={claim.id} onChange={(e) => select(e.target.value)}>{claims.map((c) => <option key={c.id} value={c.id}>{c.id} · {c.clinic} · {money(c.collectible)}</option>)}</select></Field>
          <div className="mt-4 space-y-4">
            <div><div className="mb-1 flex justify-between text-[11px]"><label htmlFor="prob" className="tracking-wider text-zinc-500 uppercase">Modeled recovery probability</label><span className="num text-teal-300">{pct(prob)}</span></div><input id="prob" type="range" min={0} max={1} step={0.01} value={prob} onChange={(e) => setProb(Number(e.target.value))} className="w-full" /><div className="flex gap-2"><input aria-label="Probability percent" className={inputCls} type="number" min={0} max={100} value={Math.round(prob * 100)} onChange={(e) => setProb(Number(e.target.value) / 100)} /><button className="shrink-0 rounded-sm border border-[#2b343f] px-2 text-xs text-zinc-300" onClick={() => updateProbability(claim.id, prob)}>Save as assumption</button></div><p className="mt-1 text-[10px] text-zinc-600">Assumption only — not an empirical recovery rate. Saving reprices the whole portfolio.</p></div>
            <Field label="Proposed advance ($)"><input className={inputCls} type="number" min={0} value={advance} onChange={(e) => setAdvance(Number(e.target.value))} /></Field>
            <Field label="Expected recovery expenses ($)"><input className={inputCls} type="number" min={0} value={cost} onChange={(e) => setCost(Number(e.target.value))} /></Field>
            <Field label="Minimum acceptable contribution ($)"><input className={inputCls} type="number" value={min} onChange={(e) => setMin(Number(e.target.value))} /></Field>
          </div>
          <div className="mt-4 border-t border-[#20262e] pt-3 text-[12px] leading-relaxed text-zinc-500">Worked check — CASE-1042 at 80%: expected $400 − advance $300 − expenses $30 = <span className="text-emerald-300">+$70</span>. At 50%: $250 − $300 − $30 = <span className="text-red-300">−$80</span>, and the offer is invalidated below a maximum price of $195 (at a $25 minimum).</div>
        </Panel>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Kpi label="Expected collection" value={money(uw.expectedCollection)} hint={`${money(claim.collectible)} × ${pct(prob, 0)} modeled`} tone="text-teal-300" />
            <Kpi label="Expected contribution" value={moneySigned(uw.expectedContribution)} hint="Expected collection − advance − expenses" tone={uw.expectedContribution >= 0 ? "text-emerald-300" : "text-red-300"} />
            <Kpi label="Maximum acceptable price" value={money(Math.max(0, uw.maxPrice))} hint="Above this, minimum contribution fails" />
            <Kpi label="Risk reserve (earmark)" value={money(uw.riskReserve)} hint="Non-cash capital earmark" tone="text-amber-300" />
          </div>
          <Panel title={`Decision — ${claim.id}`} sub={claim.denialReason} right={<Badge tone={decisionTone(uw.decision)}>{uw.decision}</Badge>}>
            <div className="space-y-2">{uw.checks.map((c) => <div key={c.label} className="flex gap-2.5 border-b border-[#1d232b] pb-2 text-[12px] last:border-0">{c.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />}<div><span className="font-medium text-zinc-200">{c.label}</span><p className="mt-0.5 leading-relaxed text-zinc-500">{c.detail}</p></div></div>)}</div>
            <div className="mt-3 space-y-1">{uw.reasons.map((r) => <p key={r} className="border-l-2 border-teal-800 pl-2 text-[12px] leading-relaxed text-zinc-400">{r}</p>)}</div>
            {uw.expectedContribution < 0 && <p className="mt-3 rounded-sm border border-red-900/60 bg-red-950/30 px-3 py-2 text-[12px] text-red-300">Offer invalidated at this advance. Reprice to at most {money(Math.max(0, uw.maxPrice))} or decline — the system will not finance a negative-expected-contribution claim at the current price.</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button className={btnPrimary} disabled={purchased || uw.decision !== "BUY CANDIDATE"} onClick={() => setMsg(acceptOffer(claim, advance).message)}>{purchased ? "Already financed" : "Accept simulated offer at this advance"}</button>
              {msg && <span className="text-[12px] text-zinc-400" role="status">{msg}</span>}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
