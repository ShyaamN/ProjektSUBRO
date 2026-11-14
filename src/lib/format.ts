export const money = (n: number, digits = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });
export const moneySigned = (n: number) => (n > 0 ? `+${money(n)}` : money(n));
export const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;
export const compact = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : Math.abs(n) >= 1_000 ? `$${(n / 1_000).toFixed(1)}k` : money(n);
export const dateFmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
export const timeFmt = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour12: false });
