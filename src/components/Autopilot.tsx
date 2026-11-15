"use client";
import { useMemo, useState } from "react";
import { Bot, CheckCircle2, Circle, Loader2, Play, Trash2 } from "lucide-react";
import { Badge, Empty, Pager, Panel, btnGhost, btnPrimary } from "./ui";
import { runToCompletion } from "@/lib/agent";
import { allocatePortfolio } from "@/lib/capital";
import { money, timeFmt } from "@/lib/format";
import { agentStatusLabel } from "@/lib/labels";
import { useSubro, type AutoEntry } from "@/lib/store";

const STAGES = ["Send every claim to the AI", "The AI decides what to buy", "Safety checks on the AI list", "Buy the approved ones", "Chase each one", "Write it all in the log"];
const KIND_TONE: Record<AutoEntry["kind"], "teal" | "green" | "cyan" | "amber" | "zinc"> = { SCAN: "zinc", DECIDE: "teal", BUY: "cyan", CHASE: "amber", MONEY: "green", NOTE: "zinc" };
const KIND_WORD: Record<AutoEntry["kind"], string> = { SCAN: "Looked", DECIDE: "Decided", BUY: "Bought", CHASE: "Chased", MONEY: "Money", NOTE: "Note" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const LOG_PER_PAGE = 9;
const AI_LETTER_CAP = 8;

interface CheckedPick { claimId: string; advance: number; expectedCollection: number; expectedContribution: number; why: string; trimmed: boolean; }

export function Autopilot() {
  const s = useSubro();
  const [stage, setStage] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState("");
  const [page, setPage] = useState(0);

  const rulesPlan = useMemo(() => {
    const ids = new Set(s.purchases.map((p) => p.claimId));
    const byInsurer: Record<string, number> = {};
    s.purchases.forEach((p) => { const ins = s.claims.find((c) => c.id === p.claimId)?.insurer ?? ""; byInsurer[ins] = (byInsurer[ins] ?? 0) + p.advance; });
    return allocatePortfolio(s.claims, s.config, ids, byInsurer, s.reconciliation.deployed);
  }, [s.claims, s.config, s.purchases, s.reconciliation.deployed]);

  const runAll = async () => {
    if (busy) return;
    setBusy(true); setSummary("");
    setStage(0);
    s.logAuto("SCAN", `Sent all ${s.claims.length} claims to the AI, along with your money rules. It sees what each insurer may owe, the chance of getting paid, the chase cost, the papers, and the days left to act.`);
    let accepted: CheckedPick[] = [];
    let source = "rules";
    try {
      const res = await fetch("/api/agent/autopilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ claims: s.claims, config: s.config, purchasedIds: s.purchases.map((p) => p.claimId) }) });
      const data = await res.json();
      if (!res.ok) throw new Error("bad reply");
      accepted = data.accepted ?? [];
      source = data.source ?? "rules";
      setStage(1);
      s.logAuto("DECIDE", source === "ai" ? `The AI made the calls. ${data.note ?? ""}` : `${data.note ?? "The plain rules made the list."}`);
      setStage(2);
      for (const r of (data.rejected ?? []).slice(0, 8)) s.logAuto("DECIDE", `Threw out the AI pick for ${r.claimId}: ${r.reason}`);
      if ((data.rejected ?? []).length > 0) s.logAuto("DECIDE", `Safety checks threw out ${(data.rejected ?? []).length} of the AI picks. Only the sound ones go ahead.`);
      else if (source === "ai") s.logAuto("DECIDE", "Every AI pick passed the safety checks: papers ready, time left, gain big enough, money there.");
    } catch {
      accepted = rulesPlan.selected.map((x) => ({ claimId: x.claim.id, advance: x.advance, expectedCollection: x.expectedCollection, expectedContribution: x.expectedContribution, why: "Picked by the plain rules.", trimmed: false }));
      source = "rules";
      s.logAuto("DECIDE", "The AI could not be reached, so the plain rules made the list instead.");
    }
    await sleep(400);
    setStage(3);
    const boughtClaims: typeof s.claims = [];
    for (const pick of accepted) {
      const claim = s.claims.find((c) => c.id === pick.claimId);
      if (!claim) continue;
      const result = s.acceptOffer(claim, pick.advance);
      if (result.ok) {
        boughtClaims.push(claim);
        s.logAuto("BUY", `Bought ${pick.claimId} from ${claim.clinic} for ${money(pick.advance)}${pick.trimmed ? " (the AI named a higher price, so it was trimmed to the most we should pay)" : ""}. ${pick.why} On average we expect ${money(pick.expectedCollection)} back.`);
      } else {
        s.logAuto("BUY", `Could not buy ${pick.claimId}: ${result.message}`);
      }
    }
    if (accepted.length === 0) s.logAuto("BUY", "Nothing was approved to buy, so no money was spent.");
    else s.logAuto("MONEY", `Spent ${money(accepted.reduce((a2, x) => a2 + x.advance, 0))} on up to ${accepted.length} claims in this run.`);
    await sleep(400);
    setStage(4);
    const alreadyWaiting = s.claims.filter((c) => s.purchases.some((p) => p.claimId === c.id && p.status === "ACTIVE") && !s.runs[c.id] && !boughtClaims.some((b) => b.id === c.id));
    const toChase = [...boughtClaims, ...alreadyWaiting];
    let paidOut = 0; let paidCount = 0; let stopped = 0; let people = 0; let aiLetters = 0;
    for (const claim of toChase) {
      if (aiLetters < AI_LETTER_CAP) {
        try {
          const res = await fetch("/api/agent/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ claimId: claim.id }) });
          const data = await res.json();
          if (data.source === "ai") { aiLetters++; s.logAuto("CHASE", `${claim.id}: the AI wrote the letter to ${claim.insurer}. ${data.note}`); }
        } catch { /* the chase still goes ahead with the plain letter */ }
      }
      const preview = runToCompletion(claim);
      s.runFull(claim);
      if (preview.realized > 0) { paidCount++; paidOut += preview.realized; }
      if (preview.status === "TERMINATED") stopped++;
      if (preview.status === "NEEDS_HUMAN" || preview.status === "ESCALATED" || preview.status === "NEEDS_EVIDENCE") people++;
      s.logAuto("CHASE", `${claim.id}: ${agentStatusLabel(preview.status)}. ${preview.terminalReason ?? ""} The chase cost ${money(preview.spent)}${preview.realized > 0 ? ` and the insurer agreed to pay ${money(preview.realized)}` : ""}.`);
      await sleep(240);
    }
    if (toChase.length === 0) s.logAuto("CHASE", "There was nothing waiting to be chased.");
    setStage(5);
    const doneText = `Finished. The ${source === "ai" ? "AI" : "plain rules"} chose the claims, ${boughtClaims.length} were bought, ${toChase.length} were chased, and insurers agreed to pay ${money(paidOut)} across ${paidCount} of them. ${stopped} chases stopped on their own, and ${people} were handed to a person or are waiting for a paper.`;
    s.logAuto("NOTE", doneText);
    setSummary(doneText);
    await sleep(350);
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
      <Panel title="Let the AI do the whole job" sub="One press and the AI reads every claim, decides what to buy and at what price, buys it, and chases it. A hard safety check sits between the AI and your money, and every move lands in the log." className="h-full">
        <div className="flex flex-wrap items-center gap-3">
          <button className={btnPrimary} disabled={busy} onClick={runAll}>{busy ? <><Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" />Working...</> : <><Play className="mr-1.5 inline h-4 w-4" />Run the auto helper</>}</button>
          <button className={btnGhost} disabled={busy} onClick={() => s.setSubtab("log")}>Read the log</button>
          <span className="flex items-center gap-1.5 text-sm text-slate-500"><Bot className="h-4 w-4 text-teal-700" />Decisions by the AI. Spending always checked first.</span>
        </div>
        {summary && <p className="mt-4 rounded-lg bg-teal-50 px-3.5 py-3 text-sm leading-relaxed text-teal-900" role="status">{summary}</p>}
        <dl className="mt-5 grid grid-cols-2 gap-3 text-center md:grid-cols-4">
          <div className="rounded-xl bg-slate-50 py-3"><dt className="text-[11px] text-slate-500">Rules would buy right now</dt><dd className="num mt-1 text-lg font-semibold text-slate-900">{rulesPlan.selected.length}</dd></div>
          <div className="rounded-xl bg-slate-50 py-3"><dt className="text-[11px] text-slate-500">Rules would spend</dt><dd className="num mt-1 text-lg font-semibold text-slate-900">{money(rulesPlan.totalAdvance)}</dd></div>
          <div className="rounded-xl bg-slate-50 py-3"><dt className="text-[11px] text-slate-500">Money left to spend</dt><dd className="num mt-1 text-lg font-semibold text-teal-800">{money(s.reconciliation.remainingCapacity)}</dd></div>
          <div className="rounded-xl bg-slate-50 py-3"><dt className="text-[11px] text-slate-500">Claims already owned</dt><dd className="num mt-1 text-lg font-semibold text-slate-900">{s.purchases.length}</dd></div>
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-slate-500">The AI can only pick from the claims in front of it, and each pick is checked before money moves: papers ready, no papers disagreeing, time still left, gain at least your least, price no more than the most we should pay, and money actually there. A pick that fails any of that is thrown out and logged.</p>
      </Panel>

      <Panel title="What it is doing" sub="Each step lights up as it happens." className="h-full">
        <ol className="space-y-3">
          {STAGES.map((label, i) => {
            const done = stage > i || (stage === -1 && summary !== "");
            const active = stage === i;
            return (
              <li key={label} className="flex items-center gap-3 text-sm">
                {active ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-teal-700" /> : done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <Circle className="h-5 w-5 shrink-0 text-slate-300" />}
                <span className={active ? "font-medium text-slate-900" : done ? "text-slate-700" : "text-slate-400"}>{label}</span>
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
