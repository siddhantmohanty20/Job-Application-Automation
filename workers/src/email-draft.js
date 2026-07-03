/**
 * email-draft.js
 * Drafts a personalized cold email to a recruiter using OpenAI,
 * based on the candidate's profile, the job, and the recruiter's
 * name/title (found via Prospeo in recruiter.js).
 *
 * Saves the draft to the `emails` table with status 'Pending'.
 * Does NOT send anything — sending is handled separately by the
 * anti-spam queue + Gmail API (next step).
 *
 * Run manually: node src/email-draft.js <jobId> <userId>
 */

import OpenAI from "openai";
import { supabase } from "./supabase.js";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

// ── build a concise candidate summary for the email prompt ────

async function buildCandidateContext(userId) {
  const { data: profile } = await supabase
    .from("profile").select("*").eq("user_id", userId).single();
  if (!profile) throw new Error("No profile found for this user");

  const { data: experience } = await supabase
    .from("experience")
    .select("*")
    .eq("profile_id", profile.id)
    .order("position")
    .limit(2); // most recent 1-2 roles is enough for an email

  const mostRecent = experience?.[0];
  const skills = profile.technical_skills?.slice(0, 6).map((s) => s.name).join(", ") ?? "";

  return {
    fullName: `${profile.first_name} ${profile.last_name}`.trim(),
    title: profile.title ?? "",
    email: profile.primary_email ?? "",
    phone: profile.mobile ? `${profile.country_code ?? ""} ${profile.mobile}` : "",
    linkedin: profile.linkedin ?? "",
    portfolio: profile.portfolio ?? "",
    github: profile.github ?? "",
    currentRole: mostRecent ? `${mostRecent.title} at ${mostRecent.company}` : "",
    yearsExperience: experience?.length
      ? experience.reduce((acc, e) => {
          const start = parseInt(e.start_year || "0", 10);
          const end = e.current ? new Date().getFullYear() : parseInt(e.end_year || "0", 10);
          return acc + Math.max(0, end - start);
        }, 0)
      : 0,
    skills,
    coverLetterTemplate: profile.cover_letter_template ?? "",
    useAiCoverLetters: profile.use_ai_cover_letters ?? true,
  };
}

// ── draft the email via OpenAI ─────────────────────────────────

async function generateEmailContent(candidate, job, recruiter, settings) {
  const signature = settings?.email_signature?.trim()
    ? settings.email_signature
    : `Best regards,\n${candidate.fullName}\n${candidate.phone}\n${candidate.email}${candidate.linkedin ? `\n${candidate.linkedin}` : ""}`;

  const templateHint = candidate.coverLetterTemplate
    ? `\nThe candidate's preferred tone/template to draw inspiration from:\n"""\n${candidate.coverLetterTemplate}\n"""`
    : "";

  const prompt = `
You are writing a short, professional cold outreach email from a job candidate to a recruiter.
This is NOT a cover letter — it's a brief, personalized email to get on the recruiter's radar.

CANDIDATE:
Name: ${candidate.fullName}
Current role: ${candidate.currentRole || "Not specified"}
Years of experience: ${candidate.yearsExperience}
Key skills: ${candidate.skills}
${templateHint}

RECRUITER:
Name: ${recruiter.name}
Title: ${recruiter.title}
Company: ${job.company}

JOB THEY'RE APPLYING TO:
Role: ${job.role}
Location: ${job.location}
${job.jd_text ? `Description excerpt: ${job.jd_text.slice(0, 800)}` : ""}

RULES:
- Keep it under 120 words in the body (excluding signature)
- Address the recruiter by first name only
- Mention the specific role and 1-2 concrete reasons the candidate is a strong fit
- Sound human and specific, not generic or templated
- Do NOT use phrases like "I hope this email finds you well" or "I am writing to express my interest"
- End with a soft, low-pressure call to action (e.g. "Happy to share more or jump on a quick call if useful.")
- Do NOT include a subject line in the body

Respond ONLY with valid JSON, no markdown:
{
  "subject": "<short, specific subject line, under 60 characters>",
  "body": "<the email body text, plain text with \\n for line breaks, NOT including the signature>"
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
  });

  const text = response.choices[0].message.content?.trim() ?? "";
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);

  return {
    subject: parsed.subject,
    body: `${parsed.body}\n\n${signature}`,
  };
}

// ── main: draft + save email for a job ─────────────────────────

export async function draftEmailForJob(jobId, userId) {
  const { data: job, error: jobError } = await supabase
    .from("jobs").select("*").eq("id", jobId).eq("user_id", userId).single();
  if (jobError || !job) throw new Error("Job not found for this user");

  const { data: application } = await supabase
    .from("applications")
    .select("*")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .single();

  if (!application?.recruiter_email) {
    throw new Error("No recruiter found for this job yet — run Find Recruiter first");
  }

  // check if a pending/sent email already exists for this job to avoid duplicates
  const { data: existing } = await supabase
    .from("emails")
    .select("id, status")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    console.log(`[email-draft] Email already exists for this job (status: ${existing.status}) — skipping`);
    return { skipped: true, reason: "already_drafted", existingId: existing.id };
  }

  const { data: settings } = await supabase
    .from("settings").select("*").eq("user_id", userId).single();

  console.log(`[email-draft] Drafting email to ${application.recruiter_name} at ${job.company}...`);

  const candidate = await buildCandidateContext(userId);
  const recruiter = { name: application.recruiter_name, title: "Recruiter" };

  const { subject, body } = await generateEmailContent(candidate, job, recruiter, settings);

  // compute a scheduled send time within the user's configured window
  const scheduledFor = computeScheduledTime(settings);

  const { data: saved, error: saveError } = await supabase
    .from("emails")
    .insert({
      job_id: jobId,
      application_id: application.id,
      user_id: userId,
      recruiter_name: application.recruiter_name,
      recruiter_email: application.recruiter_email,
      company: job.company,
      subject,
      body,
      linked_job: `${job.role} at ${job.company}`,
      status: "Pending",
      scheduled_for: scheduledFor,
    })
    .select("*")
    .single();

  if (saveError) throw new Error(saveError.message);

  await supabase.from("activity_log").insert({
    type: "email",
    message: `Drafted cold email to ${application.recruiter_name} at ${job.company}`,
    user_id: userId,
  });

  console.log(`[email-draft] Saved draft — scheduled for ${scheduledFor}`);
  return { skipped: false, email: saved };
}

// ── schedule the send within the user's configured window ─────
// picks a randomized time today (or tomorrow if window has passed)
// within their email_window_start / email_window_end settings

function computeScheduledTime(settings) {
  const windowStart = settings?.email_window_start ?? "09:00";
  const windowEnd = settings?.email_window_end ?? "18:00";

  const [startH, startM] = windowStart.split(":").map(Number);
  const [endH, endM] = windowEnd.split(":").map(Number);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(startH, startM, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(endH, endM, 0, 0);

  let target;
  if (now < todayStart) {
    // before window today — schedule randomly within today's window
    target = randomTimeBetween(todayStart, todayEnd);
  } else if (now < todayEnd) {
    // currently within window — schedule randomly between now and window end
    target = randomTimeBetween(now, todayEnd);
  } else {
    // window passed — schedule randomly within tomorrow's window
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    target = randomTimeBetween(tomorrowStart, tomorrowEnd);
  }

  return target.toISOString();
}

function randomTimeBetween(start, end) {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const randomMs = startMs + Math.random() * Math.max(0, endMs - startMs);
  return new Date(randomMs);
}

// allow direct execution: node src/email-draft.js <jobId> <userId>
const [jobId, userId] = process.argv.slice(2);
if (jobId && userId) {
  draftEmailForJob(jobId, userId)
    .then((result) => { console.log(result); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
} else if (jobId) {
  console.error("Usage: node src/email-draft.js <jobId> <userId>");
  process.exit(1);
}