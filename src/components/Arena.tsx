"use client";
import { Play, RotateCcw, StepForward } from "lucide-react";
import { Badge, Bar, Empty, Field, Panel, btnGhost, btnPrimary, inputCls } from "./ui";
import { MAX_ACTIONS, MAX_SUBMISSIONS } from "@/lib/agent";
import { money, timeFmt } from "@/lib/format";
import { agentStatusLabel, toolLabel, validationLabel } from "@/lib/labels";
import { useSubro } from "@/lib/store";

const statusTone = (s: string) => (s === "RECOVERED" ? "green" : s === "PARTIAL_RECOVERY" ? "teal" : s === "RUNNING" ? "cyan" : s === "NEEDS_EVIDENCE" || s === "NEEDS_HUMAN" || s === "ESCALATED" ? "amber" : "red") as "green" | "teal" | "cyan" | "amber" | "red";

export function Arena() {
  const { claims, selectedId, select, runs, stepRun, runFull, resetRun, purchases } = useSubro();
  const claim = claims.find((c) => c.id === selectedId) ?? claims[0];
  const run = runs[claim.id];
  const purchased = purchases.find((p) => p.claimId === claim.id);
  const running = run?.status === "RUNNING";

  return (
    <div className="space-y-5">
      <Panel title="Chase one claim" sub="Our helper works through a short list of steps. It checks the papers, writes to the insurer, reads the reply, and checks the numbers again. It stops on its own when there is nothing sensible left to do.">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <Field label="Which claim should it chase?">
            <select className={inputCls} value={claim.id} onChange={(e) => select(e.target.value)}>{claims.map((c) => <option key={c.id} value={c.id}>{c.id} · {c.clinic} · insurer may owe {money(c.collectible)}{purchases.some((p) => p.claimId === c.id) ? " · we bought this one" : ""}</option>)}</select>
          </Field>
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} onClick={() => stepRun(claim)} disabled={!!run && !running}><StepForward className="mr-1.5 inline h-4 w-4" />Do the next step</button>
            <button className={btnPrimary} onClick={() => runFull(claim)} disabled={!!run && !running}><Play className="mr-1.5 inline h-4 w-4" />Run it all</button>
            <button className={btnGhost} onClick={() => resetRun(claim.id)}><RotateCcw className="mr-1.5 inline h-4 w-4" />Start again</button>
          </div>
        </div>
        {!purchased && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-900">We have not bought this claim yet, so you can still watch the chase, but any money the insurer agrees to pay will only be counted once the claim is bought.</p>}
      </Panel>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Panel title="What happened, step by step" sub={run ? `${run.events.length} steps so far. It can write to the insurer at most ${MAX_SUBMISSIONS} times.` : "Nothing has happened yet."}>
          {!run ? <Empty>Pick a claim above, then do the first step or run the whole chase.</Empty> : (
            <ol>
              {run.events.map((e, i) => (
                <li key={i} className="flex gap-4 border-b border-slate-100 py-3.5 last:border-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-800">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{toolLabel(e.tool)}</p>
                      <Badge tone={e.validation === "PASS" ? "green" : e.validation === "BLOCKED" ? "amber" : "zinc"}>{validationLabel(e.validation)}</Badge>
                      <span className="text-xs text-slate-400">{timeFmt(e.ts)}</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{e.detail}</p>
                    <p className="mt-1 text-xs text-slate-400">This step cost {money(e.cost)}{e.evidenceRef ? ` · Main paper: ${e.evidenceRef}` : ""}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {run?.draft && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">The letter it wrote to the insurer</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{run.draft}</p>
              <p className="mt-2 text-xs text-slate-400">Every fact in this letter comes from the papers listed above. Nothing is made up.</p>
            </div>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Where the chase stands">
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Status</span>{run ? <Badge tone={statusTone(run.status)}>{agentStatusLabel(run.status)}</Badge> : <Badge>Not started</Badge>}</div>
              <div><div className="mb-1.5 flex justify-between gap-3"><span className="text-slate-500">Steps done</span><span className="num font-medium text-slate-800">{run?.events.length ?? 0} of {MAX_ACTIONS}</span></div><Bar value={run?.events.length ?? 0} max={MAX_ACTIONS} /></div>
              <div><div className="mb-1.5 flex justify-between gap-3"><span className="text-slate-500">Cost so far</span><span className="num font-medium text-slate-800">{money(run?.spent ?? 0)} of {money(run?.budget ?? 0)}</span></div><Bar value={run?.spent ?? 0} max={run?.budget ?? 1} tone="bg-sky-500" /></div>
              <dl className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Times it wrote to the insurer</dt><dd className="num font-medium text-slate-800">{run?.submissions ?? 0} of {MAX_SUBMISSIONS}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Money the insurer agreed to pay</dt><dd className="num font-medium text-slate-800">{money(run?.realized ?? 0)}</dd></div>
              </dl>
              {run?.terminalReason && <p className="rounded-lg bg-teal-50 px-3 py-2.5 leading-relaxed text-teal-900">{run.terminalReason}</p>}
            </div>
          </Panel>
          <Panel title="Rules it can never break">
            <ul className="space-y-2 text-sm leading-relaxed text-slate-600">
              <li>• It stops after {MAX_ACTIONS} steps, so it can never loop forever.</li>
              <li>• It can write to the insurer at most {MAX_SUBMISSIONS} times.</li>
              <li>• It can only spend up to the cost limit shown above.</li>
              <li>• It never makes up a missing paper. It asks for it and waits.</li>
              <li>• When two papers disagree, a person takes over.</li>
              <li>• When the deadline has passed, it stops without writing.</li>
              <li>• When chasing would lose money, it stops. Stopping is a good result, not a failure.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
