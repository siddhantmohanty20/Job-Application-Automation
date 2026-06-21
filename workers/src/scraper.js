/**
 * scraper.js
 * Scrapes jobs PER USER, based on each user's own target roles,
 * locations, and platform preferences from their Settings.
 * Multi-user safe — no shared job pool.
 */

import axios from "axios";
import Parser from "rss-parser";
import { supabase } from "./supabase.js";
import dotenv from "dotenv";
dotenv.config();

const rssParser = new Parser();

const ADZUNA_APP_ID  = process.env.ADZUNA_APP_ID  ?? "";
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY ?? "";

// curated company pools — same companies checked for everyone,
// but only kept if they match the user's target roles
const GREENHOUSE_COMPANIES = [
  "stripe", "coinbase", "airbnb", "mongodb",
  "figma", "rippling", "brex", "gusto",
  "plaid", "checkr", "benchling", "verkada",
];

const LEVER_COMPANIES = [
  "netflix", "carta", "lattice", "retool",
  "scale-ai", "replit", "anduril",
];

// ── get all users + their settings ────────────────────────────

async function getActiveUsersWithSettings() {
  const { data: profiles, error } = await supabase
    .from("profile")
    .select("user_id, title");
  if (error) throw new Error(error.message);

  const users = [];
  for (const p of profiles ?? []) {
    const { data: settings } = await supabase
      .from("settings")
      .select("target_roles, preferred_locations, platforms_to_scrape")
      .eq("user_id", p.user_id)
      .single();

    users.push({
      userId: p.user_id,
      title: p.title,
      targetRoles: settings?.target_roles?.length
        ? settings.target_roles
        : [p.title || "Software Engineer"],
      preferredLocations: settings?.preferred_locations ?? ["India", "Remote"],
      platforms: settings?.platforms_to_scrape ?? ["Greenhouse", "Lever", "Adzuna", "Indeed"],
    });
  }
  return users;
}

// ── LOGGER (per user) ─────────────────────────────────────────

async function log(userId, message, type = "scrape") {
  console.log(`[scraper:${userId.slice(0, 8)}] ${message}`);
  await supabase.from("activity_log").insert({ type, message, user_id: userId });
}

// ── SAVE JOBS (batched, scoped to user) ───────────────────────

async function saveJobs(userId, jobs) {
  if (jobs.length === 0) return 0;

  const normalized = jobs.map((j) => ({
    ...j,
    user_id: userId,
    external_id: j.external_id || `${j.platform}-${j.company}-${j.role}-${Date.now()}-${Math.random()}`,
  }));

  const BATCH_SIZE = 100;
  let saved = 0;
  for (let i = 0; i < normalized.length; i += BATCH_SIZE) {
    const batch = normalized.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("jobs")
      .upsert(batch, { onConflict: "user_id,platform,external_id", ignoreDuplicates: true });
    if (!error) saved += batch.length;
    else console.error("[scraper] batch error:", error.message);
  }
  return saved;
}

// ── relevance filter — does this job match the user's target roles? ──

function matchesUserRoles(jobTitle, targetRoles) {
  const titleLower = jobTitle.toLowerCase();
  return targetRoles.some((role) => {
    const roleWords = role.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    return roleWords.some((word) => titleLower.includes(word));
  });
}

// ── GREENHOUSE (fetched once, filtered per user) ──────────────

async function fetchGreenhousePool() {
  const jobs = [];
  for (const company of GREENHOUSE_COMPANIES) {
    try {
      const { data } = await axios.get(
        `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`,
        {
          timeout: 8000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
          },
        }
      );
      for (const job of data.jobs ?? []) {
        if (!job.absolute_url) continue;
        const companyName = company.charAt(0).toUpperCase() + company.slice(1);
        jobs.push({
          company: companyName,
          role: job.title,
          platform: "Greenhouse",
          location: job.location?.name ?? "Remote",
          job_url: job.absolute_url,
          apply_url: job.absolute_url,
          jd_text: "",
          date_found: new Date().toISOString().slice(0, 10),
          status: "New",
          external_id: String(job.id),
          company_domain: `${company}.com`,
          ats_type: "Greenhouse",
        });
      }
    } catch (e) {
      console.warn(`[greenhouse] failed for ${company}: ${e.message}`);
    }
  }
  return jobs;
}

async function fetchLeverPool() {
  const jobs = [];
  for (const company of LEVER_COMPANIES) {
    try {
      const { data } = await axios.get(`https://api.lever.co/v0/postings/${company}?mode=json`, { timeout: 8000 });
      for (const job of data ?? []) {
        jobs.push({
          company: company.charAt(0).toUpperCase() + company.slice(1),
          role: job.text,
          platform: "Lever",
          location: job.categories?.location ?? "Remote",
          job_url: job.hostedUrl,
          apply_url: job.applyUrl,
          jd_text: job.descriptionPlain?.slice(0, 2000) ?? "",
          date_found: new Date().toISOString().slice(0, 10),
          status: "New",
          external_id: job.id,
          company_domain: `${company}.com`,
          ats_type: "Lever",
        });
      }
    } catch (e) {
      console.warn(`[lever] failed for ${company}: ${e.message}`);
    }
  }
  return jobs;
}

// ── ADZUNA (queried per-user with their own keywords) ─────────

async function fetchAdzunaForUser(targetRoles, location) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return [];
  const jobs = [];
  for (const role of targetRoles.slice(0, 3)) {
    try {
      const { data } = await axios.get(`https://api.adzuna.com/v1/api/jobs/in/search/1`, {
        params: {
          app_id: ADZUNA_APP_ID,
          app_key: ADZUNA_APP_KEY,
          what: role,
          where: location || "india",
          results_per_page: 15,
          content_type: "application/json",
        },
        timeout: 8000,
      });
      for (const job of data.results ?? []) {
        jobs.push({
          company: job.company?.display_name ?? "Unknown",
          role: job.title,
          platform: "Adzuna",
          location: job.location?.display_name ?? location ?? "India",
          job_url: job.redirect_url,
          apply_url: job.redirect_url,
          jd_text: job.description?.slice(0, 2000) ?? "",
          date_found: new Date().toISOString().slice(0, 10),
          status: "New",
          external_id: job.id,
          company_domain: "",
          ats_type: "Email",
        });
      }
    } catch (e) {
      console.warn(`[adzuna] failed for "${role}": ${e.message}`);
    }
  }
  return jobs;
}

// ── INDEED RSS (per-user with their own keywords) ─────────────

async function fetchIndeedForUser(targetRoles, location) {
  const jobs = [];
  for (const role of targetRoles.slice(0, 2)) {
    try {
      const url = `https://www.indeed.com/rss?q=${encodeURIComponent(role)}&l=${encodeURIComponent(location || "India")}`;
      const feed = await rssParser.parseURL(url);
      for (const item of feed.items ?? []) {
        jobs.push({
          company: item.creator ?? "Unknown",
          role: item.title ?? "",
          platform: "Indeed",
          location: location || "India",
          job_url: item.link ?? "",
          apply_url: item.link ?? "",
          jd_text: item.contentSnippet?.slice(0, 2000) ?? "",
          date_found: new Date().toISOString().slice(0, 10),
          status: "New",
          external_id: item.guid ?? item.link ?? "",
          company_domain: "",
          ats_type: "Email",
        });
      }
    } catch (e) {
      console.warn(`[indeed-rss] failed for "${role}": ${e.message}`);
    }
  }
  return jobs;
}

// ── MAIN: personalized scrape per user ─────────────────────────

export async function runScraper() {
  const users = await getActiveUsersWithSettings();
  console.log(`[scraper] Running personalized scrape for ${users.length} user(s)...`);

  // fetch shared-source pools ONCE (Greenhouse/Lever don't support keyword search,
  // so we filter their results per-user instead of re-fetching per-user)
  const [ghPool, leverPool] = await Promise.all([
    fetchGreenhousePool(),
    fetchLeverPool(),
  ]);
  const sharedPool = [...ghPool, ...leverPool];
  console.log(`[scraper] Shared pool ready: ${sharedPool.length} jobs from Greenhouse + Lever`);

  let totalSaved = 0;

  for (const user of users) {
    await log(user.userId, `Scraping for target roles: ${user.targetRoles.join(", ")}`);

    // 1. filter shared pool by this user's target roles
    const relevantFromPool = sharedPool.filter((j) =>
      matchesUserRoles(j.role, user.targetRoles)
    );

    // 2. fetch keyword-specific results for this user (Adzuna + Indeed support search)
    const location = user.preferredLocations[0];
    const [adzunaJobs, indeedJobs] = await Promise.all([
      user.platforms.includes("Adzuna") ? fetchAdzunaForUser(user.targetRoles, location) : [],
      user.platforms.includes("Indeed") ? fetchIndeedForUser(user.targetRoles, location) : [],
    ]);

    const userJobs = [...relevantFromPool, ...adzunaJobs, ...indeedJobs];

    // 3. dedup per user
    const seen = new Set();
    const deduped = userJobs.filter((j) => {
      const key = `${j.company}-${j.role}`.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const withUrls = deduped.filter((j) => j.job_url);

    const saved = await saveJobs(user.userId, withUrls);
    await log(user.userId, `Found ${withUrls.length} matching jobs — saved ${saved} new`);
    totalSaved += saved;

    // small delay between users to be polite to rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`[scraper] Done. ${totalSaved} total jobs saved across all users.`);
  return totalSaved;
}

if (process.argv[1]?.includes("scraper")) {
  runScraper()
    .then((n) => { console.log(`Done. ${n} jobs saved.`); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}