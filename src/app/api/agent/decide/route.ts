import { fallbackMove, type NegReply } from "@/lib/negotiate";
import { INITIAL_CLAIMS } from "@/lib/seed";

/**
 * The AI makes the call in the debate: take the offer, push back, stop, or hand to a person.
 * Its answer is one word checked against what is allowed. A move that makes no sense
 * (taking nothing, arguing past a final deadline) is replaced by the sound default.
 */
export async function POST(req: Request) {
  let body: { claimId?: string; reply?: NegReply; round?: number; advance?: number; spent?: number } = {};
  try { body = await req.json(); } catch { /* handled below */ }
  const claim = INITIAL_CLAIMS.find((c) => c.id === body.claimId);
  if (!claim || !body.reply) return Response.json({ error: "Claim and reply are needed" }, { status: 400 });
  const round = body.round ?? 1;
  const fallback = fallbackMove(claim, body.reply, round, body.advance ?? Math.round(claim.collectible * 0.6), body.spent ?? 0);
  const key = process.env.LLM_API_KEY;
  if (!key) return Response.json({ ...fallback, source: "rules" });

  const base = (process.env.LLM_BASE_URL ?? "https://api.meta.ai/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL ?? "muse-spark-1.3";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model, temperature: 0.2, max_tokens: 1200,
        messages: [
          { role: "system", content: "You are negotiating with a health insurer over one denied claim. You decide the next move. Taking a fair offer is good. Arguing with new facts is good. Arguing the same point forever is bad. Reply in one line only." },
          { role: "user", content: `Claim ${claim.id}. The insurer may owe $${claim.collectible}. We paid $${body.advance ?? Math.round(claim.collectible * 0.6)} for this claim and have spent $${body.spent ?? 0} chasing it. This is round ${round}. The insurer just said: ${body.reply.outcome} ${body.reply.amount ? `offering $${body.reply.amount}` : ""} ${body.reply.final ? "(final)" : ""} because: ${body.reply.reason}\n\nAnswer in exactly this shape: MOVE | one short plain reason\nMOVE is one of ACCEPT, COUNTER, STOP, ESCALATE.` },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return Response.json({ ...fallback, source: "rules" });
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const text: string = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map((p: { text?: string }) => p?.text ?? "").join("") : "";
    const m = text.match(/(ACCEPT|COUNTER|STOP|ESCALATE)/);
    if (!m) return Response.json({ ...fallback, source: "rules" });
    let move = m[1] as typeof fallback.move;
    // Guardrails the AI cannot cross.
    if (body.reply.amount === 0 && move === "ACCEPT") move = "COUNTER";
    if (body.reply.outcome === "APPROVED") move = "ACCEPT";
    if (round >= 3 && move === "COUNTER") move = "STOP";
    if (body.reply.final && body.reply.amount > 0 && move === "COUNTER" && round >= 2) move = "ACCEPT";
    const reason = text.split("|").slice(1).join("|").trim().slice(0, 220) || fallback.reason;
    return Response.json({ move, reason, source: "ai", model });
  } catch {
    return Response.json({ ...fallback, source: "rules" });
  }
}
