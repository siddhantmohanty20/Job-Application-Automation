/**
 * applications-api.ts
 * All Supabase read/write operations for applications.
 * All queries scoped to the current authenticated user.
 */

import { supabase } from "@/lib/supabase";
import type { Application, ApplicationStatus } from "@/lib/data";

async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

// ── fetch all applications ────────────────────────────────────

export async function fetchApplications(): Promise<Application[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .order("date_applied", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(dbToApplication);
}

// ── create a new application ──────────────────────────────────

export async function createApplication(params: {
  jobId: string;
  company: string;
  role: string;
  method: string;
  recruiterEmail?: string;
  recruiterName?: string;
}): Promise<Application> {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from("applications")
    .insert({
      job_id: params.jobId,
      user_id: userId,
      company: params.company,
      role: params.role,
      method: params.method,
      status: "Applied",
      recruiter_email: params.recruiterEmail ?? null,
      recruiter_name: params.recruiterName ?? null,
      date_applied: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await supabase
    .from("jobs")
    .update({ status: "Applied" })
    .eq("id", params.jobId)
    .eq("user_id", userId);

  await supabase.from("activity_log").insert({
    type: "apply",
    message: `Applied to ${params.role} at ${params.company}`,
    user_id: userId,
  });

  return dbToApplication(data);
}

// ── update application status ─────────────────────────────────

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus
): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  await supabase.from("activity_log").insert({
    type: "apply",
    message: `Application status updated to ${status}`,
    user_id: userId,
  });
}

// ── mapper ────────────────────────────────────────────────────

function dbToApplication(row: Record<string, unknown>): Application {
  return {
    id: row.id as string,
    company: (row.company as string) ?? "",
    role: (row.role as string) ?? "",
    dateApplied: (row.date_applied as string)?.slice(0, 10) ?? "",
    method: ((row.method as string) ?? "Easy Apply") as "Easy Apply" | "Playwright" | "Email",
    status: (row.status as ApplicationStatus) ?? "Applied",
    recruiterEmail: (row.recruiter_email as string) ?? "",
  };
}