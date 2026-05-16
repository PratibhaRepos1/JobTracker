import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import TailoredPreview from "../components/TailoredPreview";
import {
  createApplication,
  downloadUrl,
  getApplication,
  updateApplication,
} from "../lib/api";
import type { Application, Status, TailorRequest, TailorResponse } from "../types";
import { fitColor } from "../lib/utils";

interface RouteState {
  tailored?: TailorResponse;
  request?: TailorRequest;
}

export default function ReviewApplication() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  const routeState = (location.state ?? {}) as RouteState;

  // If we have an id, load the saved record. Otherwise we're in post-tailor draft mode.
  const { data: saved, isLoading } = useQuery({
    queryKey: ["application", id],
    queryFn: () => getApplication(Number(id)),
    enabled: !!id,
  });

  const source = useMemo<{
    request: TailorRequest | null;
    tailored: TailorResponse | null;
    persistedId: number | null;
    persistedStatus: Status | null;
  }>(() => {
    if (saved) {
      return {
        request: {
          company: saved.company,
          job_title: saved.job_title,
          job_description: saved.job_description,
          source_site: saved.source_site ?? undefined,
          source_url: saved.source_url ?? undefined,
          location: saved.location ?? undefined,
          salary_offered: saved.salary_offered ?? undefined,
        },
        tailored: {
          keywords: saved.keywords ?? [],
          fit_score: saved.fit_score ?? 0,
          tailored_resume_md: saved.tailored_resume_md ?? "",
          tailored_cover_md: saved.tailored_cover_md ?? "",
          changes_summary: saved.changes_summary ?? "",
        },
        persistedId: saved.id,
        persistedStatus: saved.status,
      };
    }
    if (routeState.tailored && routeState.request) {
      return {
        request: routeState.request,
        tailored: routeState.tailored,
        persistedId: null,
        persistedStatus: null,
      };
    }
    return { request: null, tailored: null, persistedId: null, persistedStatus: null };
  }, [saved, routeState]);

  const [resumeMd, setResumeMd] = useState("");
  const [coverMd, setCoverMd] = useState("");

  useEffect(() => {
    if (source.tailored) {
      setResumeMd(source.tailored.tailored_resume_md ?? "");
      setCoverMd(source.tailored.tailored_cover_md ?? "");
    }
  }, [source.tailored]);

  const createMut = useMutation({
    mutationFn: (status: Status) => {
      if (!source.request || !source.tailored) {
        throw new Error("Nothing to save.");
      }
      return createApplication({
        ...source.request,
        keywords: source.tailored.keywords,
        fit_score: source.tailored.fit_score,
        tailored_resume_md: resumeMd,
        tailored_cover_md: coverMd,
        changes_summary: source.tailored.changes_summary ?? null,
        status,
      } as Partial<Application>);
    },
    onSuccess: (app) => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      navigate(`/applications/${app.id}`, { replace: true });
    },
  });

  const updateMut = useMutation({
    mutationFn: (payload: Partial<Application>) =>
      updateApplication(source.persistedId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application", String(source.persistedId)] });
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  if (id && isLoading) {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }
  if (!source.request || !source.tailored) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md p-4">
        Nothing to review here. Start from{" "}
        <button onClick={() => navigate("/new")} className="underline">
          New application
        </button>
        .
      </div>
    );
  }

  const warning = source.tailored.warning;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {source.request.company} — {source.request.job_title}
          </h1>
          <div className="text-sm text-slate-500 mt-1">
            {source.request.location ?? "—"} · {source.request.source_site ?? "—"}
            {source.request.salary_offered && ` · ${source.request.salary_offered}`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-slate-500">Fit score</div>
          <div className={`text-2xl font-semibold ${fitColor(source.tailored.fit_score)}`}>
            {source.tailored.fit_score.toFixed(2)}
          </div>
        </div>
      </div>

      {warning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md p-3">
          {warning}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {source.tailored.keywords.map((k) => (
          <span
            key={k}
            className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full"
          >
            {k}
          </span>
        ))}
      </div>

      {source.tailored.changes_summary && (
        <details className="bg-white border border-slate-200 rounded-md p-3 text-sm">
          <summary className="cursor-pointer font-medium text-slate-700">
            Changes summary
          </summary>
          <pre className="whitespace-pre-wrap text-xs text-slate-600 mt-2">
            {source.tailored.changes_summary}
          </pre>
        </details>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="px-4 py-2 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-600">
            Job description
          </div>
          <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700 p-4 max-h-[640px] overflow-y-auto">
            {source.request.job_description}
          </pre>
        </div>

        <TailoredPreview
          resumeMd={resumeMd}
          coverMd={coverMd}
          editable
          onResumeChange={setResumeMd}
          onCoverChange={setCoverMd}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-end">
        {!source.persistedId && (
          <>
            <button
              onClick={() => createMut.mutate("DRAFT")}
              disabled={createMut.isPending}
              className="px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              onClick={() => createMut.mutate("READY")}
              disabled={createMut.isPending}
              className="px-3 py-2 text-sm bg-slate-900 text-white rounded-md hover:bg-slate-700 disabled:opacity-50"
            >
              {createMut.isPending ? "Saving…" : "Save as Ready"}
            </button>
            <button
              onClick={() => navigate("/new")}
              className="px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-md"
            >
              Discard
            </button>
          </>
        )}
        {source.persistedId && (
          <>
            <button
              onClick={() =>
                updateMut.mutate({
                  tailored_resume_md: resumeMd,
                  tailored_cover_md: coverMd,
                })
              }
              disabled={updateMut.isPending}
              className="px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50"
            >
              Save edits
            </button>
            <a
              href={downloadUrl(source.persistedId, "docx", "resume")}
              className="px-3 py-2 text-sm bg-slate-900 text-white rounded-md hover:bg-slate-700"
            >
              Download .docx
            </a>
            <a
              href={downloadUrl(source.persistedId, "pdf", "resume")}
              className="px-3 py-2 text-sm bg-slate-900 text-white rounded-md hover:bg-slate-700"
            >
              Download .pdf
            </a>
          </>
        )}
      </div>
    </div>
  );
}
