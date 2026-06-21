/**
 * tailor.js — Resume Gap Analyzer (multi-user safe)
 * userId is passed in explicitly by the caller (server.js extracts it
 * from the authenticated request).
 */

import OpenAI from "openai";
import { supabase } from "./supabase.js";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

async function buildCandidateSummary(userId) {
  const { data: profile } = await supabase
    .from("profile").select("*").eq("user_id", userId).single();
  if (!profile) throw new Error("No profile found for this user");

  const { data: experience } = await supabase
    .from("experience").select("*").eq("profile_id", profile.id).order("position");
  const { data: projects } = await supabase
    .from("projects").select("*").eq("profile_id", profile.id).order("position");

  const skills = profile.technical_skills?.map((s) => s.name).join(", ") ?? "";
  const softSkills = profile.soft_skills?.join(", ") ?? "";

  const expText = (experience ?? []).map((e) =>
    `${e.title} at ${e.company}: ${e.description ?? ""} | Tech: ${e.technologies?.join(", ") ?? ""}`
  ).join("\n");

  const projText = (projects ?? []).map((p) =>
    `${p.name}: ${p.one_liner ?? ""} | Tech: ${p.tech_stack?.join(", ") ?? ""}`
  ).join("\n");

  return `
CANDIDATE: ${profile.first_name} ${profile.last_name}
TITLE: ${profile.title}
TECHNICAL SKILLS: ${skills}
SOFT SKILLS: ${softSkills}
EXPERIENCE:\n${expText || "None"}
PROJECTS:\n${projText || "None"}
`.trim();
}

export async function analyzeResumeGap(jobId, userId) {
  if (!userId) throw new Error("userId is required for gap analysis");

  const { data: job, error } = await supabase
    .from("jobs").select("*").eq("id", jobId).eq("user_id", userId).single();
  if (error || !job) throw new Error(`Job ${jobId} not found for this user`);

  console.log(`[analyzer:${userId.slice(0, 8)}] Analyzing gap for ${job.role} at ${job.company}...`);

  const candidateSummary = await buildCandidateSummary(userId);
  const currentScore = job.match_score ?? 50;

  const prompt = `
You are an expert ATS resume coach. Analyze the gap between this candidate's profile and the job description.

CANDIDATE PROFILE:
${candidateSummary}

JOB DESCRIPTION:
Company: ${job.company}
Role: ${job.role}
Location: ${job.location}
Description: ${job.jd_text?.slice(0, 3000) ?? `Role: ${job.role} at ${job.company}`}

Respond ONLY with valid JSON, no markdown:
{
  "missingKeywords": ["keyword1", "keyword2"],
  "missingSkills": ["skill1", "skill2"],
  "presentKeywords": ["keyword1", "keyword2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "overallFit": "<2 sentence summary>",
  "estimatedScoreIfFixed": <integer 0-100>,
  "priorityActions": ["action1", "action2", "action3"]
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
    const summary = `Missing: ${parsed.missingKeywords?.slice(0, 5).join(", ") ?? "none"}. ${parsed.overallFit}`;

    const { data: saved } = await supabase
      .from("tailored_resumes")
      .insert({
        job_id: jobId,
        user_id: userId,
        company: job.company,
        role: job.role,
        match_before: currentScore,
        match_after: Math.min(100, parsed.estimatedScoreIfFixed ?? currentScore),
        changes_summary: summary,
        content: JSON.stringify(parsed, null, 2),
        date_generated: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (saved?.id) {
      await supabase
        .from("applications")
        .update({ tailored_resume_id: saved.id })
        .eq("job_id", jobId)
        .eq("user_id", userId);
    }

    await supabase.from("activity_log").insert({
      type: "resume",
      message: `Gap analysis complete for ${job.role} at ${job.company}`,
      user_id: userId,
    });

    return { saved, analysis: parsed };
  } catch (e) {
    console.error("[analyzer] Failed:", e.message);
    throw e;
  }
}

// direct execution requires both jobId and userId
const [jobId, userId] = process.argv.slice(2);
if (jobId && userId) {
  analyzeResumeGap(jobId, userId)
    .then(({ analysis }) => {
      console.log("Missing Keywords:", analysis.missingKeywords?.join(", "));
      process.exit(0);
    })
    .catch((e) => { console.error(e); process.exit(1); });
} else if (jobId) {
  console.error("Usage: node src/tailor.js <jobId> <userId>");
  process.exit(1);
}