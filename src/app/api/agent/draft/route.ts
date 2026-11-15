import { letterFacts, plainLetter, validateAiLetter } from "@/lib/ai";
import { INITIAL_CLAIMS } from "@/lib/seed";

/**
 * AI letter helper. Runs only when a person presses the button, so it spends nothing at rest.
 * The key stays on the server. If no key is set, the call fails, or the reply invents a figure,
 * the plain letter is returned instead and the note says so openly.
 */
export async function POST(req: Request) {
  let claimId = ""; let round = 1; let insurerReply = "";
  try { const b = await req.json(); claimId = b?.claimId ?? ""; round = Number(b?.round ?? 1); insurerReply = String(b?.insurerReply ?? ""); } catch { /* handled below */ }
  const claim = INITIAL_CLAIMS.find((c) => c.id === claimId);
  if (!claim) return Response.json({ error: "Unknown claim" }, { status: 400 });

  const fallback = round > 1
    ? `Dear ${claim.insurer}, thank you for your reply on claim ${claim.id}. We do not agree yet. You said: ${insurerReply} The papers still support the full amount: ${letterFacts(claim).papers.join(", ")}. We are still asking for $${claim.collectible.toLocaleString()}, the agreed price of $${claim.allowed.toLocaleString()} minus the $${claim.patientResponsibility.toLocaleString()} the patient owes. Please look again.`
    : plainLetter(claim);
  const key = process.env.LLM_API_KEY;
  if (!key) return Response.json({ text: fallback, source: "plain", note: "No AI key is set on the server, so the plain letter was used. Nothing was spent." });

  const base = (process.env.LLM_BASE_URL ?? "https://api.meta.ai/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL ?? "muse-spark-1.3";
  const facts = letterFacts(claim);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 1500,
        messages: [
          { role: "system", content: "You rewrite short letters to health insurers. Use only the facts given. Never invent facts, papers, dates, or dollar figures. Keep every dollar figure exactly as given. Plain, polite English. Under 120 words. Output the letter only." },
          { role: "user", content: `Facts: ${JSON.stringify(facts)}\n${round > 1 ? `This is round ${round} of a debate. The insurer just replied: ${insurerReply}\nWrite a firm, polite answer that answers their point using only the facts.\n` : ""}\nRewrite this letter using only those facts:\n${fallback}` },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return Response.json({ text: fallback, source: "plain", note: `The AI service said no (HTTP ${res.status}), so the plain letter was used. Check the key and model on the server.` });
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const text: string = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map((p: { text?: string }) => p?.text ?? "").join("") : "";
    const check = validateAiLetter(text, claim);
    if (!check.ok) return Response.json({ text: fallback, source: "plain", note: `${check.reason} The plain letter was used instead.` });
    return Response.json({ text: text.trim(), source: "ai", note: `Written by the AI helper (${model}) and checked. ${check.reason}` });
  } catch {
    return Response.json({ text: fallback, source: "plain", note: "The AI service could not be reached, so the plain letter was used. Nothing was spent." });
  }
}
