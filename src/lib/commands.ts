import { z } from 'zod';
import { createSession } from './fixtures.ts';
import { changeClaim, chaos, escalate, portfolio, purchase, recoverPreflight, resetClaim, step } from './engine.ts';
import { assess, validateSettings } from './underwriting.ts';
import { geminiProposal, GeminiFailure } from './gemini.ts';
import type { Session } from './types.ts';

const cents = z.number().int().min(0).max(1000000000);
const ratio = z.number().min(0).max(1);
const id = z.string().regex(/^CASE-\d{4,8}$/);
const revision = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const settingsPatch = z.object({ capital: cents.optional(), minMargin: ratio.optional(), riskReserve: cents.max(10000000).optional(), apr: ratio.optional(), probabilityAdjustment: z.number().min(-.9).max(.9).optional(), insurerCap: ratio.optional(), maxSteps: z.number().int().min(1).max(8).optional(), maxSubmissions: z.number().int().min(1).max(3).optional(), agentBudget: cents.max(200).optional() }).strict().refine(x => Object.keys(x).length > 0);
const claimPatch = z.object({ collectible: cents.optional(), probability: ratio.optional(), offer: cents.optional() }).strict().refine(x => Object.keys(x).length > 0);
const schema = z.discriminatedUnion('command', [
  z.object({ command: z.literal('underwrite'), revision }).strict(),
  z.object({ command: z.literal('reset'), revision }).strict(),
  z.object({ command: z.literal('settings'), revision, patch: settingsPatch }).strict(),
  z.object({ command: z.literal('claim'), revision, claimId: id, patch: claimPatch }).strict(),
  ...(['purchase', 'step', 'resetClaim', 'escalate'] as const).map(command => z.object({ command: z.literal(command), revision, claimId: id }).strict()),
  z.object({ command: z.literal('chaos'), revision, claimId: id, kind: z.enum(['missing', 'inject', 'repeat', 'conflict', 'expired', 'negative', 'specialist', 'responsibility', 'finalDenial']) }).strict(),
]);
export type ParsedCommand = z.infer<typeof schema>;
export function parseCommand(input: unknown): ParsedCommand { return schema.parse(input); }
function audit(s: Session, action: string, reason: string, claimId = 'PORTFOLIO') { s.audit.push({ id: crypto.randomUUID(), time: new Date().toISOString(), action, reason, claimId }); }

export async function executeCommand(s: Session, command: ParsedCommand) {
  switch (command.command) {
    case 'reset': {
      const fresh = createSession();
      Object.assign(s, fresh, { id: s.id, createdAt: s.createdAt, revision: s.revision });
      audit(s, 'RESET', 'User explicitly reset all synthetic demo state.');
      return;
    }
    case 'underwrite':
      s.claims.forEach(c => assess(c, s.settings));
      s.underwritten = true;
      audit(s, 'UNDERWRITE', 'Deterministic synthetic assumptions assessed; offers remain unaccepted.');
      return;
    case 'settings': {
      const settings = { ...s.settings, ...command.patch };
      validateSettings(settings);
      const spent = portfolio(s);
      const reservedCosts = s.claims.filter(c => c.purchasePrice !== null && !c.recovery?.terminalReason).reduce((total, c) => {
        const charged = -s.ledger.filter(e => e.claimId === c.id && e.type === 'EXPENSE').reduce((sum, e) => sum + e.amount, 0);
        return total + Math.max(0, assess(c, settings).totalCosts - charged);
      }, 0);
      if (settings.capital < spent.deployed + spent.expenses - spent.collected + reservedCosts) throw new Error('Capital cannot be reduced below committed simulated cash and recovery expense reserves.');
      s.settings = settings;
      audit(s, 'SETTINGS', 'Updated bounded synthetic financial assumptions and agent limits.');
      return;
    }
    case 'claim': changeClaim(s, command.claimId, command.patch); return;
    case 'purchase': purchase(s, command.claimId); return;
    case 'chaos': chaos(s, command.claimId, command.kind); return;
    case 'resetClaim': resetClaim(s, command.claimId); return;
    case 'escalate': escalate(s, command.claimId); return;
    case 'step': {
      const claim = s.claims.find(c => c.id === command.claimId);
      if (!claim || !claim.recovery || claim.purchasePrice === null) throw new Error('Accept a simulated offer before starting recovery.');
      if (recoverPreflight(s, claim.id)) return;
      try {
        const proposal = await geminiProposal(claim);
        claim.recovery.mode = proposal ? 'gemini' : 'rules';
        step(s, claim.id, proposal?.requiresHuman && !['ESCALATE', 'REQUEST_EVIDENCE', 'STOP'].includes(proposal.action) ? { ...proposal, action: 'ESCALATE' } : proposal ?? undefined);
      } catch (error) {
        if (!(error instanceof GeminiFailure)) throw error;
        claim.recovery.mode = 'gemini';
        escalate(s, claim.id, error.message, `GEMINI_${error.kind}`);
        audit(s, 'MODEL_UNAVAILABLE', error.message, claim.id);
      }
      return;
    }
  }
}
