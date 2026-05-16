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
import { fitBgColor, fmtDate, statusClass } from "../lib/utils";

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
    return <div className="text-base text-slate-500 py-8">Loading applications…</div>;
  }
  if (error) {
    return <div className="text-base text-rose-600 py-8">Error: {(error as Error).message}</div>;
  }
  const apps = data ?? [];

  if (apps.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-16 text-center text-slate-500 shadow-sm">
        <div className="text-5xl mb-3">📭</div>
        <div className="text-lg">No applications yet.</div>
        <Link
          to="/new"
          className="inline-block mt-4 px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg"
        >
          Tailor your first one →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-md">
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-gradient-to-r from-indigo-50 to-violet-50 text-slate-700 text-sm uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Source</th>
              <th className="px-4 py-3 text-left font-semibold">Company</th>
              <th className="px-4 py-3 text-left font-semibold">Title</th>
              <th className="px-4 py-3 text-left font-semibold">Location</th>
              <th className="px-4 py-3 text-left font-semibold">Salary</th>
              <th className="px-4 py-3 text-left font-semibold">Keywords</th>
              <th className="px-4 py-3 text-left font-semibold">Fit</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {apps.map((a) => (
              <tr key={a.id} className="hover:bg-indigo-50/40 transition">
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                  {fmtDate(a.created_at)}
                </td>
                <td className="px-4 py-3 text-slate-600">{a.source_site ?? "—"}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  <Link to={`/applications/${a.id}`} className="hover:text-indigo-700 hover:underline">
                    {a.company}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">{a.job_title}</td>
                <td className="px-4 py-3 text-slate-600">{a.location ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{a.salary_offered ?? "—"}</td>
                <td className="px-4 py-3 max-w-xs">
                  <div className="flex flex-wrap gap-1">
                    {(a.keywords ?? []).slice(0, 4).map((k) => (
                      <span
                        key={k}
                        className="inline-block text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full"
                      >
                        {k}
                      </span>
                    ))}
                    {(a.keywords?.length ?? 0) > 4 && (
                      <span className="text-xs text-slate-400 self-center">
                        +{(a.keywords?.length ?? 0) - 4}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-md text-sm font-semibold ${fitBgColor(
                      a.fit_score
                    )}`}
                  >
                    {a.fit_score != null ? a.fit_score.toFixed(2) : "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={a.status}
                    onChange={(e) =>
                      updateMut.mutate({
                        id: a.id,
                        payload: { status: e.target.value as Status },
                      })
                    }
                    className={`text-sm px-3 py-1.5 rounded-md border font-medium ${statusClass(a.status)}`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                  <a
                    href={downloadUrl(a.id, "docx", "resume")}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                    title="Download resume .docx"
                  >
                    R.docx
                  </a>
                  <a
                    href={downloadUrl(a.id, "docx", "cover")}
                    className="text-sm font-medium text-violet-600 hover:text-violet-800 hover:underline"
                    title="Download cover letter .docx"
                  >
                    C.docx
                  </a>
                  <a
                    href={downloadUrl(a.id, "pdf", "resume")}
                    className="text-sm font-medium text-fuchsia-600 hover:text-fuchsia-800 hover:underline"
                    title="Download resume .pdf"
                  >
                    R.pdf
                  </a>
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${a.company} — ${a.job_title}?`)) {
                        deleteMut.mutate(a.id);
                      }
                    }}
                    className="text-sm font-medium text-rose-600 hover:text-rose-800 hover:underline"
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
