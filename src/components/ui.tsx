import type { ReactNode } from "react";

export function Panel({ title, sub, right, children, className = "" }: { title?: string; sub?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,42,51,0.05)] ${className}`} aria-label={title}>
      {(title || right) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-1">
          <div>{title && <h2 className="text-[15px] font-semibold text-slate-800">{title}</h2>}{sub && <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-slate-500">{sub}</p>}</div>
          {right}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function Kpi({ label, value, hint, tone = "text-slate-900" }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,42,51,0.05)]">
      <div className="text-[13px] text-slate-500">{label}</div>
      <div className={`mt-1.5 text-[26px] leading-none font-semibold tracking-tight ${tone}`}>{value}</div>
      {hint && <div className="mt-2 text-[12.5px] leading-relaxed text-slate-500">{hint}</div>}
    </div>
  );
}

const tones: Record<string, string> = {
  teal: "border-teal-200 bg-teal-50 text-teal-800",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-700",
  zinc: "border-slate-200 bg-slate-50 text-slate-600",
  cyan: "border-sky-200 bg-sky-50 text-sky-800",
};
export function Badge({ children, tone = "zinc" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

export function Bar({ value, max, tone = "bg-teal-600" }: { value: number; max: number; tone?: string }) {
  const w = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(w)} aria-valuemin={0} aria-valuemax={100}><div className={`h-full rounded-full ${tone}`} style={{ width: `${w}%` }} /></div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">{children}</div>;
}

export function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[13px] font-medium text-slate-700">{label}</span>{children}{help && <span className="mt-1.5 block text-[12px] leading-relaxed text-slate-500">{help}</span>}</label>;
}
export const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400";
export const btnPrimary = "rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40";
export const btnGhost = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40";
