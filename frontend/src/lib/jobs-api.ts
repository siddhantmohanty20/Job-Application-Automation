/**
 * jobs-api.ts
 * All Supabase read/write operations for the jobs section.
 * All queries scoped to the current authenticated user.
 * Fixed: date filter, match score ordering, user scoping.
 * Added: fetchedAt from created_at, paginated composite sort in fetchRecentMatches.
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

export type RecentMatchesPage = {
  jobs: Job[];
  hasMore: boolean;
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

  let query = supabase
    .from("jobs")
    .select("*")
    .eq("user_id", userId)
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

export async function deleteJob(jobId: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/**
 * Paginated recent matches with composite sort:
 *   1. Recent jobs (< 24h old) sorted by match_score DESC
 *   2. Older jobs sorted by match_score DESC
 *
 * We maintain two independent Supabase cursors via `match_score` + `id` keyset pagination:
 * - "recent" bucket: created_at >= cutoff, order by match_score DESC, id DESC
 * - "older"  bucket: created_at <  cutoff, order by match_score DESC, id DESC
 *
 * The caller tracks `recentExhausted`, `recentCursor`, and `olderCursor` across pages.
 * On each call we fill from recent first; once exhausted we fill from older.
 *
 * Cursor shape: { score: number | null; id: string } — the last item of the previous page.
 */
export type MatchCursor = {
  score: number | null;
  id: string;
} | null;

export type FetchRecentMatchesOptions = {
  pageSize?: number;
  recentExhausted?: boolean;
  recentCursor?: MatchCursor;
  olderCursor?: MatchCursor;
};

export type FetchRecentMatchesResult = {
  jobs: Job[];
  recentExhausted: boolean;
  recentCursor: MatchCursor;
  olderCursor: MatchCursor;
  hasMore: boolean;
};

export async function fetchRecentMatches(
  options: FetchRecentMatchesOptions = {}
): Promise<FetchRecentMatchesResult> {
  const {
    pageSize = 50,
    recentExhausted = false,
    recentCursor = null,
    olderCursor = null,
  } = options;

  const userId = await getUserId();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let jobs: Job[] = [];
  let newRecentExhausted = recentExhausted;
  let newRecentCursor = recentCursor;
  let newOlderCursor = olderCursor;

  // ── Step 1: fill from the recent bucket (< 24h) if not yet exhausted ──
  if (!recentExhausted) {
    let recentQuery = supabase
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "New")
      .gte("created_at", cutoff)
      .order("match_score", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false });

    // Keyset pagination: skip past the last seen (score, id) pair
    if (recentCursor) {
      if (recentCursor.score !== null) {
        // rows where score < last score, OR same score but id < last id
        recentQuery = recentQuery.or(
          `match_score.lt.${recentCursor.score},and(match_score.eq.${recentCursor.score},id.lt.${recentCursor.id})`
        );
      } else {
        // previous page had null scores — all remaining are also null, paginate by id
        recentQuery = recentQuery
          .is("match_score", null)
          .lt("id", recentCursor.id);
      }
    }

    const { data: recentData, error: recentError } = await recentQuery.limit(pageSize);
    if (recentError) throw new Error(recentError.message);

    const recentRows = recentData ?? [];
    jobs = recentRows.map(dbToJob);

    if (recentRows.length < pageSize) {
      // Recent bucket is now exhausted
      newRecentExhausted = true;
      newRecentCursor = null;
    } else {
      const last = recentRows[recentRows.length - 1];
      newRecentCursor = {
        score: last.match_score as number | null,
        id: last.id as string,
      };
    }

    // If recent gave us a full page, return now — no need to touch older bucket
    if (jobs.length >= pageSize) {
      return {
        jobs,
        recentExhausted: newRecentExhausted,
        recentCursor: newRecentCursor,
        olderCursor: newOlderCursor,
        hasMore: true,
      };
    }
  }

  // ── Step 2: fill remainder (or full page) from older bucket ──
  const needed = pageSize - jobs.length;

  let olderQuery = supabase
    .from("jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "New")
    .lt("created_at", cutoff)
    .order("match_score", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (olderCursor) {
    if (olderCursor.score !== null) {
      olderQuery = olderQuery.or(
        `match_score.lt.${olderCursor.score},and(match_score.eq.${olderCursor.score},id.lt.${olderCursor.id})`
      );
    } else {
      olderQuery = olderQuery
        .is("match_score", null)
        .lt("id", olderCursor.id);
    }
  }

  const { data: olderData, error: olderError } = await olderQuery.limit(needed + 1);
  if (olderError) throw new Error(olderError.message);

  const olderRows = olderData ?? [];
  // fetch needed+1 to detect whether there's a next page
  const hasMoreOlder = olderRows.length > needed;
  const olderSlice = olderRows.slice(0, needed);

  jobs = [...jobs, ...olderSlice.map(dbToJob)];

  if (olderSlice.length > 0) {
    const last = olderSlice[olderSlice.length - 1];
    newOlderCursor = {
      score: last.match_score as number | null,
      id: last.id as string,
    };
  }

  return {
    jobs,
    recentExhausted: newRecentExhausted,
    recentCursor: newRecentCursor,
    olderCursor: newOlderCursor,
    hasMore: hasMoreOlder || !newRecentExhausted,
  };
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
    fetchedAt: row.created_at
      ? formatRelativeTime(row.created_at as string)
      : undefined,
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