/**
 * jobs-api.ts
 * All Supabase read/write operations for the jobs section.
 */

import { supabase } from "@/lib/supabase";
import type { Job, JobStatus, Platform } from "@/lib/data";

// ── types ────────────────────────────────────────────────────

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

// ── jobs ─────────────────────────────────────────────────────

export async function fetchJobs(filters: JobFilters = {}): Promise<Job[]> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const cutoff = sevenDaysAgo.toISOString().slice(0, 10)
  let query = supabase
    .from("jobs")
    .select("*")
    .gte("date_found", cutoff)
    .order("date_found", { ascending: false })
    .order("match_score", { ascending: false });

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
  const { error } = await supabase
    .from("jobs")
    .update({ status })
    .eq("id", jobId);
  if (error) throw new Error(error.message);
}

export async function fetchRecentMatches(limit = 5): Promise<Job[]> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const cutoff = sevenDaysAgo.toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .gte("match_score", 60)
    .eq("status", "New")// ← only show New jobs, exclude Applied/Skipped
    .gte("date_found", cutoff)        
    .order("match_score", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map(dbToJob);
}

// ── dashboard metrics ─────────────────────────────────────────

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const today = new Date().toISOString().slice(0, 10);

  const [jobsTodayRes, appsTodayRes, allJobsRes, emailsRes, appsAllRes] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("id", { count: "exact" })
        .gte("created_at", today),
      supabase
        .from("applications")
        .select("id", { count: "exact" })
        .gte("date_applied", today),
      supabase.from("jobs").select("match_score, status"),
      supabase
        .from("emails")
        .select("id", { count: "exact" })
        .eq("status", "Pending"),
      supabase.from("applications").select("status"),
    ]);

  const jobs = allJobsRes.data ?? [];
  const totalJobs = jobs.length;
  const highMatchJobs = jobs.filter(
    (j) => (j.match_score ?? 0) >= 75
  ).length;
  const matchRate =
    totalJobs > 0 ? Math.round((highMatchJobs / totalJobs) * 100) : 0;

  const apps = appsAllRes.data ?? [];
  const totalApps = apps.length || 1;
  const pipeline = [
    {
      stage: "Scraped",
      count: jobsTodayRes.count ?? 0,
      total: Math.max(jobsTodayRes.count ?? 0, 1),
      tone: "info" as const,
    },
    {
      stage: "Matched (>75%)",
      count: highMatchJobs,
      total: Math.max(totalJobs, 1),
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
    jobsFoundToday: jobsTodayRes.count ?? 0,
    applicationsSentToday: appsTodayRes.count ?? 0,
    matchRate,
    emailsQueued: emailsRes.count ?? 0,
    pipeline,
  };
}

// ── activity log ──────────────────────────────────────────────

export async function fetchActivityLog(limit = 20): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
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
  await supabase.from("activity_log").insert({ type, message, metadata });
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