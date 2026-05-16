import { useQuery } from "@tanstack/react-query";

import { getStats } from "../lib/api";

function Card({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-semibold text-slate-900 mt-1">{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

export default function StatsCards() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
  });

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading stats…</div>;
  }
  if (error || !data) {
    return (
      <div className="text-sm text-rose-600">
        Couldn't load stats: {(error as Error)?.message ?? "unknown error"}
      </div>
    );
  }

  const total = data.total;
  const applied = data.by_status["APPLIED"] ?? 0;
  const interviews = data.by_status["INTERVIEW"] ?? 0;
  const offers = data.by_status["OFFER"] ?? 0;
  const rejected = data.by_status["REJECTED"] ?? 0;

  const thisWeekKey = (() => {
    const now = new Date();
    const day = now.getDay() || 7;
    if (day !== 1) now.setHours(-24 * (day - 1));
    return now.toISOString().slice(0, 10);
  })();
  const thisWeek = data.by_week[thisWeekKey] ?? 0;

  const responses = interviews + offers + rejected;
  const responseRate = applied > 0 ? Math.round((responses / applied) * 100) : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card label="Total" value={String(total)} hint={`${applied} applied`} />
      <Card label="This week" value={String(thisWeek)} hint="new applications" />
      <Card
        label="Avg fit score"
        value={data.avg_fit_score != null ? data.avg_fit_score.toFixed(2) : "—"}
        hint="across all"
      />
      <Card
        label="Response rate"
        value={responseRate != null ? `${responseRate}%` : "—"}
        hint={`${responses} of ${applied}`}
      />
    </div>
  );
}
