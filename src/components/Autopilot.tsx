"use client";
import { useMemo, useState } from "react";
import { Bot, CheckCircle2, Circle, Loader2, Play, Trash2 } from "lucide-react";
import { Badge, Empty, Pager, Panel, btnGhost, btnPrimary } from "./ui";
import { runToCompletion } from "@/lib/agent";
import { allocatePortfolio } from "@/lib/capital";
import { portfolioAnalytics } from "@/lib/finance";
import { money, timeFmt } from "@/lib/format";
import { agentStatusLabel } from "@/lib/labels";
import { useSubro, type AutoEntry } from "@/lib/store";

const STAGES = ["Look at every claim", "Decide what is worth buying", "Buy the best ones", "Chase each one", "Write it all in the log"];
const KIND_TONE: Record<AutoEntry["kind"], "teal" | "green" | "cyan" | "amber" | "zinc"> = { SCAN: "zinc", DECIDE: "teal", BUY: "cyan", CHASE: "amber", MONEY: "green", NOTE: "zinc" };
const KIND_WORD: Record<AutoEntry["kind"], string> = { SCAN: "Looked", DECIDE: "Decided", BUY: "Bought", CHASE: "Chased", MONEY: "Money", NOTE: "Note" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const LOG_PER_PAGE = 9;

export function Autopilot() {
  const s = useSubro();
  const [stage, setStage] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState("");
  const [page, setPage] = useState(0);

  const plan = useMemo(() => {
    const ids = new Set(s.purchases.map((p) => p.claimId));
    const byInsurer: Record<string, number> = {};
    s.purchases.forEach((p) => { const ins = s.claims.find((c) => c.id === p.claimId)?.insurer ?? ""; byInsurer[ins] = (byInsurer[ins] ?? 0) + p.advance; });
    return allocatePortfolio(s.claims, s.config, ids, byInsurer, s.reconciliation.deployed);
  }, [s.claims, s.config, s.purchases, s.reconciliation.deployed]);

  const runAll = async () => {
    if (busy) return;
    setBusy(true); setSummary("");
    const a = portfolioAnalytics(s.claims, s.config.minContribution);
    setStage(0);
    s.logAuto("SCAN", `Looked at all ${a.count} claims. Insurers may owe ${money(a.collectible)} in total, and on average we expect to get back ${money(a.expectedCollection)}.`);
    await sleep(500);
    setStage(1);
    s.logAuto("DECIDE", `Sorted every claim: ${a.buyCount} worth buying, ${a.reviewCount} need a closer look, and ${a.declineCount} to skip. The skip list is mostly missing papers, deadlines that have passed, and deals that lose money.`);
    await sleep(500);
    setStage(2);
    if (plan.selected.length > 0) {
      s.acceptMany(plan.selected.map((x) => x.claim));
      for (const x of plan.selected) s.logAuto("BUY", `Bought ${x.claim.id} from ${x.claim.clinic} for ${money(x.advance)}. On average we expect ${money(x.expectedCollection)} back, a gain of ${money(x.expectedContribution)}.`);
      s.logAuto("MONEY", `Spent ${money(plan.totalAdvance)} on ${plan.selected.length} claims. That leaves ${money(s.config.availableCapital - s.reconciliation.deployed - plan.totalAdvance)} of the money still unspent.`);
    } else {
      s.logAuto("BUY", "Nothing new was worth buying under your rules, so no money was spent.");
    }
    await sleep(500);
    setStage(3);
    const boughtNow = plan.selected.map((x) => x.claim);
    const alreadyWaiting = s.claims.filter((c) => s.purchases.some((p) => p.claimId === c.id && p.status === "ACTIVE") && !s.runs[c.id]);
    const toChase = [...boughtNow, ...alreadyWaiting.filter((c) => !boughtNow.some((b) => b.id === c.id))];
    let paid = 0; let paidOut = 0; let stopped = 0; let people = 0;
    for (const claim of toChase) {
      const preview = runToCompletion(claim);
      s.runFull(claim);
      if (preview.realized > 0) { paid++; paidOut += preview.realized; }
      if (preview.status === "TERMINATED") stopped++;
      if (preview.status === "NEEDS_HUMAN" || preview.status === "ESCALATED" || preview.status === "NEEDS_EVIDENCE") people++;
      s.logAuto("CHASE", `${claim.id}: ${agentStatusLabel(preview.status)}. ${preview.terminalReason ?? ""} The chase cost ${money(preview.spent)}${preview.realized > 0 ? ` and the insurer agreed to pay ${money(preview.realized)}` : ""}.`);
      await sleep(260);
    }
    if (toChase.length === 0) s.logAuto("CHASE", "There was nothing waiting to be chased.");
    setStage(4);
    const doneText = `Finished. Bought ${plan.selected.length} new claims, chased ${toChase.length}, and insurers agreed to pay ${money(paidOut)} across ${paid} of them. ${stopped} chases stopped on their own, and ${people} were handed to a person or are waiting for a paper.`;
    s.logAuto("NOTE", doneText);
    setSummary(doneText);
    await sleep(400);
    setStage(-1); setBusy(false);
    s.setSubtab("log"); setPage(0);
  };

  if (s.subtab === "log") {
    const pages = Math.max(1, Math.ceil(s.autoLog.length / LOG_PER_PAGE));
    const safe = Math.min(page, pages - 1);
    const entries = s.autoLog.slice(safe * LOG_PER_PAGE, safe * LOG_PER_PAGE + LOG_PER_PAGE);
    return (
      <Panel title="Log" sub="Everything the auto helper has done, in the order it happened. Nothing happens without a line here." className="h-full" right={<div className="flex items-center gap-2"><Pager page={safe} pages={pages} onPage={setPage} /><button className={btnGhost} disabled={s.autoLog.length === 0} onClick={() => { s.clearAutoLog(); setPage(0); }}><Trash2 className="mr-1.5 inline h-4 w-4" />Clear the log</button></div>}>
        {entries.length === 0 ? <Empty>The log is empty. Run the auto helper and every step it takes will land here.</Empty> : (
          <ol>
            {entries.map((e) => (
              <li key={e.id} className="flex gap-3.5 border-b border-slate-100 py-2.5 last:border-0">
                <span className="mono w-[70px] shrink-0 pt-0.5 text-[12px] text-slate-400">{timeFmt(e.ts)}</span>
                <Badge tone={KIND_TONE[e.kind]}>{KIND_WORD[e.kind]}</Badge>
                <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-600">{e.text}</p>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    );
  }

  return (
    <div className="grid h-full min-h-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Panel title="Let the helper do the whole job" sub="One press and it looks at every claim, decides what is worth buying under your rules, buys those, chases each one, and writes every move in the log. You can watch it work on the right." className="h-full">
        <div className="flex flex-wrap items-center gap-3">
          <button className={btnPrimary} disabled={busy} onClick={runAll}>{busy ? <><Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" />Working...</> : <><Play className="mr-1.5 inline h-4 w-4" />Run the auto helper</>}</button>
          <button className={btnGhost} disabled={busy} onClick={() => s.setSubtab("log")}>Read the log</button>
          <span className="flex items-center gap-1.5 text-sm text-slate-500"><Bot className="h-4 w-4 text-teal-700" />It follows the rules on the Buy claims page.</span>
        </div>
        {summary && <p className="mt-4 rounded-lg bg-teal-50 px-3.5 py-3 text-sm leading-relaxed text-teal-900" role="status">{summary}</p>}
        <dl className="mt-5 grid grid-cols-2 gap-3 text-center md:grid-cols-4">
          <div className="rounded-xl bg-slate-50 py-3"><dt className="text-[11px] text-slate-500">Worth buying right now</dt><dd className="num mt-1 text-lg font-semibold text-slate-900">{plan.selected.length}</dd></div>
          <div className="rounded-xl bg-slate-50 py-3"><dt className="text-[11px] text-slate-500">It would spend</dt><dd className="num mt-1 text-lg font-semibold text-slate-900">{money(plan.totalAdvance)}</dd></div>
          <div className="rounded-xl bg-slate-50 py-3"><dt className="text-[11px] text-slate-500">Expected gain</dt><dd className="num mt-1 text-lg font-semibold text-teal-800">{money(plan.totalExpectedContribution)}</dd></div>
          <div className="rounded-xl bg-slate-50 py-3"><dt className="text-[11px] text-slate-500">Claims already owned</dt><dd className="num mt-1 text-lg font-semibold text-slate-900">{s.purchases.length}</dd></div>
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-slate-500">It will never buy a claim that loses money on average, one with a missing paper, or one whose deadline has passed. Those get skipped and the skip lands in the log. When papers disagree or an approval is missing, a person gets it instead.</p>
      </Panel>

      <Panel title="What it is doing" sub="Each step lights up as it happens." className="h-full">
        <ol className="space-y-3">
          {STAGES.map((label, i) => {
            const done = stage > i || (stage === -1 && summary !== "" && i < STAGES.length);
            const active = stage === i;
            return (
              <li key={label} className="flex items-center gap-3 text-sm">
                {active ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-teal-700" /> : done && (busy || summary) ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <Circle className="h-5 w-5 shrink-0 text-slate-300" />}
                <span className={active ? "font-medium text-slate-900" : done && (busy || summary) ? "text-slate-700" : "text-slate-400"}>{label}</span>
              </li>
            );
          })}
        </ol>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-700">Latest log lines</p>
          {s.autoLog.length === 0 ? <p className="mt-1.5 text-sm text-slate-400">Nothing yet. The first run will fill this in.</p> : (
            <ul className="mt-2 space-y-2">{s.autoLog.slice(0, 4).map((e) => <li key={e.id} className="flex gap-2 text-[13px] leading-relaxed text-slate-500"><Badge tone={KIND_TONE[e.kind]}>{KIND_WORD[e.kind]}</Badge><span className="min-w-0">{e.text}</span></li>)}</ul>
          )}
        </div>
      </Panel>
    </div>
  );
}
