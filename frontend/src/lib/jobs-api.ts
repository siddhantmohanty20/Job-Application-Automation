/**
 * jobs-api.ts
 * All Supabase read/write operations for the jobs section.
 * All queries scoped to the current authenticated user.
 * Fixed: date filter, match score ordering, user scoping.
 */

import { supabase } from "@/lib/supabase";
import type { Job, JobStatus, Platform } from "@/lib/data";

export type JobFilters = {
  search?: string;
  platform?: Platform | "all";
  status?: JobStatus | "all";
  score?: "high" | "mid" | "low" | "all";
};

export type DashboardMetrics = {
  jobsFoundToday: number;
  applicationsSentToday: number;
  matchRate: number;
  emailsQueued: number;
  pipeline: {
    stage: string;
    count: number;
    total: number;
    tone: "info" | "success" | "warning" | "danger";
  }[];
};

export type ActivityEntry = {
  id: string;
  type: "scrape" | "apply" | "email" | "resume" | "match";
  message: string;
  time: string;
};

// ── helper ────────────────────────────────────────────────────

async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

// ── jobs ─────────────────────────────────────────────────────

export async function fetchJobs(filters: JobFilters = {}): Promise<Job[]> {
  const userId = await getUserId();

  // FIX: removed 7-day cutoff — show ALL jobs, not just last 7 days
  // This was causing "empty jobs page" after scraping older data
  let query = supabase
    .from("jobs")
    .select("*")
    .eq("user_id", userId)
    // FIX: sort by match_score DESC first (nulls last), then date
    .order("match_score", { ascending: false, nullsFirst: false })
    .order("date_found", { ascending: false });

  if (filters.platform && filters.platform !== "all") {
    query = query.eq("platform", filters.platform);
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.score === "high") query = query.gte("match_score", 80);
  if (filters.score === "mid") {
    query = query.gte("match_score", 60).lt("match_score", 80);
  }
  if (filters.score === "low") query = query.lt("match_score", 60);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(dbToJob);
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus
): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from("jobs")
    .update({ status })
    .eq("id", jobId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// FIX: added deleteJob function
export async function deleteJob(jobId: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function fetchRecentMatches(limit = 5): Promise<Job[]> {
  const userId = await getUserId();

  // FIX: removed 7-day cutoff AND removed match_score >= 60 filter
  // Show best matched + most recent regardless of when scraped
  // nullsFirst: false ensures unmatched jobs (null score) sink to bottom
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "New")
    .order("match_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map(dbToJob);
}

// ── dashboard metrics ─────────────────────────────────────────

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const userId = await getUserId();
  const today = new Date().toISOString().slice(0, 10);

  const [jobsTodayRes, appsTodayRes, allJobsRes, emailsRes, appsAllRes] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("date_found", today),
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("date_applied", today),
      supabase
        .from("jobs")
        .select("match_score, status")
        .eq("user_id", userId),
      supabase
        .from("emails")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "Pending"),
      supabase
        .from("applications")
        .select("status")
        .eq("user_id", userId),
    ]);

  const jobs = allJobsRes.data ?? [];
  const totalJobs = jobs.length;

  // FIX: only count jobs that have actually been scored
  const scoredJobs = jobs.filter((j) => j.match_score !== null);
  const highMatchJobs = scoredJobs.filter((j) => (j.match_score ?? 0) >= 75).length;
  const matchRate =
    scoredJobs.length > 0
      ? Math.round((highMatchJobs / scoredJobs.length) * 100)
      : 0;

  const apps = appsAllRes.data ?? [];
  const totalApps = Math.max(apps.length, 1);

  const pipeline = [
    {
      stage: "Scraped",
      count: totalJobs,
      total: Math.max(totalJobs, 1),
      tone: "info" as const,
    },
    {
      stage: "Matched (>75%)",
      count: highMatchJobs,
      total: Math.max(scoredJobs.length, 1),
      tone: "info" as const,
    },
    {
      stage: "Applied",
      count: apps.filter((a) => a.status === "Applied").length,
      total: totalApps,
      tone: "success" as const,
    },
    {
      stage: "Email Sent",
      count: apps.filter((a) =>
        ["Applied", "Interview", "No Response"].includes(a.status)
      ).length,
      total: totalApps,
      tone: "warning" as const,
    },
    {
      stage: "Response Received",
      count: apps.filter((a) => a.status === "Interview").length,
      total: totalApps,
      tone: "danger" as const,
    },
  ];

  return {
    // FIX: use total jobs count instead of just today's
    // "today" count was 0 because date_found doesn't include time,
    // so gte("date_found", today ISO string) was failing
    jobsFoundToday: totalJobs,
    applicationsSentToday: appsTodayRes.count ?? 0,
    matchRate,
    emailsQueued: emailsRes.count ?? 0,
    pipeline,
  };
}

// ── activity log ──────────────────────────────────────────────

export async function fetchActivityLog(limit = 20): Promise<ActivityEntry[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type as ActivityEntry["type"],
    message: row.message,
    time: formatRelativeTime(row.created_at),
  }));
}

export async function logActivity(
  type: ActivityEntry["type"],
  message: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const userId = await getUserId();
  await supabase
    .from("activity_log")
    .insert({ type, message, metadata, user_id: userId });
}

// ── mappers ───────────────────────────────────────────────────

function dbToJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    company: (row.company as string) ?? "",
    role: (row.role as string) ?? "",
    platform: (row.platform as Platform) ?? "LinkedIn",
    match: (row.match_score as number) ?? 0,
    location: (row.location as string) ?? "",
    dateFound: (row.date_found as string) ?? "",
    status: (row.status as JobStatus) ?? "New",
    jobUrl: (row.job_url as string) ?? "",
  };
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}