import { useState } from "react";
import { Link } from "react-router-dom";

import ApplicationsTable from "../components/ApplicationsTable";
import StatsCards from "../components/StatsCards";
import type { Status } from "../types";
import { STATUS_OPTIONS } from "../types";

export default function Dashboard() {
  const [status, setStatus] = useState<Status | "">("");
  const [q, setQ] = useState("");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Dashboard
        </h1>
        <Link
          to="/new"
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-base font-semibold rounded-lg shadow-md hover:shadow-lg hover:scale-[1.02] transition"
        >
          + New application
        </Link>
      </div>

      <StatsCards />

      <div className="flex flex-wrap items-center gap-3 bg-white/70 backdrop-blur rounded-xl p-4 border border-slate-200 shadow-sm">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍  Search company or title…"
          className="flex-1 min-w-[260px] px-4 py-2.5 border border-slate-300 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Status | "")}
          className="px-4 py-2.5 border border-slate-300 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <ApplicationsTable status={status} q={q} />
    </div>
  );
}
