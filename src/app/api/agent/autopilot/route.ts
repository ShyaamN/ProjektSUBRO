import { letterFacts, validatePicks } from "@/lib/ai";
import { allocatePortfolio } from "@/lib/capital";
import { AS_OF } from "@/lib/seed";
import type { CapitalConfig, Claim } from "@/lib/types";

/**
 * The AI runs the auto helper from here.
 * It reads every claim, picks what to buy and names a price for each.
 * Nothing it says is acted on until validatePicks has checked it line by line.
 * If the AI cannot be reached, the plain rules answer instead and the reply says so.
 */
export async function POST(req: Request) {
  let body: { claims?: Claim[]; config?: CapitalConfig; purchasedIds?: string[] } = {};
  try { body = await req.json(); } catch { /* handled below */ }
  const claims = body.claims ?? [];
  const config = body.config;
  if (!Array.isArray(claims) || claims.length === 0 || !config) return Response.json({ error: "Claims and rules are needed" }, { status: 400 });
  const purchasedIds = new Set(body.purchasedIds ?? []);

  const rulesPlan = allocatePortfolio(claims, config, purchasedIds, {}, 0);
  const fallback = {
    source: "rules" as const,
    accepted: rulesPlan.selected.map((x) => ({ claimId: x.claim.id, advance: x.advance, expectedCollection: x.expectedCollection, expectedContribution: x.expectedContribution, why: "Picked by the plain rules: best gain for each dollar spent.", trimmed: false })),
    rejected: [] as { claimId: string; reason: string }[],
    note: "The plain rules made this list.",
  };

  const key = process.env.LLM_API_KEY;
  if (!key) return Response.json({ ...fallback, note: "No AI key is set on the server, so the plain rules made this list. Nothing was spent." });

  const rows = claims.map((c) => {
    const f = letterFacts(c);
    const daysLeft = Math.round((new Date(`${c.deadline}T00:00:00Z`).getTime() - new Date(`${AS_OF}T00:00:00Z`).getTime()) / 86400000);
    const reqPaper = c.evidence.find((e) => e.id === c.requiredEvidenceId);
    return `${c.id} | insurer ${c.insurer} | may owe $${f.insurerMayOwe} | chance ${Math.round(c.recoveryProbability * 100)} of 100 | chase cost $${c.estimatedCost} | why denied: ${c.denialReason} | main paper: ${reqPaper?.status ?? "missing"} | papers disagree: ${c.evidence.some((e) => e.status === "CONTRADICTORY")} | approval: ${c.authorizationStatus} | days left to act: ${daysLeft}`;
  }).join("\n");

  const base = (process.env.LLM_BASE_URL ?? "https://api.meta.ai/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL ?? "muse-spark-1.3";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 6000,
        messages: [
          { role: "system", content: "You are the buying brain of a small firm that buys denied health insurance claims and chases the insurer for the money. You pick claims to buy. Hard facts: the amount that matters is what the insurer may owe, never the first bill. A claim is only buyable if its main paper is AVAILABLE, no papers disagree, approval is given or not needed, days left to act is above zero, and the expected gain is at least the least gain in the rules. Expected gain is: may owe times chance, minus what we pay, minus chase cost. Never pick a claim that fails any of that. Reply with JSON only, no other text." },
          { role: "user", content: `Rules: money to spend in total $${config.availableCapital}. Least gain per claim $${config.minContribution}. At most ${Math.round(config.maxInsurerConcentration * 100)} of every 100 dollars may sit with one insurer. Care level ${config.riskTolerance}.\n\nClaims, one per line:\n${rows}\n\nPick at most 14 claims. Keep your thinking brief. For each pick, name the price we should pay the clinic. The price must leave at least the least gain. Answer in exactly this shape, one pick per line, nothing else:\nPICK | claim id | price in dollars | one short plain reason\nNOTE | one short plain sentence about the whole list` },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return Response.json({ ...fallback, note: `The AI service said no (HTTP ${res.status}), so the plain rules made this list instead.` });
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const text: string = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map((p: { text?: string }) => p?.text ?? "").join("") : "";
    const picks: { id: string; pay: number; why: string }[] = [];
    let aiNote = "The AI made this list.";
    for (const line of text.split("\n")) {
      if (/^\W*note\b/i.test(line)) { const t = line.replace(/^\W*note\b[:|]?/i, "").trim(); if (t) aiNote = t; continue; }
      const m = line.match(/(CASE-\d+|CLM-\d+)/);
      if (!m) continue;
      const after = line.slice((m.index ?? 0) + m[1].length);
      const amount = after.match(/\$\s?([\d,]+(?:\.\d+)?)/) ?? after.match(/\b([\d,]{2,}(?:\.\d+)?)\b/);
      if (!amount) continue;
      const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
      picks.push({ id: m[1], pay: Number(amount[1].replace(/,/g, "")), why: parts.length > 1 ? parts[parts.length - 1].slice(0, 220) : "Picked by the AI." });
    }
    if (picks.length === 0) return Response.json({ ...fallback, note: "The AI reply could not be read, so the plain rules made this list instead." });
    const checked = validatePicks(picks, claims, config, purchasedIds);
    if (checked.accepted.length === 0) return Response.json({ ...fallback, rejected: checked.rejected, note: "Every AI pick failed the safety checks, so the plain rules made this list instead." });
    return Response.json({ source: "ai", model, accepted: checked.accepted, rejected: checked.rejected, note: aiNote.slice(0, 300) });
  } catch {
    return Response.json({ ...fallback, note: "The AI service could not be reached, so the plain rules made this list instead. Nothing extra was spent." });
  }
}
