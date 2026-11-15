"use client";
import { Bot, Play, RotateCcw, StepForward } from "lucide-react";
import { Badge, Bar, Empty, Field, Panel, btnGhost, btnPrimary, inputCls } from "./ui";
import { MAX_ACTIONS, MAX_SUBMISSIONS } from "@/lib/agent";
import { money, timeFmt } from "@/lib/format";
import { useSubro } from "@/lib/store";

const statusTone = (s: string) => (s === "RECOVERED" ? "green" : s === "PARTIAL_RECOVERY" ? "teal" : s === "RUNNING" ? "cyan" : s === "NEEDS_EVIDENCE" || s === "NEEDS_HUMAN" ? "amber" : "red") as "green" | "teal" | "cyan" | "amber" | "red";

export function Arena() {
  const { claims, selectedId, select, runs, stepRun, runFull, resetRun, purchases } = useSubro();
  const claim = claims.find((c) => c.id === selectedId) ?? claims[0];
  const run = runs[claim.id];
  const purchased = purchases.find((p) => p.claimId === claim.id);
  const tools = ["READ_CLAIM", "READ_EVIDENCE", "CHECK_REQUIREMENTS", "REQUEST_EVIDENCE", "DRAFT_RESPONSE", "SUBMIT_TO_MOCK_INSURER", "RECHECK_ECONOMICS", "ESCALATE", "STOP"];

  return (
    <div className="space-y-3">
      <Panel title="Autonomous Recovery Arena" sub="Bounded agent operations — restricted tool set, server-validatable actions, no database / credential / external-messaging access. Event text is an operational record, not a model reasoning trace." right={<Badge tone="amber">MOCK INSURER ONLY</Badge>}>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <Field label="Claim under recovery"><select className={inputCls} value={claim.id} onChange={(e) => select(e.target.value)}>{claims.map((c) => <option key={c.id} value={c.id}>{c.id} · {c.clinic} · collectible {money(c.collectible)}{purchases.some((p) => p.claimId === c.id) ? " · FINANCED" : ""}</option>)}</select></Field>
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} onClick={() => stepRun(claim)} disabled={run?.status !== undefined && run.status !== "RUNNING"}><StepForward className="mr-1 inline h-4 w-4" />Step</button>
            <button className={btnPrimary} onClick={() => runFull(claim)} disabled={run?.status !== undefined && run.status !== "RUNNING"}><Play className="mr-1 inline h-4 w-4" />Run to terminal state</button>
            <button className={btnGhost} onClick={() => resetRun(claim.id)}><RotateCcw className="mr-1 inline h-4 w-4" />Reset run</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">{tools.map((t) => <span key={t} className={`mono rounded-sm border px-1.5 py-0.5 text-[10px] ${run?.events.some((e) => e.tool === t) ? "border-teal-800 bg-teal-950/50 text-teal-300" : "border-[#2b343f] text-zinc-500"}`}>{t}</span>)}</div>
        {!purchased && <p className="mt-3 rounded-sm border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-[12px] text-amber-200">This claim is not financed. The agent may still be exercised in simulation, but realized amounts will not post to the ledger until a simulated purchase exists.</p>}
      </Panel>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Operational event stream" sub={run ? `${run.events.length} actions · ${run.submissions}/${MAX_SUBMISSIONS} submissions · phase ${run.phase}` : "No run started"}>
          {!run ? <Empty>No agent run for {claim.id} yet. Step through the workflow or run to a terminal state.</Empty> : (
            <ol className="space-y-0">{run.events.map((e, i) => <li key={i} className="flex gap-3 border-b border-[#1d232b] py-2.5 last:border-0"><span className="mono w-[74px] shrink-0 pt-0.5 text-[11px] text-zinc-500">{timeFmt(e.ts)}</span><span className={`mono w-[178px] shrink-0 text-[11px] font-semibold ${e.validation === "PASS" ? "text-teal-300" : e.validation === "BLOCKED" ? "text-amber-300" : "text-zinc-300"}`}>{e.tool}</span><div className="min-w-0 flex-1"><p className="text-[12px] leading-relaxed text-zinc-300">{e.detail}</p><p className="mt-0.5 text-[10px] text-zinc-600">validation {e.validation} · cost ${e.cost.toFixed(0)}{e.evidenceRef ? ` · evidence ${e.evidenceRef}` : ""}</p></div></li>)}</ol>
          )}
          {run?.draft && <div className="mt-3 border border-[#2b343f] bg-[#0d1116] p-3"><div className="mb-1 text-[10px] tracking-wider text-zinc-500 uppercase">Evidence-grounded draft (deterministic — generated text is not a reasoning trace)</div><p className="text-[12px] leading-relaxed text-zinc-300">{run.draft}</p></div>}
        </Panel>

        <div className="space-y-3">
          <Panel title="Run control & safety">
            <div className="space-y-3 text-[12px]">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-zinc-400"><Bot className="h-4 w-4 text-teal-400" />Status</span>{run ? <Badge tone={statusTone(run.status)}>{run.status}</Badge> : <Badge>NOT STARTED</Badge>}</div>
              <div><div className="mb-1 flex justify-between"><span className="text-zinc-500">Operating budget</span><span className="num">${run?.spent.toFixed(0) ?? 0} / ${run?.budget ?? "—"}</span></div><Bar value={run?.spent ?? 0} max={run?.budget ?? 1} tone="bg-cyan-500" /></div>
              <div><div className="mb-1 flex justify-between"><span className="text-zinc-500">Actions</span><span className="num">{run?.events.length ?? 0} / {MAX_ACTIONS}</span></div><Bar value={run?.events.length ?? 0} max={MAX_ACTIONS} /></div>
              <dl className="space-y-1.5 border-t border-[#20262e] pt-2.5 text-zinc-400">
                <div className="flex justify-between"><dt>Submissions</dt><dd className="num text-zinc-100">{run?.submissions ?? 0} / {MAX_SUBMISSIONS}</dd></div>
                <div className="flex justify-between"><dt>Realized (simulated)</dt><dd className="num text-zinc-100">{money(run?.realized ?? 0)}</dd></div>
                <div className="flex justify-between"><dt>Insurer response fingerprints</dt><dd className="mono text-[11px] text-zinc-100">{run?.insurerFingerprints.join(", ") || "—"}</dd></div>
              </dl>
              {run?.terminalReason && <p className="border-l-2 border-teal-700 pl-2 leading-relaxed text-zinc-300">{run.terminalReason}</p>}
            </div>
          </Panel>
          <Panel title="Enforced guardrails"><ul className="list-inside space-y-1.5 text-[12px] leading-relaxed text-zinc-400"><li>· Max {MAX_ACTIONS} actions, {MAX_SUBMISSIONS} submissions, hard cost budget</li><li>· Evidence provenance required before drafting</li><li>· Deadline + duplicate-draft + loop / unchanged-response detection</li><li>· Contradictions and authorization gaps escalate to humans</li><li>· Negative expected value terminates the run</li><li>· Missing evidence is requested, never manufactured</li></ul></Panel>
        </div>
      </div>
    </div>
  );
}
