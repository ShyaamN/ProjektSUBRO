"use client";
import { useState } from "react";
import { Play, RotateCcw, StepForward } from "lucide-react";
import { Badge, Bar, Empty, Field, InfoTip, Pager, Panel, btnGhost, btnPrimary, inputCls } from "./ui";
import { MAX_ACTIONS, MAX_SUBMISSIONS } from "@/lib/agent";
import { money, timeFmt } from "@/lib/format";
import { agentStatusLabel, toolLabel, validationLabel } from "@/lib/labels";
import { useSubro } from "@/lib/store";

const statusTone = (s: string) => (s === "RECOVERED" ? "green" : s === "PARTIAL_RECOVERY" ? "teal" : s === "RUNNING" ? "cyan" : s === "NEEDS_EVIDENCE" || s === "NEEDS_HUMAN" || s === "ESCALATED" ? "amber" : "red") as "green" | "teal" | "cyan" | "amber" | "red";
const PER_PAGE = 4;

export function Arena() {
  const { claims, selectedId, select, subtab, runs, stepRun, runFull, resetRun, purchases } = useSubro();
  const [page, setPage] = useState(0);
  const [aiState, setAi] = useState<{ claimId: string; text: string; note: string; source: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const askAi = async () => {
    setAiBusy(true);
    try {
      const res = await fetch("/api/agent/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ claimId: claim.id }) });
      const data = await res.json();
      if (res.ok) setAi({ claimId: claim.id, text: data.text, note: data.note, source: data.source }); else setAi({ claimId: claim.id, text: "", note: "The AI helper could not be used just now. The plain letter above still stands.", source: "plain" });
    } catch { setAi({ claimId: claim.id, text: "", note: "The AI helper could not be reached. The plain letter above still stands.", source: "plain" }); }
    setAiBusy(false);
  };
  const claim = claims.find((c) => c.id === selectedId) ?? claims[0];
  const ai = aiState?.claimId === claim.id ? aiState : null;
  const run = runs[claim.id];
  const purchased = purchases.find((p) => p.claimId === claim.id);
  const running = run?.status === "RUNNING";
  const pages = Math.max(1, Math.ceil((run?.events.length ?? 0) / PER_PAGE));
  const safePage = Math.min(page, pages - 1);
  const events = run?.events.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE) ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Panel title="Chase one claim" sub="Our helper checks the papers, writes to the insurer, reads the reply, and checks the numbers again. It stops on its own when there is nothing sensible left to do." className="shrink-0">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <Field label="Which claim should it chase?">
            <select className={inputCls} value={claim.id} onChange={(e) => { select(e.target.value); setPage(0); }}>{claims.map((c) => <option key={c.id} value={c.id}>{c.id} · {c.clinic} · insurer may owe {money(c.collectible)}{purchases.some((p) => p.claimId === c.id) ? " · we bought this one" : ""}</option>)}</select>
          </Field>
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} onClick={() => stepRun(claim)} disabled={!!run && !running}><StepForward className="mr-1.5 inline h-4 w-4" />Do the next step</button>
            <button className={btnPrimary} onClick={() => runFull(claim)} disabled={!!run && !running}><Play className="mr-1.5 inline h-4 w-4" />Run it all</button>
            <button className={btnGhost} onClick={() => { resetRun(claim.id); setPage(0); }}><RotateCcw className="mr-1.5 inline h-4 w-4" />Start again</button>
          </div>
        </div>
        {!purchased && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">We have not bought this claim yet, so you can still watch the chase, but money only counts once the claim is bought.</p>}
      </Panel>

      {subtab === "standing" ? (
        <div className="grid min-h-0 flex-1 items-start gap-4 xl:grid-cols-3">
          <Panel title="Where the chase stands" className="h-full">
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
          <Panel title="The letter it wrote" sub="Every fact in it comes from the papers on the chase page. Nothing is made up." className="h-full">
            {run?.draft ? (
              <div>
                <p className="text-sm leading-relaxed text-slate-700">{run.draft}</p>
                <button className={btnGhost} disabled={aiBusy} onClick={askAi}>{aiBusy ? "Asking the AI helper..." : "Ask the AI helper to polish this letter"}</button>
                {ai && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <p className="flex items-center gap-2 text-xs font-medium text-slate-500">{ai.source === "ai" ? "Polished by the AI helper" : "Plain letter kept"} <InfoTip text="The AI only runs when you press the button, so it spends nothing while you look around. Its reply is checked before it is shown: any dollar figure that does not belong to this claim gets the whole reply thrown away." label="How the AI helper is used" /></p>
                    {ai.text && ai.source === "ai" && <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{ai.text}</p>}
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{ai.note}</p>
                  </div>
                )}
              </div>
            ) : <p className="text-sm text-slate-500">No letter yet. Letters appear once the helper has checked the papers and the rules.</p>}
          </Panel>
          <Panel title="Rules it can never break" className="h-full">
            <ul className="space-y-2 text-sm leading-relaxed text-slate-600">
              <li>• It stops after {MAX_ACTIONS} steps, so it can never loop forever.</li>
              <li>• It can write to the insurer at most {MAX_SUBMISSIONS} times.</li>
              <li>• It can only spend up to the cost limit shown here.</li>
              <li>• It never makes up a missing paper. It asks for it and waits.</li>
              <li>• When two papers disagree, a person takes over.</li>
              <li>• When the deadline has passed, it stops without writing.</li>
              <li>• When chasing would lose money, it stops. Stopping is a good result, not a failure.</li>
            </ul>
          </Panel>
        </div>
      ) : (
        <Panel title="What happened, step by step" sub={run ? `${run.events.length} steps so far. It can write to the insurer at most ${MAX_SUBMISSIONS} times.` : "Nothing has happened yet."} className="min-h-0 flex-1" right={<Pager page={safePage} pages={pages} onPage={setPage} />}>
          {!run ? <Empty>Pick a claim above, then do the first step or run the whole chase.</Empty> : (
            <ol>
              {events.map((e, i) => (
                <li key={safePage * PER_PAGE + i} className="flex gap-4 border-b border-slate-100 py-3 last:border-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-800">{safePage * PER_PAGE + i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{toolLabel(e.tool)}</p>
                      <Badge tone={e.validation === "PASS" ? "green" : e.validation === "BLOCKED" ? "amber" : "zinc"}>{validationLabel(e.validation)}</Badge>
                      <span className="text-xs text-slate-400">{timeFmt(e.ts)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">{e.detail}</p>
                    <p className="mt-1 text-xs text-slate-400">This step cost {money(e.cost)}{e.evidenceRef ? ` · Main paper: ${e.evidenceRef}` : ""}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {run && <p className="mt-auto pt-3 text-sm text-slate-500">Status: <span className="font-medium text-slate-800">{agentStatusLabel(run.status)}</span> · cost so far {money(run.spent)} of {money(run.budget)} · insurer agreed to pay {money(run.realized)}</p>}
        </Panel>
      )}
    </div>
  );
}
