/**
 * matcher.js
 * Scores unmatched jobs for EVERY active user against their own profile.
 */

import OpenAI from "openai";
import { supabase } from "./supabase.js";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

// ── get all active users ──────────────────────────────────────

async function getActiveUsers() {
  const { data, error } = await supabase.from("profile").select("user_id");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── build profile summary for one user ────────────────────────

async function getProfileSummary(userId) {
  const { data: profile } = await supabase
    .from("profile").select("*").eq("user_id", userId).single();
  if (!profile) return null;

  const { data: experience } = await supabase
    .from("experience").select("*").eq("profile_id", profile.id).order("position");
  const { data: education } = await supabase
    .from("education").select("*").eq("profile_id", profile.id);

  const expText = (experience ?? [])
    .map((e) => `${e.title} at ${e.company} (${e.start_year}–${e.current ? "Present" : e.end_year}): ${e.description}`)
    .join("\n");
  const skills = profile.technical_skills?.map((s) => s.name).join(", ") ?? "";
  const softSkills = profile.soft_skills?.join(", ") ?? "";
  const edu = (education ?? []).map((e) => `${e.degree} in ${e.field} from ${e.institution}`).join("; ");

  return `
CANDIDATE PROFILE SUMMARY:
Name: ${profile.first_name} ${profile.last_name}
Target Role: ${profile.title}
Notice Period: ${profile.notice_period}
Work Preference: ${profile.work_preference?.join(", ")}

EXPERIENCE:\n${expText || "No experience listed"}
EDUCATION: ${edu || "Not provided"}
TECHNICAL SKILLS: ${skills || "Not listed"}
SOFT SKILLS: ${softSkills || "Not listed"}
`.trim();
}

// ── score a single job ────────────────────────────────────────

async function scoreJob(profileSummary, job) {
  const jdText = job.jd_text
    ? job.jd_text.slice(0, 3000)
    : `Role: ${job.role}\nCompany: ${job.company}\nLocation: ${job.location}`;

  const prompt = `
You are a job matching AI. Score how well this candidate matches this job.

${profileSummary}

JOB DESCRIPTION:
Company: ${job.company}
Role: ${job.role}
Platform: ${job.platform}
Location: ${job.location}
Description: ${jdText}

Respond ONLY with valid JSON, no markdown:
{ "score": <integer 0-100>, "summary": "<one sentence>" }
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });
    const text = response.choices[0].message.content?.trim() ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return { score: Math.min(100, Math.max(0, Number(parsed.score))), summary: String(parsed.summary) };
  } catch (e) {
    console.error("[matcher] OpenAI error:", e.message);
    return { score: 50, summary: "Could not parse AI response" };
  }
}

// ── main: run matcher for every active user ───────────────────

export async function runMatcher() {
  const users = await getActiveUsers();
  console.log(`[matcher] Processing ${users.length} active user(s)...`);

  let totalMatched = 0;

  for (const user of users) {
    const userId = user.user_id;
    const profileSummary = await getProfileSummary(userId);
    if (!profileSummary) continue;

    const { data: jobs } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .is("match_score", null)
      .eq("status", "New")
      .limit(20); // per-user cap to stay within rate limits across multiple users

    if (!jobs || jobs.length === 0) continue;

    console.log(`[matcher:${userId.slice(0, 8)}] Scoring ${jobs.length} jobs...`);

    for (const job of jobs) {
      const { score, summary } = await scoreJob(profileSummary, job);

      await supabase.from("jobs").update({ match_score: score, match_summary: summary }).eq("id", job.id);
      await supabase.from("activity_log").insert({
        type: "match",
        message: `Scored ${job.role} at ${job.company}: ${score}% match`,
        user_id: userId,
      });

      totalMatched++;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`[matcher] Done. Scored ${totalMatched} jobs across all users.`);
  return totalMatched;
}

if (process.argv[1]?.includes("matcher")) {
  runMatcher()
    .then((n) => { console.log(`Done. ${n} jobs scored.`); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}