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
  DRAFT: "bg-slate-200 text-slate-800 border-slate-300",
  READY: "bg-amber-100 text-amber-900 border-amber-300",
  APPLIED: "bg-sky-100 text-sky-900 border-sky-300",
  INTERVIEW: "bg-violet-100 text-violet-900 border-violet-300",
  REJECTED: "bg-rose-100 text-rose-900 border-rose-300",
  OFFER: "bg-emerald-100 text-emerald-900 border-emerald-400",
  WITHDRAWN: "bg-zinc-200 text-zinc-700 border-zinc-300",
};

export function statusClass(s: Status | string): string {
  return STATUS_STYLES[s as Status] ?? "bg-slate-100 text-slate-700 border-slate-300";
}

export function fitColor(score: number | null | undefined): string {
  if (score == null) return "text-slate-400";
  if (score >= 0.75) return "text-emerald-600";
  if (score >= 0.5) return "text-amber-600";
  return "text-rose-600";
}

export function fitBgColor(score: number | null | undefined): string {
  if (score == null) return "bg-slate-100 text-slate-500";
  if (score >= 0.75) return "bg-emerald-100 text-emerald-800 border border-emerald-300";
  if (score >= 0.5) return "bg-amber-100 text-amber-800 border border-amber-300";
  return "bg-rose-100 text-rose-800 border border-rose-300";
}
