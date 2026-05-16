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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <Link
          to="/new"
          className="px-3 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-700"
        >
          + New application
        </Link>
      </div>

      <StatsCards />

      <div className="flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search company or title…"
          className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Status | "")}
          className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
