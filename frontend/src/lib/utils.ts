import type { Status } from "../types";

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_STYLES: Record<Status, string> = {
  DRAFT: "bg-slate-200 text-slate-700",
  READY: "bg-amber-100 text-amber-800",
  APPLIED: "bg-blue-100 text-blue-800",
  INTERVIEW: "bg-violet-100 text-violet-800",
  REJECTED: "bg-rose-100 text-rose-800",
  OFFER: "bg-emerald-100 text-emerald-800",
  WITHDRAWN: "bg-zinc-200 text-zinc-700",
};

export function statusClass(s: Status | string): string {
  return STATUS_STYLES[s as Status] ?? "bg-slate-100 text-slate-700";
}

export function fitColor(score: number | null | undefined): string {
  if (score == null) return "text-slate-400";
  if (score >= 0.75) return "text-emerald-600";
  if (score >= 0.5) return "text-amber-600";
  return "text-rose-600";
}
