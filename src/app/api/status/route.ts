export async function GET() {
  const llmConfigured = Boolean(process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
  return Response.json({
    status: "ok",
    llmConfigured,
    draftingMode: llmConfigured ? "server-side LLM drafting with deterministic validation" : "deterministic evidence-grounded drafting (degraded, fully operational)",
    insurerMode: "deterministic mock insurer (synthetic)",
    persistence: process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase-configured" : "browser-persisted synthetic sandbox (Supabase schema provided)",
  });
}
