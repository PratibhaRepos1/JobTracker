import type {
  Application,
  ExtractMetaResponse,
  Stats,
  Status,
  TailorRequest,
  TailorResponse,
} from "../types";

const BASE = "/api";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      // ignore
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function tailor(req: TailorRequest): Promise<TailorResponse> {
  return fetch(`${BASE}/tailor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  }).then(handle<TailorResponse>);
}

export function extractMeta(jd: string): Promise<ExtractMetaResponse> {
  return fetch(`${BASE}/extract-meta`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_description: jd }),
  }).then(handle<ExtractMetaResponse>);
}

export function listApplications(params: {
  status?: Status;
  company?: string;
  q?: string;
} = {}): Promise<Application[]> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.company) qs.set("company", params.company);
  if (params.q) qs.set("q", params.q);
  const url = qs.toString() ? `${BASE}/applications?${qs}` : `${BASE}/applications`;
  return fetch(url).then(handle<Application[]>);
}

export function getApplication(id: number): Promise<Application> {
  return fetch(`${BASE}/applications/${id}`).then(handle<Application>);
}

export function createApplication(payload: Partial<Application>): Promise<Application> {
  return fetch(`${BASE}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(handle<Application>);
}

export function updateApplication(
  id: number,
  payload: Partial<Application>
): Promise<Application> {
  return fetch(`${BASE}/applications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(handle<Application>);
}

export function deleteApplication(id: number): Promise<void> {
  return fetch(`${BASE}/applications/${id}`, { method: "DELETE" }).then(
    handle<void>
  );
}

export function downloadUrl(
  id: number,
  format: "docx" | "pdf",
  kind: "resume" | "cover" = "resume"
): string {
  return `${BASE}/applications/${id}/download?format=${format}&kind=${kind}`;
}

export function getStats(): Promise<Stats> {
  return fetch(`${BASE}/stats`).then(handle<Stats>);
}
