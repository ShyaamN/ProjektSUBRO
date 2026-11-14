import type { ReactNode } from "react";

export function Panel({ title, sub, right, children, className = "" }: { title?: string; sub?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-md border border-[#242c35] bg-[#11151a] ${className}`} aria-label={title}>
      {(title || right) && (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-[#20262e] px-3.5 py-2.5">
          <div>{title && <h2 className="text-[11px] font-semibold tracking-[0.14em] text-zinc-400 uppercase">{title}</h2>}{sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}</div>
          {right}
        </header>
      )}
      <div className="p-3.5">{children}</div>
    </section>
  );
}

export function Kpi({ label, value, hint, tone = "text-zinc-100" }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="border-l-2 border-[#243038] bg-[#10141a] px-3 py-2.5">
      <div className="text-[10px] font-medium tracking-[0.13em] text-zinc-500 uppercase">{label}</div>
      <div className={`num mt-1 text-left text-[19px] leading-none font-semibold tracking-tight ${tone}`}>{value}</div>
      {hint && <div className="mt-1.5 text-[11px] leading-snug text-zinc-500">{hint}</div>}
    </div>
  );
}

const tones: Record<string, string> = {
  teal: "border-teal-800/70 bg-teal-950/50 text-teal-300",
  green: "border-emerald-800/70 bg-emerald-950/40 text-emerald-300",
  amber: "border-amber-800/70 bg-amber-950/40 text-amber-300",
  red: "border-red-900/70 bg-red-950/40 text-red-300",
  zinc: "border-zinc-700/70 bg-zinc-900 text-zinc-300",
  cyan: "border-cyan-900/70 bg-cyan-950/40 text-cyan-300",
};
export function Badge({ children, tone = "zinc" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

export function Bar({ value, max, tone = "bg-teal-500" }: { value: number; max: number; tone?: string }) {
  const w = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#232b34]" role="progressbar" aria-valuenow={Math.round(w)} aria-valuemin={0} aria-valuemax={100}><div className={`h-full ${tone}`} style={{ width: `${w}%` }} /></div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="border border-dashed border-[#2a333e] px-4 py-8 text-center text-sm text-zinc-500">{children}</div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[10px] font-medium tracking-[0.12em] text-zinc-500 uppercase">{label}</span>{children}</label>;
}
export const inputCls = "w-full rounded-sm border border-[#2b343f] bg-[#0d1116] px-2.5 py-1.5 text-[13px] text-zinc-200 placeholder:text-zinc-600";
export const btnPrimary = "rounded-sm bg-teal-600 px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40";
export const btnGhost = "rounded-sm border border-[#2b343f] bg-[#151a20] px-3 py-1.5 text-[13px] font-medium text-zinc-300 transition hover:border-[#3b4755] hover:text-white disabled:cursor-not-allowed disabled:opacity-40";
