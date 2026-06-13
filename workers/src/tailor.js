/**
 * tailor.js — Resume Gap Analyzer
 * Compares your resume/profile against a job description.
 * Returns missing keywords, skill gaps, and actionable suggestions.
 * Does NOT rewrite your resume — you make changes manually.
 *
 * Run manually: node src/tailor.js <jobId>
 */

import OpenAI from "openai";
import { supabase } from "./supabase.js";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

// ── build candidate summary from profile ──────────────────────

async function buildCandidateSummary() {
  const { data: profile } = await supabase.from("profile").select("*").single();
  if (!profile) throw new Error("No profile found");

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

// ── analyze gap between resume and JD ────────────────────────

export async function analyzeResumeGap(jobId) {
  const { data: job, error } = await supabase
    .from("jobs").select("*").eq("id", jobId).single();
  if (error || !job) throw new Error(`Job ${jobId} not found`);

  console.log(`[analyzer] Analyzing gap for ${job.role} at ${job.company}...`);

  const candidateSummary = await buildCandidateSummary();
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

Provide a detailed gap analysis. Respond ONLY with valid JSON, no markdown:
{
  "missingKeywords": ["keyword1", "keyword2"],
  "missingSkills": ["skill1", "skill2"],
  "presentKeywords": ["keyword1", "keyword2"],
  "suggestions": [
    "Add X to your experience description under Company Y",
    "Highlight your Z project which demonstrates A",
    "Mention B certification or coursework if applicable"
  ],
  "overallFit": "<2 sentence summary of how well the candidate fits>",
  "estimatedScoreIfFixed": <integer 0-100>,
  "priorityActions": ["Most important action", "Second most important action", "Third most important action"]
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

    // build a human readable summary for changesSummary field
    const summary = `Missing: ${parsed.missingKeywords?.slice(0, 5).join(", ") ?? "none"}. ${parsed.overallFit}`;

    // save to tailored_resumes table (reusing for gap analysis)
    const { data: saved } = await supabase
      .from("tailored_resumes")
      .insert({
        job_id: jobId,
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

    // link to application
    if (saved?.id) {
      await supabase
        .from("applications")
        .update({ tailored_resume_id: saved.id })
        .eq("job_id", jobId);
    }

    await supabase.from("activity_log").insert({
      type: "resume",
      message: `Gap analysis complete for ${job.role} at ${job.company} — ${parsed.missingKeywords?.length ?? 0} missing keywords found`,
    });

    console.log(`[analyzer] Done. Missing keywords: ${parsed.missingKeywords?.length ?? 0}`);
    console.log(`[analyzer] Priority: ${parsed.priorityActions?.[0] ?? "N/A"}`);
    return { saved, analysis: parsed };
  } catch (e) {
    console.error("[analyzer] Failed:", e.message);
    throw e;
  }
}

// allow direct execution: node src/tailor.js <jobId>
const jobId = process.argv[2];
if (jobId) {
  analyzeResumeGap(jobId)
    .then(({ analysis }) => {
      console.log("\n=== GAP ANALYSIS RESULT ===");
      console.log("Missing Keywords:", analysis.missingKeywords?.join(", "));
      console.log("Missing Skills:", analysis.missingSkills?.join(", "));
      console.log("Priority Actions:");
      analysis.priorityActions?.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
      process.exit(0);
    })
    .catch((e) => { console.error(e); process.exit(1); });
}