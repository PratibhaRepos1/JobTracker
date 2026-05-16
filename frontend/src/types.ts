export type Status =
  | "DRAFT"
  | "READY"
  | "APPLIED"
  | "INTERVIEW"
  | "REJECTED"
  | "OFFER"
  | "WITHDRAWN";

export const STATUS_OPTIONS: Status[] = [
  "DRAFT",
  "READY",
  "APPLIED",
  "INTERVIEW",
  "REJECTED",
  "OFFER",
  "WITHDRAWN",
];

export interface Application {
  id: number;
  created_at: string;
  updated_at: string;
  source_site: string | null;
  source_url: string | null;
  company: string;
  job_title: string;
  location: string | null;
  salary_offered: string | null;
  job_description: string;
  keywords: string[] | null;
  fit_score: number | null;
  tailored_resume_md: string | null;
  tailored_cover_md: string | null;
  changes_summary: string | null;
  status: Status;
  applied_at: string | null;
  comment: string | null;
}

export interface TailorRequest {
  company: string;
  job_title: string;
  job_description: string;
  source_site?: string;
  source_url?: string;
  location?: string;
  salary_offered?: string;
}

export interface TailorResponse {
  keywords: string[];
  fit_score: number;
  tailored_resume_md?: string;
  tailored_cover_md?: string;
  changes_summary?: string;
  warning?: string;
}

export interface Stats {
  total: number;
  by_status: Record<string, number>;
  by_company: Record<string, number>;
  by_week: Record<string, number>;
  avg_fit_score: number | null;
}

export interface ExtractMetaResponse {
  company: string | null;
  job_title: string | null;
  location: string | null;
  salary_offered: string | null;
}
