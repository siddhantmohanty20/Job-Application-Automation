/**
 * recruiter.js
 * Finds a verified recruiter/HR contact email for a job's company
 * using Prospeo's Search Person + Enrich Person APIs.
 *
 * Restricts results to:
 *   - India-based contacts (with global fallback if none found)
 *   - Actual recruiting/talent-acquisition job titles (not random employees)
 *
 * Respects Prospeo's enrich rate limit (1 req/sec) with a built-in delay.
 *
 * Run manually: node src/recruiter.js <jobId> <userId>
 */

import axios from "axios";
import { supabase } from "./supabase.js";
import dotenv from "dotenv";
dotenv.config();

const PROSPEO_API_KEY = process.env.PROSPEO_API_KEY ?? "";
const BASE_URL = "https://api.prospeo.io";

function headers() {
  return {
    "X-KEY": PROSPEO_API_KEY,
    "Content-Type": "application/json",
  };
}

function extractDomain(job) {
  if (job.company_domain) {
    return job.company_domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  }
  if (job.job_url) {
    try {
      const url = new URL(job.job_url);
      return url.hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }
  return null;
}

async function searchRecruitersAtCompany(domain) {
  const payload = {
    page: 1,
    filters: {
      company: { websites: { include: [domain] } },
      person_department: { include: ["Human Resources"] },
      person_job_title: {
        include: [
          "recruiter", "recruiting", "talent acquisition",
          "talent sourcing", "hiring manager", "people operations",
        ],
        match_only_exact_job_titles: false,
      },
      person_location_search: { include: ["India"] },
    },
  };
  try {
    const { data } = await axios.post(`${BASE_URL}/search-person`, payload, { headers: headers(), timeout: 10000 });
    if (data.error) {
      console.warn(`[recruiter] search error: ${data.error_code}`);
      return [];
    }
    return data.results ?? [];
  } catch (e) {
    console.warn(`[recruiter] search failed for ${domain}: ${e.response?.data?.error_code ?? e.message}`);
    return [];
  }
}

async function searchRecruitersAtCompanyGlobal(domain) {
  const payload = {
    page: 1,
    filters: {
      company: { websites: { include: [domain] } },
      person_job_title: {
        include: ["recruiter", "recruiting", "talent acquisition", "talent sourcing"],
        match_only_exact_job_titles: false,
      },
    },
  };
  try {
    const { data } = await axios.post(`${BASE_URL}/search-person`, payload, { headers: headers(), timeout: 10000 });
    if (data.error) return [];
    return data.results ?? [];
  } catch (e) {
    console.warn(`[recruiter] global fallback search failed: ${e.message}`);
    return [];
  }
}

async function enrichPerson(personId) {
  const payload = { only_verified_email: true, data: { person_id: personId } };
  try {
    const { data } = await axios.post(`${BASE_URL}/enrich-person`, payload, { headers: headers(), timeout: 10000 });
    if (data.error) {
      console.warn(`[recruiter] enrich error: ${data.error_code}`);
      return null;
    }
    return data.person ?? null;
  } catch (e) {
    const code = e.response?.data?.error_code ?? e.message;
    if (code !== "NO_MATCH") console.warn(`[recruiter] enrich failed: ${code}`);
    return null;
  }
}

export async function checkProspeoQuota() {
  try {
    const { data } = await axios.get(`${BASE_URL}/account-information`, { headers: { "X-KEY": PROSPEO_API_KEY } });
    return data.response;
  } catch (e) {
    console.error("[recruiter] quota check failed:", e.message);
    return null;
  }
}

export async function findRecruiterForJob(jobId, userId) {
  if (!PROSPEO_API_KEY) throw new Error("PROSPEO_API_KEY is not set in .env");

  const { data: job, error } = await supabase
    .from("jobs").select("*").eq("id", jobId).eq("user_id", userId).single();
  if (error || !job) throw new Error("Job not found for this user");

  const domain = extractDomain(job);
  if (!domain) {
    await supabase.from("activity_log").insert({
      type: "email",
      message: `No company domain available for ${job.company} — skipped recruiter search`,
      user_id: userId,
    });
    return { found: false, reason: "no_domain" };
  }

  console.log(`[recruiter] Searching India-based recruiting contacts at ${domain}...`);
  let candidates = await searchRecruitersAtCompany(domain);
  let usedFallback = false;

  if (candidates.length === 0) {
    console.log(`[recruiter] No India-based match — trying global recruiting contacts at ${domain}...`);
    candidates = await searchRecruitersAtCompanyGlobal(domain);
    usedFallback = true;
  }

  if (candidates.length === 0) {
    await supabase.from("activity_log").insert({
      type: "email",
      message: `No recruiting contacts found at ${job.company}`,
      user_id: userId,
    });
    return { found: false, reason: "no_candidates" };
  }

  // enrich candidates one at a time, respecting the 1 req/sec rate limit
  for (const candidate of candidates.slice(0, 3)) {
    const personId = candidate.person?.person_id;
    if (!personId) continue;

    await new Promise((r) => setTimeout(r, 1100)); // stay safely under 1 req/sec

    const enriched = await enrichPerson(personId);
    if (enriched?.email?.revealed && enriched.email.email) {
      const recruiterName = enriched.full_name ?? candidate.person?.full_name ?? "";
      const recruiterEmail = enriched.email.email;
      const recruiterTitle = enriched.current_job_title ?? candidate.person?.current_job_title ?? "";
      const recruiterLocation = enriched.location ?? candidate.person?.location ?? "";

      await supabase
        .from("applications")
        .update({ recruiter_name: recruiterName, recruiter_email: recruiterEmail })
        .eq("job_id", jobId)
        .eq("user_id", userId);

      await supabase.from("activity_log").insert({
        type: "email",
        message: usedFallback
          ? `Found recruiter ${recruiterName} (${recruiterTitle}) at ${job.company} — no India contact, used global fallback`
          : `Found recruiter ${recruiterName} (${recruiterTitle}, ${recruiterLocation}) at ${job.company}`,
        user_id: userId,
      });

      console.log(`[recruiter] Found: ${recruiterName} <${recruiterEmail}> — ${recruiterTitle}`);
      return {
        found: true, name: recruiterName, email: recruiterEmail,
        title: recruiterTitle, location: recruiterLocation, usedFallback,
      };
    }
  }

  await supabase.from("activity_log").insert({
    type: "email",
    message: `Found ${candidates.length} recruiting contacts at ${job.company} but none had a verified email`,
    user_id: userId,
  });

  return { found: false, reason: "no_verified_email" };
}

// allow direct execution
const [cmd, jobId, userId] = process.argv.slice(1);
if (cmd?.includes("recruiter") && process.argv[2] === "--quota") {
  checkProspeoQuota().then((q) => { console.log(q); process.exit(0); });
} else if (jobId && userId) {
  findRecruiterForJob(jobId, userId)
    .then((result) => { console.log(result); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
} else if (jobId) {
  console.error("Usage: node src/recruiter.js <jobId> <userId>");
  console.error("   or: node src/recruiter.js --quota");
  process.exit(1);
}