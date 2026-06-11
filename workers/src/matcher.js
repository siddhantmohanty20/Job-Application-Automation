/**
 * matcher.js
 * Uses Gemini API to score each unmatched job against the user's profile.
 * Sets match_score and match_summary on each job row.
 *
 * Run manually: node src/matcher.js
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase.js";
import dotenv from "dotenv";
dotenv.config();

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
// const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

// ── fetch user profile from DB ────────────────────────────────
async function getProfileSummary() {
  const { data: profile, error: profileError  } = await supabase
    .from("profile")
    .select("*")
    .single();
   console.log("[matcher] Profile fetch result:", JSON.stringify({ profile: profile?.first_name, error: profileError?.message }));

  if (!profile) throw new Error("No profile found in database");

  const { data: experience } = await supabase
    .from("experience")
    .select("*")
    .eq("profile_id", profile.id)
    .order("position");

  const { data: education } = await supabase
    .from("education")
    .select("*")
    .eq("profile_id", profile.id);

  const expText = (experience ?? [])
    .map((e) => `${e.title} at ${e.company} (${e.start_year}–${e.current ? "Present" : e.end_year}): ${e.description}`)
    .join("\n");

  const skills = profile.technical_skills?.map((s) => s.name).join(", ") ?? "";
  const softSkills = profile.soft_skills?.join(", ") ?? "";
  const edu = (education ?? [])
    .map((e) => `${e.degree} in ${e.field} from ${e.institution}`)
    .join("; ");

  return `
CANDIDATE PROFILE SUMMARY:
Name: ${profile.first_name} ${profile.last_name}
Target Role: ${profile.title}
Notice Period: ${profile.notice_period}
Work Preference: ${profile.work_preference?.join(", ")}

EXPERIENCE:
${expText || "No experience listed"}

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

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "score": <integer 0-100>,
  "summary": "<one sentence explaining the match score>"
}
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
    return {
      score: Math.min(100, Math.max(0, Number(parsed.score))),
      summary: String(parsed.summary),
    };
  } catch (e) {
    console.error("[matcher] OpenAI error:", e.message);
    return { score: 50, summary: "Could not parse AI response" };
  }
}

// ── main ──────────────────────────────────────────────────────
export async function runMatcher() {
  console.log("[matcher] Fetching unmatched jobs...");

  // get jobs with no match score yet
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("*")
    .is("match_score", null)
    .eq("status", "New")
    .limit(50);

  if (error) throw new Error(error.message);
  if (!jobs || jobs.length === 0) {
    console.log("[matcher] No unmatched jobs found.");
    return 0;
  }

  console.log(`[matcher] Scoring ${jobs.length} jobs...`);
  const profileSummary = await getProfileSummary();

  let matched = 0;
  for (const job of jobs) {
    const { score, summary } = await scoreJob(profileSummary, job);

    await supabase
      .from("jobs")
      .update({ match_score: score, match_summary: summary })
      .eq("id", job.id);

    await supabase.from("activity_log").insert({
      type: "match",
      message: `Scored ${job.role} at ${job.company}: ${score}% match`,
    });

    console.log(`[matcher] ${job.company} — ${job.role}: ${score}%`);
    matched++;

    // small delay to respect Gemini rate limits
    await new Promise((r) => setTimeout(r, 4000));
  }

  console.log(`[matcher] Done. Scored ${matched} jobs.`);
  return matched;
}

// allow direct execution
if (process.argv[1].includes("matcher")) {
  runMatcher()
    .then((n) => { console.log(`Done. ${n} jobs scored.`); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}