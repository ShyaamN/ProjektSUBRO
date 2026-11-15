"use client";
import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";

/** Small info button. The explanation shows while the mouse hovers, and hides when it leaves. */
export function InfoTip({ text, label = "More info" }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label={label} aria-expanded={open} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-slate-300 text-slate-400 transition hover:border-teal-600 hover:text-teal-700">
        <Info className="h-3 w-3" />
      </button>
      {open && (
        <span role="note" className="pointer-events-none absolute top-6 left-0 z-40 block w-64 rounded-lg border border-slate-200 bg-white p-3 text-[12.5px] leading-relaxed font-normal text-slate-600 shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

export function Panel({ title, sub, right, children, className = "" }: { title?: string; sub?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,42,51,0.05)] ${className}`} aria-label={title}>
      {(title || right) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-1">
          <div className="flex items-center gap-1.5">{title && <h2 className="text-[15px] font-semibold text-slate-800">{title}</h2>}{sub && <InfoTip text={sub} label={`More about ${title ?? "this"}`} />}</div>
          {right}
        </header>
      )}
      <div className="flex min-h-0 flex-1 flex-col px-5 py-4">{children}</div>
    </section>
  );
}

export function Kpi({ label, value, hint, tone = "text-slate-900" }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,42,51,0.05)]">
      <div className="flex items-center gap-1.5 text-[13px] text-slate-500">{label}{hint && <InfoTip text={hint} label={`More about ${label}`} />}</div>
      <div className={`mt-1.5 text-[26px] leading-none font-semibold tracking-tight ${tone}`}>{value}</div>
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
  return <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-slate-700">{label}{help && <InfoTip text={help} label={`More about ${label}`} />}</span>{children}</label>;
}
export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Previous page" disabled={page <= 0} onClick={() => onPage(page - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:border-teal-600 hover:text-teal-700 disabled:opacity-35"><ChevronLeft className="h-4 w-4" /></button>
      <span className="text-[13px] whitespace-nowrap text-slate-500">Page {page + 1} of {pages}</span>
      <button type="button" aria-label="Next page" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:border-teal-600 hover:text-teal-700 disabled:opacity-35"><ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}

export const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400";
export const btnPrimary = "rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40";
export const btnGhost = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40";
