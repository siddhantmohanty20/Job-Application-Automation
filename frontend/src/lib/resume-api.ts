/**
 * resume-api.ts
 * Supabase read/write for resume vault + tailored resumes.
 */

import { supabase } from "@/lib/supabase";

export type TailoredResume = {
  id: string;
  jobId: string;
  company: string;
  role: string;
  dateGenerated: string;
  matchBefore: number;
  matchAfter: number;
  changesSummary: string;
  content: string;
};

export type ResumeAnalysis = {
  skills: string[];
  keywords: string[];
  yearsExperience: number;
};

// ── upload master resume to Supabase Storage ──────────────────

export async function uploadMasterResume(
  file: File,
  userId: string
): Promise<{ path: string; error: string | null }> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/master-resume.${ext}`;

  const { error } = await supabase.storage
    .from("resumes")
    .upload(path, file, { upsert: true });

  if (error) return { path: "", error: error.message };
  return { path, error: null };
}

// ── fetch tailored resumes ────────────────────────────────────

export async function fetchTailoredResumes(): Promise<TailoredResume[]> {
  const { data, error } = await supabase
    .from("tailored_resumes")
    .select("*")
    .order("date_generated", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(dbToTailored);
}

// ── save tailored resume ──────────────────────────────────────

export async function saveTailoredResume(params: {
  jobId: string;
  company: string;
  role: string;
  matchBefore: number;
  matchAfter: number;
  changesSummary: string;
  content: string;
}): Promise<TailoredResume> {
  const { data, error } = await supabase
    .from("tailored_resumes")
    .insert({
      job_id: params.jobId,
      company: params.company,
      role: params.role,
      match_before: params.matchBefore,
      match_after: params.matchAfter,
      changes_summary: params.changesSummary,
      content: params.content,
      date_generated: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return dbToTailored(data);
}

// ── get master resume download URL ───────────────────────────

export async function getMasterResumeUrl(userId: string): Promise<string | null> {
  const extensions = ["pdf", "docx"];
  for (const ext of extensions) {
    const { data } = await supabase.storage
      .from("resumes")
      .createSignedUrl(`${userId}/master-resume.${ext}`, 3600);
    if (data?.signedUrl) return data.signedUrl;
  }
  return null;
}

// ── get tailored resume download URL ─────────────────────────

export async function getTailoredResumeUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from("resumes")
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}

// ── mapper ────────────────────────────────────────────────────

function dbToTailored(row: Record<string, unknown>): TailoredResume {
  return {
    id: row.id as string,
    jobId: (row.job_id as string) ?? "",
    company: (row.company as string) ?? "",
    role: (row.role as string) ?? "",
    dateGenerated: (row.date_generated as string)?.slice(0, 10) ?? "",
    matchBefore: (row.match_before as number) ?? 0,
    matchAfter: (row.match_after as number) ?? 0,
    changesSummary: (row.changes_summary as string) ?? "",
    content: (row.content as string) ?? "",
  };
}