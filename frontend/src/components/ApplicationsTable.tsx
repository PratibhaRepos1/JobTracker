import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import {
  deleteApplication,
  downloadUrl,
  listApplications,
  updateApplication,
} from "../lib/api";
import type { Application, Status } from "../types";
import { STATUS_OPTIONS } from "../types";
import { fitColor, fmtDate, statusClass } from "../lib/utils";

interface Props {
  status?: Status | "";
  q?: string;
}

export default function ApplicationsTable({ status, q }: Props) {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["applications", status, q],
    queryFn: () =>
      listApplications({
        status: (status || undefined) as Status | undefined,
        q: q || undefined,
      }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Application> }) =>
      updateApplication(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteApplication(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  if (isLoading) {
    return <div className="text-sm text-slate-500 py-8">Loading applications…</div>;
  }
  if (error) {
    return <div className="text-sm text-rose-600 py-8">Error: {(error as Error).message}</div>;
  }
  const apps = data ?? [];

  if (apps.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-500">
        No applications yet.{" "}
        <Link to="/new" className="text-blue-600 hover:underline">
          Tailor your first one →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Company</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Location</th>
              <th className="px-3 py-2 text-left">Salary</th>
              <th className="px-3 py-2 text-left">Keywords</th>
              <th className="px-3 py-2 text-left">Fit</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {apps.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {fmtDate(a.created_at)}
                </td>
                <td className="px-3 py-2 text-slate-600">{a.source_site ?? "—"}</td>
                <td className="px-3 py-2 font-medium text-slate-900">
                  <Link to={`/applications/${a.id}`} className="hover:underline">
                    {a.company}
                  </Link>
                </td>
                <td className="px-3 py-2 text-slate-700">{a.job_title}</td>
                <td className="px-3 py-2 text-slate-600">{a.location ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{a.salary_offered ?? "—"}</td>
                <td className="px-3 py-2 max-w-xs">
                  <div className="flex flex-wrap gap-1">
                    {(a.keywords ?? []).slice(0, 4).map((k) => (
                      <span
                        key={k}
                        className="inline-block text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded"
                      >
                        {k}
                      </span>
                    ))}
                    {(a.keywords?.length ?? 0) > 4 && (
                      <span className="text-[10px] text-slate-400">
                        +{(a.keywords?.length ?? 0) - 4}
                      </span>
                    )}
                  </div>
                </td>
                <td className={`px-3 py-2 font-semibold ${fitColor(a.fit_score)}`}>
                  {a.fit_score != null ? a.fit_score.toFixed(2) : "—"}
                </td>
                <td className="px-3 py-2">
                  <select
                    value={a.status}
                    onChange={(e) =>
                      updateMut.mutate({
                        id: a.id,
                        payload: { status: e.target.value as Status },
                      })
                    }
                    className={`text-xs px-2 py-1 rounded border-0 ${statusClass(a.status)}`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <a
                    href={downloadUrl(a.id, "docx", "resume")}
                    className="text-xs text-blue-600 hover:underline mr-2"
                  >
                    .docx
                  </a>
                  <a
                    href={downloadUrl(a.id, "pdf", "resume")}
                    className="text-xs text-blue-600 hover:underline mr-2"
                  >
                    .pdf
                  </a>
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${a.company} — ${a.job_title}?`)) {
                        deleteMut.mutate(a.id);
                      }
                    }}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
