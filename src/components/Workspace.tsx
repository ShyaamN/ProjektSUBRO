"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Check, Loader2, Search, X } from "lucide-react";
import { Badge, InfoTip, Pager, btnGhost, btnPrimary, inputCls, useFitRows } from "./ui";
import { allocatePortfolio } from "@/lib/capital";
import { portfolioAnalytics, underwrite } from "@/lib/finance";
import { dateFmt, money, pct } from "@/lib/format";
import { decisionLabel } from "@/lib/labels";
import { fallbackMove, insurerRound, STAGE_WORDS, type NegStage } from "@/lib/negotiate";
import { useSubro } from "@/lib/store";
import type { Claim } from "@/lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TERMINAL: NegStage[] = ["PAID_FULL", "PAID_PART", "STOPPED", "WAITING_PAPER", "NEEDS_YOU"];
const KIND_TONE = { SCAN: "zinc", DECIDE: "teal", BUY: "cyan", CHASE: "amber", MONEY: "green", NOTE: "zinc" } as const;
const KIND_WORD = { SCAN: "Looked", DECIDE: "Decided", BUY: "Bought", CHASE: "Working", MONEY: "Money", NOTE: "Note" } as const;

function stageTone(stage: NegStage | "READY" | "LOOK" | "SKIP") {
  if (stage === "PAID_FULL" || stage === "PAID_PART") return "green";
  if (stage === "NEEDS_YOU" || stage === "WAITING_PAPER" || stage === "LOOK") return "amber";
  if (stage === "STOPPED" || stage === "SKIP") return "red";
  if (stage === "READY") return "teal";
  return "cyan";
}

function ClaimTab({ claim }: { claim: Claim }) {
  const s = useSubro();
  const uw = underwrite(claim, { minContribution: s.config.minContribution });
  const neg = s.negs[claim.id];
  const purchased = s.purchases.find((p) => p.claimId === claim.id);
  const stage = neg ? STAGE_WORDS[neg.stage] : purchased ? STAGE_WORDS.QUEUED : decisionLabel(uw.decision);
  const entries = s.autoLog.filter((e) => e.text.includes(claim.id));
  const steps = ["Approved", "Papers checked", "Filed", "Talking with insurer", "Settled"];
  const rank: Record<string, number> = { QUEUED: 0, CHECKING: 1, FILING: 2, TALKING: 3, WAITING_PAPER: 3, NEEDS_YOU: 3, PAID_FULL: 4, PAID_PART: 4, STOPPED: 4 };
  const now = neg ? (rank[neg.stage] ?? 0) : purchased ? 0 : -1;

  return (
    <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="flex min-h-0 min-w-0 flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,42,51,0.05)]" aria-label={`Claim ${claim.id}`}>
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-semibold text-slate-900">{claim.clinic}</h2>
            <p className="mono mt-0.5 text-[12px] text-slate-400">{claim.id} · {claim.insurer}</p>
          </div>
          <Badge tone={neg ? stageTone(neg.stage) : purchased ? "cyan" : stageTone(uw.decision === "BUY CANDIDATE" ? "READY" : uw.decision === "NEEDS REVIEW" ? "LOOK" : "SKIP")}>{stage}</Badge>
        </div>
        <dl className="mt-4 grid shrink-0 grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
          {[["Care took place", dateFmt(claim.serviceDate)], ["Claim was sent", dateFmt(claim.submissionDate)], ["Insurer said no", dateFmt(claim.denialDate)], ["Last day to act", dateFmt(claim.deadline)], ["First bill amount", money(claim.billed)], ["Agreed price", money(claim.allowed)]].map(([k, v]) => (
            <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="mt-0.5 text-slate-800">{v}</dd></div>
          ))}
        </dl>
        <p className="mt-4 shrink-0 rounded-lg bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-amber-900">Why the insurer said no: {claim.denialReason}</p>
        <div className="mt-5 grid shrink-0 gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">The maths</h3>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Insurer may owe</dt><dd className="num font-semibold text-slate-900">{money(claim.collectible)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Chance we get paid</dt><dd className="num text-slate-700">{pct(claim.recoveryProbability, 0)} of 100</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">On average we expect back</dt><dd className="num text-slate-700">{money(uw.expectedCollection)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">We pay the clinic</dt><dd className="num text-slate-700">{money(uw.advance)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Chasing may cost</dt><dd className="num text-slate-700">{money(claim.estimatedCost)}</dd></div>
              <div className={`flex justify-between border-t border-slate-100 pt-1.5 font-medium ${uw.expectedContribution >= 0 ? "text-emerald-700" : "text-red-600"}`}><dt>{uw.expectedContribution >= 0 ? "On average we gain" : "On average we lose"}</dt><dd className="num">{money(Math.abs(uw.expectedContribution))}</dd></div>
              {neg && TERMINAL.includes(neg.stage) && <div className="flex justify-between border-t border-slate-100 pt-1.5"><dt className="text-slate-500">Insurer actually paid</dt><dd className="num font-semibold text-slate-900">{money(neg.realized)}</dd></div>}
            </dl>
            {!purchased && uw.decision === "BUY CANDIDATE" && <p className="mt-3 text-[13px] text-slate-400">Approve it from the All claims list and the agent starts at once.</p>}
            {!purchased && uw.decision !== "BUY CANDIDATE" && <p className="mt-3 text-[13px] leading-relaxed text-slate-500">{uw.reasons[0]}</p>}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Papers we have</h3>
            <ul className="mt-2 space-y-2">
              {claim.evidence.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-slate-700">{e.type}<span className="block text-xs text-slate-400">From {e.provenance.toLowerCase()}{e.note ? `. ${e.note}` : ""}</span></span>
                  <Badge tone={e.status === "AVAILABLE" ? "green" : e.status === "MISSING" ? "red" : "amber"}>{e.status === "AVAILABLE" ? "Got it" : e.status === "MISSING" ? "Missing" : "Papers disagree"}</Badge>
                </li>
              ))}
            </ul>
            <h3 className="mt-5 text-sm font-semibold text-slate-800">Where it stands</h3>
            <ol className="mt-2 space-y-2">
              {steps.map((label, i) => {
                const st = i < now ? "done" : i === now ? "now" : "todo";
                return <li key={label} className="flex items-center gap-2.5 text-sm"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${st === "done" ? "bg-teal-700 text-white" : st === "now" ? "bg-teal-100 text-teal-800 ring-2 ring-teal-600" : "bg-slate-100 text-slate-400"}`}>{st === "done" ? <Check className="h-3.5 w-3.5" /> : <span className="text-[10px] font-semibold">{i + 1}</span>}</span><span className={st === "now" ? "font-medium text-slate-900" : st === "done" ? "text-slate-700" : "text-slate-400"}>{label}</span></li>;
              })}
            </ol>
          </div>
        </div>
      </section>

      <section className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,42,51,0.05)]" aria-label={`Log for ${claim.id}`}>
        <header className="shrink-0 px-5 pt-4 pb-2"><h3 className="text-[15px] font-semibold text-slate-800">Log for this claim</h3><p className="mt-0.5 text-[12px] text-slate-400">{entries.length} entries</p></header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          {entries.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">Nothing has happened to this claim yet.</p> : (
            <ol>{entries.map((e) => (
              <li key={e.id} className="flex gap-2.5 border-b border-slate-100 py-2.5 last:border-0">
                <span className="mono w-[62px] shrink-0 pt-0.5 text-[11px] text-slate-400">{new Date(e.ts).toLocaleTimeString("en-US", { hour12: false })}</span>
                <Badge tone={KIND_TONE[e.kind]}>{KIND_WORD[e.kind]}</Badge>
                <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-slate-600">{e.text}</p>
              </li>
            ))}</ol>
          )}
        </div>
      </section>
    </div>
  );
}

export function Workspace() {
  const s = useSubro();
  const { ref: tableRef, rows: perPage } = useFitRows<HTMLDivElement>(56, 40, 4, 14);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const busyRef = useRef(false);
  const [workingId, setWorkingId] = useState("");

  const stats = useMemo(() => portfolioAnalytics(s.claims, s.config.minContribution), [s.claims, s.config.minContribution]);
  const plan = useMemo(() => {
    const ids = new Set(s.purchases.map((p) => p.claimId));
    const byInsurer: Record<string, number> = {};
    s.purchases.forEach((p) => { const ins = s.claims.find((c) => c.id === p.claimId)?.insurer ?? ""; byInsurer[ins] = (byInsurer[ins] ?? 0) + p.advance; });
    return allocatePortfolio(s.claims, s.config, ids, byInsurer, s.config.availableCapital - s.reconciliation.available);
  }, [s.claims, s.config, s.purchases, s.reconciliation]);

  const rows = useMemo(() => s.claims.map((c) => ({ c, uw: underwrite(c, { minContribution: s.config.minContribution }) }))
    .filter(({ c }) => !q || `${c.id} ${c.clinic} ${c.insurer}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.c.collectible - a.c.collectible), [s.claims, q, s.config.minContribution]);
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const safePage = Math.min(page, pages - 1);
  const pageRows = rows.slice(safePage * perPage, safePage * perPage + perPage);
  const selected = s.claims.find((c) => c.id === s.selectedId) ?? s.claims[0];

  const stageOf = (c: Claim): { key: NegStage | "READY" | "LOOK" | "SKIP"; word: string } => {
    const neg = s.negs[c.id];
    if (neg) return { key: neg.stage, word: STAGE_WORDS[neg.stage] };
    if (s.purchases.some((p) => p.claimId === c.id)) return { key: "QUEUED", word: STAGE_WORDS.QUEUED };
    const uw = underwrite(c, { minContribution: s.config.minContribution });
    if (uw.decision === "BUY CANDIDATE") return { key: "READY", word: "Ready to approve" };
    if (uw.decision === "NEEDS REVIEW") return { key: "LOOK", word: "Needs a look first" };
    return { key: "SKIP", word: "We skip this one" };
  };

  const approveOne = (claim: Claim) => {
    const r = s.acceptOffer(claim);
    s.logAuto(r.ok ? "BUY" : "NOTE", r.ok ? `You approved ${claim.id}. Bought from ${claim.clinic} for ${money(underwrite(claim, {}).advance)}. The AI agent takes it from here.` : `${claim.id} was not approved: ${r.message}`);
    if (r.ok) s.setNeg({ claimId: claim.id, stage: "QUEUED", rounds: 0, realized: 0, spent: 0, updatedAt: new Date().toISOString() });
  };

  const approveAll = () => {
    if (plan.selected.length === 0) return;
    s.acceptMany(plan.selected.map((x) => x.claim));
    for (const x of plan.selected) {
      s.setNeg({ claimId: x.claim.id, stage: "QUEUED", rounds: 0, realized: 0, spent: 0, updatedAt: new Date().toISOString() });
      s.logAuto("BUY", `You approved ${x.claim.id}. Bought from ${x.claim.clinic} for ${money(x.advance)}. The AI agent takes it from here.`);
    }
    s.logAuto("MONEY", `Approved ${plan.selected.length} claims for ${money(plan.totalAdvance)} in total. The AI agent will now file and argue each one in turn.`);
  };

  const workClaim = async (claim: Claim, advance: number) => {
    const log = (kind: "CHASE" | "MONEY" | "NOTE", text: string) => s.logAuto(kind, text);
    const setStage = (stage: NegStage, rounds: number, realized: number, spent: number) => s.setNeg({ claimId: claim.id, stage, rounds, realized, spent, updatedAt: new Date().toISOString() });
    let spent = 6;
    setStage("CHECKING", 0, 0, spent);
    log("CHASE", `${claim.id}: The agent picked this up and is checking the papers and the deadline.`);
    await sleep(600);
    const required = claim.evidence.find((e) => e.id === claim.requiredEvidenceId);
    if (claim.deadline < "2026-11-14") { setStage("STOPPED", 0, 0, spent); s.settleNegotiation(claim.id, 0, spent, "STOPPED"); log("NOTE", `${claim.id}: Stopped before filing. The last day to act was ${claim.deadline}, so there is nothing to file.`); return; }
    if (claim.evidence.some((e) => e.status === "CONTRADICTORY")) { setStage("NEEDS_YOU", 0, 0, spent); s.settleNegotiation(claim.id, 0, spent, "NEEDS_YOU"); log("NOTE", `${claim.id}: Handed to you. Two papers give different dates, and the agent will not pick the one that helps us most.`); return; }
    if (!required || required.status !== "AVAILABLE") { setStage("WAITING_PAPER", 0, 0, spent); s.settleNegotiation(claim.id, 0, spent, "WAITING_PAPER"); log("NOTE", `${claim.id}: Asked ${claim.clinic} for the missing paper (${claim.requiredEvidenceId}) and is waiting. The agent cannot make a paper up, so nothing has been filed.`); return; }

    setStage("FILING", 0, 0, spent);
    try {
      const res = await fetch("/api/agent/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ claimId: claim.id }) });
      const data = await res.json();
      log("CHASE", `${claim.id}: Filed with ${claim.insurer}. ${data.source === "ai" ? "The AI wrote the letter." : "Wrote the letter from the papers."} It asks for ${money(claim.collectible)} and points to ${required.type.toLowerCase()} as the proof.`);
    } catch { log("CHASE", `${claim.id}: Filed with ${claim.insurer} using the letter built from the papers.`); }
    spent += 8;
    await sleep(500);

    let realized = 0;
    let endStage: NegStage = "STOPPED";
    let lastReply = "";
    for (let round = 1; round <= 3; round++) {
      const reply = insurerRound(claim, round);
      spent += 9;
      lastReply = reply.reason;
      setStage("TALKING", round, realized, spent);
      if (reply.outcome === "APPROVED") { log("CHASE", `${claim.id}: The insurer agreed to pay the full ${money(reply.amount)}.`); realized = reply.amount; endStage = "PAID_FULL"; break; }
      if (reply.outcome === "OFFER") log("CHASE", `${claim.id}: The insurer offered ${money(reply.amount)}${reply.final ? " and says that is final" : ""}. They said: ${reply.reason}`);
      else if (reply.outcome === "EVIDENCE_REQUESTED") { log("CHASE", `${claim.id}: The insurer wants another paper first: ${reply.reason}`); endStage = "WAITING_PAPER"; break; }
      else if (reply.outcome === "ESCALATION_REQUIRED") { log("CHASE", `${claim.id}: The insurer wants a person involved: ${reply.reason}`); endStage = "NEEDS_YOU"; break; }
      else if (reply.outcome === "PROCEDURALLY_INVALID") { log("CHASE", `${claim.id}: The insurer would not even look at it: ${reply.reason}`); endStage = "STOPPED"; break; }
      else log("CHASE", `${claim.id}: The insurer said no. They said: ${reply.reason}`);

      let move = fallbackMove(claim, reply, round, advance, spent);
      let mover = "the agent";
      try {
        const res = await fetch("/api/agent/decide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ claimId: claim.id, reply, round, advance, spent }) });
        const data = await res.json();
        if (data.move) { move = { move: data.move, reason: data.reason }; mover = data.source === "ai" ? "The AI" : "The agent"; }
      } catch { /* default move stands */ }

      if (move.move === "ACCEPT") { realized = reply.amount; endStage = reply.amount >= claim.collectible ? "PAID_FULL" : "PAID_PART"; log("CHASE", `${claim.id}: ${mover} takes the offer of ${money(reply.amount)}. ${move.reason}`); break; }
      if (move.move === "STOP") { endStage = "STOPPED"; log("CHASE", `${claim.id}: ${mover} stops here. ${move.reason}`); break; }
      if (move.move === "ESCALATE") { endStage = "NEEDS_YOU"; log("CHASE", `${claim.id}: ${mover} hands this to you. ${move.reason}`); break; }
      spent += 6;
      log("CHASE", `${claim.id}: ${mover} pushes back. ${move.reason}`);
      if (round === 3) { endStage = "STOPPED"; break; }
      try {
        const res = await fetch("/api/agent/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ claimId: claim.id, round: round + 1, insurerReply: lastReply }) });
        const data = await res.json();
        log("CHASE", `${claim.id}: Sent a new letter answering their last point${data.source === "ai" ? ", written by the AI" : ""}. It still asks for ${money(claim.collectible)} and changes no fact.`);
      } catch { log("CHASE", `${claim.id}: Sent a new letter answering their last point.`); }
      await sleep(450);
    }
    setStage(endStage, 3, realized, spent);
    s.settleNegotiation(claim.id, realized, spent, endStage);
    log("MONEY", `${claim.id}: Finished as ${STAGE_WORDS[endStage].toLowerCase()}. The insurer paid ${money(realized)} and the filing and arguing cost ${money(spent)}.`);
  };

  // The agent works the line on its own: one claim at a time, start to finish.
  useEffect(() => {
    if (busyRef.current) return;
    const purchase = s.purchases.find((p) => p.status === "ACTIVE" && (!s.negs[p.claimId] || s.negs[p.claimId].stage === "QUEUED"));
    if (!purchase) return;
    const claim = s.claims.find((c) => c.id === purchase.claimId);
    if (!claim) return;
    busyRef.current = true;
    (async () => { setWorkingId(claim.id); await workClaim(claim, purchase.advance); busyRef.current = false; setWorkingId(""); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.purchases, s.negs]);

  const selStage = selected ? stageOf(selected) : null;
  const selUw = selected ? underwrite(selected, { minContribution: s.config.minContribution }) : null;
  const selNeg = selected ? s.negs[selected.id] : undefined;
  const selPurchased = selected ? s.purchases.find((p) => p.claimId === selected.id) : undefined;
  const stepState = (i: number) => {
    if (!selNeg) return selPurchased ? (i === 0 ? "done" : "todo") : "todo";
    const rank: Record<string, number> = { QUEUED: 0, CHECKING: 1, FILING: 2, TALKING: 3, WAITING_PAPER: 3, NEEDS_YOU: 3, PAID_FULL: 4, PAID_PART: 4, STOPPED: 4 };
    const r = rank[selNeg.stage] ?? 0;
    return i < r ? "done" : i === r ? "now" : "todo";
  };

  const tabClaim = s.activeTab !== "list" ? s.claims.find((c) => c.id === s.activeTab) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 items-end gap-1 overflow-hidden" role="tablist" aria-label="Open claims">
        <button role="tab" aria-selected={s.activeTab === "list"} onClick={() => s.setActiveTab("list")} className={`rounded-t-xl border px-4 py-2 text-[13px] whitespace-nowrap transition ${s.activeTab === "list" ? "border-slate-200 border-b-white bg-white font-semibold text-slate-900" : "border-transparent bg-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800"}`}>All claims</button>
        {s.tabs.map((id) => {
          const c = s.claims.find((x) => x.id === id);
          if (!c) return null;
          const active = s.activeTab === id;
          return (
            <span key={id} className={`flex max-w-[210px] items-center gap-1.5 rounded-t-xl border py-2 pr-1.5 pl-3.5 whitespace-nowrap transition ${active ? "border-slate-200 border-b-white bg-white" : "border-transparent hover:bg-white/70"}`}>
              <button role="tab" aria-selected={active} onClick={() => { s.setActiveTab(id); s.select(id); }} className={`min-w-0 truncate text-[13px] ${active ? "font-semibold text-slate-900" : "text-slate-500"}`}><span className="mono">{id}</span><span className="ml-1.5 hidden xl:inline">{c.clinic.split(" ").slice(0, 2).join(" ")}</span></button>
              <button aria-label={`Close ${id}`} onClick={() => s.closeClaimTab(id)} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-3 w-3" /></button>
            </span>
          );
        })}
      </div>

      {tabClaim ? <ClaimTab claim={tabClaim} /> : (<>
      <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-[0_1px_2px_rgba(16,42,51,0.05)]">
        <p className="text-sm whitespace-nowrap text-slate-500">Insurers may owe <span className="ml-1 text-[17px] font-semibold text-slate-900">{money(stats.collectible)}</span></p>
        <p className="text-sm whitespace-nowrap text-slate-500">We expect back <span className="ml-1 text-[17px] font-semibold text-slate-900">{money(stats.expectedCollection)}</span></p>
        <p className="text-sm whitespace-nowrap text-slate-500">Worth buying <span className="ml-1 text-[17px] font-semibold text-teal-800">{stats.buyCount} claims</span></p>
        <p className="text-sm whitespace-nowrap text-slate-500">Money free to spend <span className="ml-1 text-[17px] font-semibold text-teal-800">{money(s.reconciliation.available)}</span></p>
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {workingId && <span className="flex items-center gap-1.5 text-sm whitespace-nowrap text-teal-800"><Loader2 className="h-4 w-4 animate-spin" />Agent is working on {workingId}</span>}
          <button className={`${btnPrimary} whitespace-nowrap`} disabled={plan.selected.length === 0} onClick={approveAll}>Approve all worth buying ({plan.selected.length})</button>
        </span>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,42,51,0.05)]" aria-label="All claims">
          <header className="flex shrink-0 flex-wrap items-center gap-3 px-5 pt-4 pb-3">
            <h2 className="flex items-center gap-1.5 text-[15px] font-semibold text-slate-800">Claims <InfoTip text="Approve a claim and we buy it from the clinic. From that second the AI agent files it, argues with the insurer, and writes every step in the log on the right." label="How this page works" /></h2>
            <div className="relative ml-auto w-[240px]"><Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" /><input aria-label="Search claims" className={`${inputCls} pl-9`} placeholder="Search clinic, insurer, number" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></div>
            <Pager page={safePage} pages={pages} onPage={setPage} />
          </header>
          <div ref={tableRef} className="min-h-0 flex-1 overflow-hidden px-2">
            <table className="w-full table-fixed text-sm">
              <colgroup><col className="w-[12%]" /><col className="w-[21%]" /><col className="w-[13%]" /><col className="w-[9%]" /><col className="w-[15%]" /><col className="w-[16%]" /><col className="w-[14%]" /></colgroup>
              <thead className="text-left text-xs text-slate-500"><tr>{["Claim", "Clinic", "Insurer may owe", "Chance", "If it goes to plan", "Stage", ""].map((h, i) => <th key={i} className={`truncate px-3 py-2 font-medium whitespace-nowrap ${i >= 2 && i <= 4 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
              <tbody>{pageRows.map(({ c, uw }) => {
                const st = stageOf(c);
                const bought = s.purchases.some((p) => p.claimId === c.id);
                return (
                  <tr key={c.id} onClick={() => { s.select(c.id); s.openClaimTab(c.id); }} className={`cursor-pointer border-t border-slate-100 hover:bg-teal-50/60 ${c.id === s.selectedId ? "bg-teal-50" : ""}`}>
                    <td className="mono truncate px-3 py-2 text-[13px] font-medium text-teal-800">{c.id}</td>
                    <td className="px-3 py-2 text-slate-700"><span className="block truncate">{c.clinic}</span><span className="block truncate text-xs text-slate-400">{c.insurer}</span></td>
                    <td className="num px-3 py-2 font-medium text-slate-900">{money(c.collectible)}</td>
                    <td className="num px-3 py-2 text-slate-600">{pct(c.recoveryProbability, 0)}</td>
                    <td className={`num px-3 py-2 font-medium ${uw.expectedContribution >= 0 ? "text-emerald-700" : "text-red-600"}`}>{uw.expectedContribution >= 0 ? `Gain ${money(uw.expectedContribution)}` : `Loss ${money(Math.abs(uw.expectedContribution))}`}</td>
                    <td className="px-3 py-2"><Badge tone={stageTone(st.key)}>{st.word}</Badge></td>
                    <td className="px-3 py-2 text-right">{!bought && uw.decision === "BUY CANDIDATE" && <button className="rounded-lg bg-teal-700 px-3 py-1.5 text-[13px] font-medium text-white transition hover:bg-teal-800" onClick={(e) => { e.stopPropagation(); approveOne(c); }}>Approve</button>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
            {rows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Nothing matches that search.</p>}
          </div>
          <p className="shrink-0 px-5 py-2.5 text-[13px] text-slate-400">{rows.length} claims · the agent works through approved claims one at a time, top of the list first in the order they were approved</p>
        </section>

        <div className="flex min-h-0 flex-col gap-4">
          {selected && selUw && (
            <section className="min-h-0 shrink overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,42,51,0.05)]" aria-label="One claim">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="text-[15px] font-semibold text-slate-900">{selected.clinic}</h2><p className="mono mt-0.5 text-[12px] text-slate-400">{selected.id} · {selected.insurer} · said no {dateFmt(selected.denialDate)}</p></div>
                <Badge tone={selStage ? stageTone(selStage.key) : "zinc"}>{selStage?.word}</Badge>
              </div>
              <ol className="mt-4 grid grid-cols-5 gap-1">
                {["Approved", "Papers", "Filed", "Talking", "Settled"].map((label, i) => {
                  const st = stepState(i);
                  return <li key={label} className="flex flex-col items-center gap-1 text-center"><span className={`flex h-6 w-6 items-center justify-center rounded-full ${st === "done" ? "bg-teal-700 text-white" : st === "now" ? "bg-teal-100 text-teal-800 ring-2 ring-teal-600" : "bg-slate-100 text-slate-400"}`}>{st === "done" ? <Check className="h-3.5 w-3.5" /> : <span className="text-[10px] font-semibold">{i + 1}</span>}</span><span className={`text-[10px] leading-tight ${st === "now" ? "font-medium text-slate-800" : "text-slate-400"}`}>{label}</span></li>;
                })}
              </ol>
              <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Insurer may owe</dt><dd className="num font-semibold text-slate-900">{money(selected.collectible)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Chance we get paid</dt><dd className="num text-slate-700">{pct(selected.recoveryProbability, 0)} of 100</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">On average we expect back</dt><dd className="num text-slate-700">{money(selUw.expectedCollection)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">We pay the clinic</dt><dd className="num text-slate-700">{money(selUw.advance)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Chasing may cost</dt><dd className="num text-slate-700">{money(selected.estimatedCost)}</dd></div>
                <div className={`flex justify-between border-t border-slate-100 pt-1.5 font-medium ${selUw.expectedContribution >= 0 ? "text-emerald-700" : "text-red-600"}`}><dt>{selUw.expectedContribution >= 0 ? "So on average we gain" : "So on average we lose"}</dt><dd className="num">{money(Math.abs(selUw.expectedContribution))}</dd></div>
                {selNeg && TERMINAL.includes(selNeg.stage) && <div className="flex justify-between"><dt className="text-slate-500">Insurer actually paid</dt><dd className="num font-semibold text-slate-900">{money(selNeg.realized)}</dd></div>}
              </dl>
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] leading-relaxed text-amber-900">Why they said no: {selected.denialReason}</p>
              <div className="mt-3.5 flex flex-wrap gap-2">
                {!selPurchased && selUw.decision === "BUY CANDIDATE" && <button className={btnPrimary} onClick={() => approveOne(selected)}>Approve and hand to the agent</button>}
                {!selPurchased && selUw.decision !== "BUY CANDIDATE" && <span className="flex items-center gap-1.5 text-sm text-slate-500"><InfoTip text={selUw.reasons.join(" ")} label="Why this cannot be approved" />{decisionLabel(selUw.decision)}: {selUw.reasons[0]}</span>}
                {selPurchased && <span className="flex items-center gap-1.5 text-sm text-slate-600"><Bot className="h-4 w-4 text-teal-700" />{workingId === selected.id ? "The agent is on this one right now." : selNeg && TERMINAL.includes(selNeg.stage) ? "The agent has finished with this one." : "In the agent line."}</span>}
              </div>
            </section>
          )}

          <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,42,51,0.05)]" aria-label="Activity log">
            <header className="flex shrink-0 items-center gap-2 px-5 pt-4 pb-2">
              <h2 className="text-[15px] font-semibold text-slate-800">Activity log</h2>
              <span className="text-[12px] text-slate-400">{s.autoLog.length} entries</span>
              <button className={`${btnGhost} ml-auto !px-2.5 !py-1 !text-[12px]`} disabled={s.autoLog.length === 0} onClick={() => s.clearAutoLog()}>Clear</button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
              {s.autoLog.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">Nothing yet. Approve a claim and every step the agent takes will show up here.</p> : (
                <ol>{s.autoLog.map((e) => (
                  <li key={e.id} className="flex gap-2.5 border-b border-slate-100 py-2.5 last:border-0">
                    <span className="mono w-[62px] shrink-0 pt-0.5 text-[11px] text-slate-400">{new Date(e.ts).toLocaleTimeString("en-US", { hour12: false })}</span>
                    <Badge tone={KIND_TONE[e.kind]}>{KIND_WORD[e.kind]}</Badge>
                    <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-slate-600">{e.text}</p>
                  </li>
                ))}</ol>
              )}
            </div>
          </section>
        </div>
      </div>
      </>)}
    </div>
  );
}
