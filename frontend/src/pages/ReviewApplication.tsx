import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import ChangesSummary from "../components/ChangesSummary";
import TailoredPreview, { type TailoredTab } from "../components/TailoredPreview";
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
  const [tab, setTab] = useState<TailoredTab>("resume");

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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap bg-white rounded-xl border border-slate-200 shadow-md p-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {source.request.company}
          </h1>
          <div className="text-lg text-indigo-700 font-semibold mt-0.5">
            {source.request.job_title}
          </div>
          <div className="text-sm text-slate-500 mt-2 flex flex-wrap items-center gap-2">
            <span>📍 {source.request.location ?? "—"}</span>
            <span className="text-slate-300">·</span>
            <span>🌐 {source.request.source_site ?? "—"}</span>
            {source.request.salary_offered && (
              <>
                <span className="text-slate-300">·</span>
                <span>💰 {source.request.salary_offered}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Fit score
          </div>
          <div className={`text-4xl font-bold ${fitColor(source.tailored.fit_score)}`}>
            {source.tailored.fit_score.toFixed(2)}
          </div>
        </div>
      </div>

      {warning && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 text-base rounded-lg p-4 shadow-sm">
          ⚠️ {warning}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {source.tailored.keywords.map((k) => (
          <span
            key={k}
            className="text-sm px-3 py-1 bg-gradient-to-r from-indigo-100 to-violet-100 text-indigo-800 border border-indigo-200 rounded-full font-medium"
          >
            {k}
          </span>
        ))}
      </div>

      {source.tailored.changes_summary && (
        <ChangesSummary markdown={source.tailored.changes_summary} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl shadow-md">
          <div className="px-4 py-2.5 border-b border-slate-200 text-sm uppercase tracking-wide text-slate-600 font-semibold bg-slate-50">
            📋 Job description
          </div>
          <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 p-4 max-h-[640px] overflow-y-auto leading-relaxed">
            {source.request.job_description}
          </pre>
        </div>

        <TailoredPreview
          resumeMd={resumeMd}
          coverMd={coverMd}
          editable
          onResumeChange={setResumeMd}
          onCoverChange={setCoverMd}
          tab={tab}
          onTabChange={setTab}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-end bg-white/70 backdrop-blur rounded-xl p-4 border border-slate-200 shadow-sm">
        {!source.persistedId && (
          <>
            <button
              onClick={() => createMut.mutate("DRAFT")}
              disabled={createMut.isPending}
              className="px-4 py-2.5 text-base font-medium border border-slate-300 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 transition"
            >
              Save as Draft
            </button>
            <button
              onClick={() => createMut.mutate("READY")}
              disabled={createMut.isPending}
              className="px-5 py-2.5 text-base font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 transition"
            >
              {createMut.isPending ? "Saving…" : "✓ Save as Ready"}
            </button>
            <button
              onClick={() => navigate("/new")}
              className="px-4 py-2.5 text-base font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
              className="px-4 py-2.5 text-base font-medium border border-slate-300 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 transition"
            >
              💾 Save edits
            </button>
            <a
              href={downloadUrl(source.persistedId, "docx", tab)}
              className="px-5 py-2.5 text-base font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg shadow-md hover:shadow-lg transition"
            >
              ⬇ {tab === "cover" ? "Download cover .docx" : "Download resume .docx"}
            </a>
            <a
              href={downloadUrl(source.persistedId, "pdf", tab)}
              className="px-5 py-2.5 text-base font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg shadow-md hover:shadow-lg transition"
            >
              ⬇ {tab === "cover" ? "Download cover .pdf" : "Download resume .pdf"}
            </a>
          </>
        )}
      </div>
    </div>
  );
}
