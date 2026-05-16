import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import { extractMeta } from "../lib/api";
import type { TailorRequest } from "../types";

interface Props {
  onSubmit: (req: TailorRequest) => void;
  loading?: boolean;
}

export default function JobPasteForm({ onSubmit, loading }: Props) {
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [sourceSite, setSourceSite] = useState("LinkedIn");
  const [sourceUrl, setSourceUrl] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [jd, setJd] = useState("");

  const autofill = useMutation({
    mutationFn: () => extractMeta(jd),
    onSuccess: (data) => {
      // Only fill empty fields by default so we don't overwrite anything the user typed.
      if (data.company && !company) setCompany(data.company);
      if (data.job_title && !jobTitle) setJobTitle(data.job_title);
      if (data.location && !location) setLocation(data.location);
      if (data.salary_offered && !salary) setSalary(data.salary_offered);
    },
  });

  const canAutofill = jd.trim().length > 100 && !autofill.isPending;
  const canSubmit = company.trim() && jobTitle.trim() && jd.trim().length > 50;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      company: company.trim(),
      job_title: jobTitle.trim(),
      job_description: jd.trim(),
      source_site: sourceSite || undefined,
      source_url: sourceUrl || undefined,
      location: location || undefined,
      salary_offered: salary || undefined,
    });
  }

  const inputCls =
    "w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4"
    >
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-slate-600">
            Job description *
          </label>
          <button
            type="button"
            onClick={() => autofill.mutate()}
            disabled={!canAutofill}
            className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {autofill.isPending ? "Reading JD…" : "✨ Auto-fill fields from JD"}
          </button>
        </div>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={12}
          className={inputCls + " font-mono text-xs leading-relaxed"}
          placeholder="Paste the full JD here, then click Auto-fill to populate company / title / location / salary."
          required
        />
        <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
          <span>{jd.length} chars</span>
          {autofill.isError && (
            <span className="text-rose-600">
              Auto-fill failed: {(autofill.error as Error).message}
            </span>
          )}
          {autofill.isSuccess && (
            <span className="text-emerald-600">
              Filled empty fields. Review/edit anything below.
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Company *</label>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={inputCls}
            placeholder="Acme Corp"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Job title *</label>
          <input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className={inputCls}
            placeholder="Senior Frontend Engineer"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Source site</label>
          <select
            value={sourceSite}
            onChange={(e) => setSourceSite(e.target.value)}
            className={inputCls}
          >
            <option>LinkedIn</option>
            <option>Indeed</option>
            <option>Company Site</option>
            <option>Referral</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Source URL</label>
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className={inputCls}
            placeholder="https://…"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputCls}
            placeholder="Remote / NYC / Bangalore"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Salary</label>
          <input
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            className={inputCls}
            placeholder="$120-150k / Negotiable"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Tailoring… (~15-20s)" : "Tailor resume + cover"}
        </button>
      </div>
    </form>
  );
}
