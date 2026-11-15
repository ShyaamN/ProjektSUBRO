"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createRun, stepAgent, type AgentRun } from "./agent";
import { actualContribution, applyTx, reconcile } from "./capital";
import { underwrite } from "./finance";
import { agentStatusLabel } from "./labels";
import type { NegState } from "./negotiate";
import { INITIAL_CLAIMS } from "./seed";
import type { AuditEvent, CapitalConfig, Claim, LedgerTx, Purchase } from "./types";

export type View = "trading" | "underwriting" | "capital" | "arena" | "autopilot" | "scenarios" | "ledger";
export interface AutoEntry { id: string; ts: string; kind: "SCAN" | "DECIDE" | "BUY" | "CHASE" | "MONEY" | "NOTE"; text: string; }
const DEFAULT_CONFIG: CapitalConfig = { availableCapital: 250000, minContribution: 25, maxInsurerConcentration: 0.35, riskTolerance: "BALANCED", eligibleCategories: "ALL" };
const KEY = "subro-state-v2";
let counter = 0;
const uid = () => `id-${++counter}-${Date.now().toString(36)}`;
const now = () => new Date().toISOString();

interface State { claims: Claim[]; config: CapitalConfig; purchases: Purchase[]; ledger: LedgerTx[]; audit: AuditEvent[]; runs: Record<string, AgentRun>; autoLog: AutoEntry[]; negs: Record<string, NegState>; }
const initial = (): State => ({ claims: INITIAL_CLAIMS, config: DEFAULT_CONFIG, purchases: [], ledger: [], audit: [{ id: "audit-init", ts: "2026-11-14T12:00:00.000Z", actor: "SYSTEM", action: "DEMO_STARTED", detail: "The demo is ready. Pick a claim to get started." }], runs: {}, autoLog: [], negs: {} });

interface Ctx extends State {
  view: View; setView: (v: View) => void; subtab: string; setSubtab: (s: string) => void; selectedId: string; select: (id: string) => void;
  setConfig: (c: CapitalConfig) => void; updateProbability: (id: string, p: number) => void;
  acceptOffer: (claim: Claim, advanceOverride?: number) => { ok: boolean; message: string };
  acceptMany: (claims: Claim[]) => { accepted: number; message: string };
  stepRun: (claim: Claim) => void; runFull: (claim: Claim) => void; resetRun: (id: string) => void;
  logAuto: (kind: AutoEntry["kind"], text: string) => void; clearAutoLog: () => void;
  setNeg: (n: NegState) => void; settleNegotiation: (claimId: string, realized: number, spent: number, endStage: string) => void;
  resetAll: () => void; reconciliation: ReturnType<typeof reconcile>; hydrated: boolean;
}
const C = createContext<Ctx | null>(null);

export function SubroProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [view, setViewState] = useState<View>("trading");
  const [subtab, setSubtab] = useState("glance");
  const setView = useCallback((v: View) => { setViewState(v); }, []);
  const [selectedId, select] = useState("CASE-1042");
  const [hydrated, setHydrated] = useState(false);
  const settledRef = useRef<Set<string>>(new Set());

  // Hydration from browser storage must happen after mount to keep server/client markup identical.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { try { const raw = localStorage.getItem(KEY); if (raw) { const p = JSON.parse(raw) as State; if (p.claims?.length >= 100) { setState({ ...initial(), ...p, autoLog: p.autoLog ?? [], negs: p.negs ?? {} }); Object.keys(p.runs ?? {}).forEach((k) => { if (p.runs[k].status !== "RUNNING") settledRef.current.add(k); }); } } } catch { /* corrupted storage falls back to seed */ } setHydrated(true); }, []);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } }, [state, hydrated]);

  const audit = useCallback((s: State, action: string, detail: string, actor = "OPERATOR"): State => ({ ...s, audit: [{ id: uid(), ts: now(), actor, action, detail }, ...s.audit].slice(0, 300) }), []);
  const setConfig = useCallback((config: CapitalConfig) => setState((s) => audit({ ...s, config }, "CAPITAL_CONFIG_UPDATED", `Money we can spend is now $${config.availableCapital.toLocaleString()}. The least gain per claim is $${config.minContribution}. At most ${Math.round(config.maxInsurerConcentration * 100)} out of every 100 dollars can sit with one insurer.`)), [audit]);
  const updateProbability = useCallback((id: string, p: number) => setState((s) => ({ ...s, claims: s.claims.map((c) => (c.id === id ? { ...c, recoveryProbability: p } : c)) })), []);

  const tryAccept = useCallback((s: State, claim: Claim, advanceOverride?: number): { s: State; ok: boolean; message: string } => {
    const uw = underwrite(claim, { minContribution: s.config.minContribution, advance: advanceOverride });
    if (s.purchases.some((p) => p.claimId === claim.id)) return { s, ok: false, message: "We already bought this claim, so it cannot be bought twice." };
    if (uw.decision !== "BUY CANDIDATE") return { s, ok: false, message: `Not bought. ${uw.reasons[0]}` };
    const deployed = s.purchases.reduce((a, p) => a + p.advance, 0);
    if (deployed + uw.advance > s.config.availableCapital) return { s, ok: false, message: "Not bought. There is not enough money left, so nothing was spent at all." };
    const insurerDeployed = s.purchases.filter((p) => s.claims.find((c) => c.id === p.claimId)?.insurer === claim.insurer).reduce((a, p) => a + p.advance, 0);
    if (insurerDeployed + uw.advance > s.config.availableCapital * s.config.maxInsurerConcentration) return { s, ok: false, message: `Not bought. Too much money would end up sitting with ${claim.insurer}.` };
    const key = `purchase-${claim.id}`;
    const purchase: Purchase = { claimId: claim.id, advance: uw.advance, expectedCollection: uw.expectedCollection, expectedContribution: uw.expectedContribution, ts: now(), idempotencyKey: key, status: "ACTIVE", realizedCollection: 0 };
    let ledger = applyTx(s.ledger, { id: uid(), idempotencyKey: `${key}-advance`, ts: now(), claimId: claim.id, type: "ADVANCE", amount: -uw.advance, memo: `We paid ${claim.clinic} for this claim.`, realized: false }).ledger;
    ledger = applyTx(ledger, { id: uid(), idempotencyKey: `${key}-reserve`, ts: now(), claimId: claim.id, type: "RESERVE", amount: 0, memo: `We set $${uw.riskReserve.toLocaleString()} aside as a safety cushion in case this one does not pay. No money moved for this row.`, realized: false }).ledger;
    const message = `Bought ${claim.id}. We paid the clinic $${uw.advance.toLocaleString()}.`;
    return { s: audit({ ...s, purchases: [...s.purchases, purchase], ledger }, "OFFER_ACCEPTED", message), ok: true, message };
  }, [audit]);

  const acceptOffer = useCallback((claim: Claim, advanceOverride?: number) => {
    let result = { ok: false, message: "Rejected" };
    setState((s) => { const r = tryAccept(s, claim, advanceOverride); result = { ok: r.ok, message: r.message }; return r.s; });
    return result;
  }, [tryAccept]);

  const acceptMany = useCallback((claims: Claim[]) => {
    let accepted = 0; const messages: string[] = [];
    setState((s) => { let cur = s; for (const c of claims) { const r = tryAccept(cur, c); cur = r.s; if (r.ok) accepted++; else messages.push(`${c.id}: ${r.message}`); } return cur; });
    return { accepted, message: messages.slice(0, 3).join(" · ") };
  }, [tryAccept]);

  const settleTerminal = useCallback((s: State, run: AgentRun): State => {
    if (run.status === "RUNNING" || settledRef.current.has(run.claimId)) return s;
    settledRef.current.add(run.claimId);
    let next = s;
    const purchase = s.purchases.find((p) => p.claimId === run.claimId);
    let ledger = applyTx(s.ledger, { id: uid(), idempotencyKey: `opex-${run.claimId}`, ts: now(), claimId: run.claimId, type: "RECOVERY_EXPENSE", amount: -run.spent, memo: `What the chase cost, across ${run.events.length} steps.`, realized: true }).ledger;
    if (purchase && run.realized > 0) {
      const realResult = actualContribution({ ...purchase, realizedCollection: run.realized }, run.spent); ledger = applyTx(ledger, { id: uid(), idempotencyKey: `realized-${run.claimId}`, ts: now(), claimId: run.claimId, type: "REALIZED_COLLECTION", amount: run.realized, memo: `After paying the clinic and paying the chase costs, we came out ${realResult >= 0 ? "$" + realResult.toLocaleString() + " ahead" : "$" + Math.abs(realResult).toLocaleString() + " behind"}.`, realized: true }).ledger;
    }
    const purchases = s.purchases.map((p) => p.claimId === run.claimId ? { ...p, realizedCollection: run.realized, status: (run.status === "RECOVERED" || run.status === "PARTIAL_RECOVERY" ? "SETTLED" : run.status === "ESCALATED" || run.status === "NEEDS_HUMAN" ? "ESCALATED" : "TERMINATED") as Purchase["status"] } : p);
    next = { ...next, ledger, purchases };
    return audit(next, `AGENT_${run.status}`, `Claim ${run.claimId}. ${run.terminalReason ?? agentStatusLabel(run.status)} The chase cost $${run.spent.toFixed(0)}, and the insurer agreed to pay $${run.realized.toLocaleString()}.`, "HELPER");
  }, [audit]);

  const stepRun = useCallback((claim: Claim) => setState((s) => { const run = s.runs[claim.id] ?? createRun(claim); const next = stepAgent(run, claim); return settleTerminal({ ...s, runs: { ...s.runs, [claim.id]: next } }, next); }), [settleTerminal]);
  const runFull = useCallback((claim: Claim) => setState((s) => { let run = s.runs[claim.id] ?? createRun(claim); let g = 0; while (run.status === "RUNNING" && g++ < 20) run = stepAgent(run, claim); return settleTerminal({ ...s, runs: { ...s.runs, [claim.id]: run } }, run); }), [settleTerminal]);
  const resetRun = useCallback((id: string) => { settledRef.current.delete(id); setState((s) => ({ ...s, runs: Object.fromEntries(Object.entries(s.runs).filter(([k]) => k !== id)) })); }, []);
  const logAuto = useCallback((kind: AutoEntry["kind"], text: string) => setState((s) => ({ ...s, autoLog: [{ id: uid(), ts: now(), kind, text }, ...s.autoLog].slice(0, 400) })), []);
  const clearAutoLog = useCallback(() => setState((s) => ({ ...s, autoLog: [] })), []);
  const setNeg = useCallback((n: NegState) => setState((s) => ({ ...s, negs: { ...s.negs, [n.claimId]: n } })), []);
  const settledNegRef = useRef<Set<string>>(new Set());
  const settleNegotiation = useCallback((claimId: string, realized: number, spent: number, endStage: string) => {
    if (settledNegRef.current.has(claimId)) return;
    settledNegRef.current.add(claimId);
    setState((s) => {
      const purchase = s.purchases.find((p) => p.claimId === claimId);
      let ledger = applyTx(s.ledger, { id: uid(), idempotencyKey: `neg-cost-${claimId}`, ts: now(), claimId, type: "RECOVERY_EXPENSE", amount: -spent, memo: "What the filing and arguing cost on this claim.", realized: true }).ledger;
      if (purchase && realized > 0) {
        const real = actualContribution({ ...purchase, realizedCollection: realized }, spent);
        ledger = applyTx(ledger, { id: uid(), idempotencyKey: `neg-paid-${claimId}`, ts: now(), claimId, type: "REALIZED_COLLECTION", amount: realized, memo: `The insurer paid after the debate. After paying the clinic and the chase costs, we came out ${real >= 0 ? "$" + real.toLocaleString() + " ahead" : "$" + Math.abs(real).toLocaleString() + " behind"}.`, realized: true }).ledger;
      }
      const purchases = s.purchases.map((p) => p.claimId === claimId ? { ...p, realizedCollection: realized, status: (realized > 0 ? "SETTLED" : endStage === "NEEDS_YOU" || endStage === "WAITING_PAPER" ? "ESCALATED" : "TERMINATED") as Purchase["status"] } : p);
      return audit({ ...s, ledger, purchases }, "NEGOTIATION_DONE", `Claim ${claimId} ended at ${endStage}. The insurer paid $${realized.toLocaleString()} and the work cost $${spent.toLocaleString()}.`, "AI AGENT");
    });
  }, [audit]);

  const resetAll = useCallback(() => { settledRef.current.clear(); try { localStorage.removeItem(KEY); } catch {} setState(initial()); select("CASE-1042"); setView("trading"); setSubtab("glance"); }, [setView]);

  const reconciliation = useMemo(() => reconcile(state.config.availableCapital, state.ledger, state.purchases), [state]);
  const value: Ctx = { ...state, view, setView, subtab, setSubtab, selectedId, select, setConfig, updateProbability, acceptOffer, acceptMany, stepRun, runFull, resetRun, resetAll, logAuto, clearAutoLog, setNeg, settleNegotiation, reconciliation, hydrated };
  return <C.Provider value={value}>{children}</C.Provider>;
}
export function useSubro() { const v = useContext(C); if (!v) throw new Error("useSubro outside provider"); return v; }
