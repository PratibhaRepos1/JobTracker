import { useQuery } from "@tanstack/react-query";

import { getStats } from "../lib/api";

interface CardProps {
  label: string;
  value: string;
  hint?: string;
  gradient: string;
  icon: string;
}

function Card({ label, value, hint, gradient, icon }: CardProps) {
  return (
    <div className={`rounded-xl p-5 shadow-md text-white ${gradient} relative overflow-hidden`}>
      <div className="absolute right-3 top-3 text-3xl opacity-30">{icon}</div>
      <div className="text-sm uppercase tracking-wider font-semibold text-white/90">
        {label}
      </div>
      <div className="text-4xl font-bold mt-2">{value}</div>
      {hint && <div className="text-sm text-white/80 mt-1">{hint}</div>}
    </div>
  );
}

export default function StatsCards() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
  });

  if (isLoading) {
    return <div className="text-base text-slate-500">Loading stats…</div>;
  }
  if (error || !data) {
    return (
      <div className="text-base text-rose-600">
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card
        label="Total"
        value={String(total)}
        hint={`${applied} applied`}
        icon="📊"
        gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
      />
      <Card
        label="This week"
        value={String(thisWeek)}
        hint="new applications"
        icon="🗓️"
        gradient="bg-gradient-to-br from-violet-500 to-fuchsia-600"
      />
      <Card
        label="Avg fit"
        value={data.avg_fit_score != null ? data.avg_fit_score.toFixed(2) : "—"}
        hint="across all"
        icon="🎯"
        gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
      />
      <Card
        label="Response rate"
        value={responseRate != null ? `${responseRate}%` : "—"}
        hint={`${responses} of ${applied}`}
        icon="📬"
        gradient="bg-gradient-to-br from-amber-500 to-rose-500"
      />
    </div>
  );
}
