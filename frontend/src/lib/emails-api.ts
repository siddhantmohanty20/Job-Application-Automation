/**
 * emails-api.ts
 * Supabase read/write for the Email Outreach page.
 * All queries scoped to the current authenticated user.
 */

import { supabase } from "@/lib/supabase";

export type EmailStatus = "Pending" | "Sent" | "Delivered" | "Opened" | "Replied" | "Failed";

export type Email = {
  id: string;
  jobId: string;
  recruiterName: string;
  recruiterEmail: string;
  company: string;
  subject: string;
  body: string;
  linkedJob: string;
  status: EmailStatus;
  scheduledFor: string | null;
  sentAt: string | null;
};

export type EmailStats = {
  drafted: number;
  sent: number;
  opened: number;
  replied: number;
};

async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

// ── fetch pending emails (not yet sent) ────────────────────────

export async function fetchPendingEmails(): Promise<Email[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("emails")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "Pending")
    .order("scheduled_for", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(dbToEmail);
}

// ── fetch sent emails ────────────────────────────────────────

export async function fetchSentEmails(): Promise<Email[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("emails")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "Pending")
    .order("sent_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(dbToEmail);
}

// ── stats for the top metric cards ─────────────────────────────

export async function fetchEmailStats(): Promise<EmailStats> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("emails")
    .select("status")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  const rows = data ?? [];

  return {
    drafted: rows.length,
    sent: rows.filter((r) => r.status !== "Pending").length,
    opened: rows.filter((r) => r.status === "Opened" || r.status === "Replied").length,
    replied: rows.filter((r) => r.status === "Replied").length,
  };
}

// ── edit a pending email before sending ────────────────────────

export async function updateEmailContent(
  id: string,
  updates: { subject?: string; body?: string }
): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from("emails")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// ── cancel a pending email ──────────────────────────────────────

export async function cancelEmail(id: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from("emails")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// ── mapper ───────────────────────────────────────────────────

function dbToEmail(row: Record<string, unknown>): Email {
  return {
    id: row.id as string,
    jobId: (row.job_id as string) ?? "",
    recruiterName: (row.recruiter_name as string) ?? "",
    recruiterEmail: (row.recruiter_email as string) ?? "",
    company: (row.company as string) ?? "",
    subject: (row.subject as string) ?? "",
    body: (row.body as string) ?? "",
    linkedJob: (row.linked_job as string) ?? "",
    status: (row.status as EmailStatus) ?? "Pending",
    scheduledFor: (row.scheduled_for as string) ?? null,
    sentAt: (row.sent_at as string) ?? null,
  };
}