/**
 * scraper.js
 * Pulls jobs from free sources:
 *  - Greenhouse public API (per company)
 *  - Lever public API (per company)
 *  - Adzuna API (free tier)
 *  - Indeed RSS feed
 *
 * Run manually:  node src/scraper.js
 * Run via cron:  called by index.js scheduler
 */

import axios from "axios";
import Parser from "rss-parser";
import { supabase } from "./supabase.js";
import dotenv from "dotenv";
dotenv.config();

const rssParser = new Parser();

// ── CONFIG ────────────────────────────────────────────────────
// Add the companies you want to track on Greenhouse/Lever
const GREENHOUSE_COMPANIES = [
  "stripe", "notion", "vercel", "linear", "figma",
  "airbnb", "coinbase", "shopify", "atlassian", "mongodb",
];

const LEVER_COMPANIES = [
  "netflix", "uber", "lyft", "pinterest", "reddit",
  "dropbox", "twilio", "zendesk", "hubspot", "datadog",
];

const ADZUNA_APP_ID  = process.env.ADZUNA_APP_ID  ?? "";
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY ?? "";

// keywords to search for (from your profile target roles)
const SEARCH_KEYWORDS = [
  "software engineer",
  "frontend engineer",
  "full stack engineer",
  "backend engineer",
  "react developer",
];

// ── LOGGER ────────────────────────────────────────────────────
async function log(message, type = "scrape") {
  console.log(`[scraper] ${message}`);
  await supabase.from("activity_log").insert({ type, message });
}

// ── DEDUP + INSERT ────────────────────────────────────────────
async function saveJobs(jobs) {
  if (jobs.length === 0) return 0;

  // replace null external_id with a generated unique value
  // so the unique index works correctly
  const normalized = jobs.map((j) => ({
    ...j,
    external_id: j.external_id || `${j.platform}-${j.company}-${j.role}-${Date.now()}-${Math.random()}`,
  }));

  const BATCH_SIZE = 100;
  let saved = 0;

  for (let i = 0; i < normalized.length; i += BATCH_SIZE) {
    const batch = normalized.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("jobs")
      .upsert(batch, {
        onConflict: "platform,external_id",
        ignoreDuplicates: true,
      });

    if (error) {
      console.error(`[scraper] Batch ${Math.floor(i/BATCH_SIZE) + 1} error:`, error.message);
    } else {
      saved += batch.length;
      console.log(`[scraper] Saved batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(normalized.length/BATCH_SIZE)}`);
    }
  }

  return saved;
}

// ── GREENHOUSE ────────────────────────────────────────────────
async function scrapeGreenhouse() {
  const jobs = [];
  for (const company of GREENHOUSE_COMPANIES) {
    try {
      const { data } = await axios.get(
        `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`,
        { timeout: 8000 }
      );
      for (const job of data.jobs ?? []) {
        jobs.push({
          company: job.departments?.[0]?.name
            ? `${company.charAt(0).toUpperCase() + company.slice(1)}`
            : company.charAt(0).toUpperCase() + company.slice(1),
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

// ── LEVER ─────────────────────────────────────────────────────
async function scrapeLever() {
  const jobs = [];
  for (const company of LEVER_COMPANIES) {
    try {
      const { data } = await axios.get(
        `https://api.lever.co/v0/postings/${company}?mode=json`,
        { timeout: 8000 }
      );
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

// ── ADZUNA ────────────────────────────────────────────────────
async function scrapeAdzuna() {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    console.warn("[adzuna] No API keys — skipping");
    return [];
  }
  const jobs = [];
  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const { data } = await axios.get(
        `https://api.adzuna.com/v1/api/jobs/in/search/1`,
        {
          params: {
            app_id: ADZUNA_APP_ID,
            app_key: ADZUNA_APP_KEY,
            what: keyword,
            where: "india",
            results_per_page: 20,
            content_type: "application/json",
          },
          timeout: 8000,
        }
      );
      for (const job of data.results ?? []) {
        jobs.push({
          company: job.company?.display_name ?? "Unknown",
          role: job.title,
          platform: "Adzuna",
          location: job.location?.display_name ?? "India",
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
      console.warn(`[adzuna] failed for "${keyword}": ${e.message}`);
    }
  }
  return jobs;
}

// ── INDEED RSS ────────────────────────────────────────────────
async function scrapeIndeedRSS() {
  const jobs = [];
  for (const keyword of SEARCH_KEYWORDS.slice(0, 2)) {
    try {
      const url = `https://www.indeed.com/rss?q=${encodeURIComponent(keyword)}&l=India`;
      const feed = await rssParser.parseURL(url);
      for (const item of feed.items ?? []) {
        jobs.push({
          company: item.creator ?? "Unknown",
          role: item.title ?? "",
          platform: "Indeed",
          location: "India",
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
      console.warn(`[indeed-rss] failed for "${keyword}": ${e.message}`);
    }
  }
  return jobs;
}

// ── MAIN ──────────────────────────────────────────────────────
export async function runScraper() {
  await log("Starting job scrape across all platforms...");

  const [ghJobs, levJobs, adzJobs, indeedJobs] = await Promise.all([
    scrapeGreenhouse(),
    scrapeLever(),
    scrapeAdzuna(),
    scrapeIndeedRSS(),
  ]);

  const all = [...ghJobs, ...levJobs, ...adzJobs, ...indeedJobs];
  await log(`Fetched ${all.length} raw jobs — deduplicating and saving...`);

  const saved = await saveJobs(all);
  await log(`Scrape complete — saved ${saved} new jobs to database`);

  return saved;
}

// allow direct execution
if (process.argv[1].includes("scraper")) {
  runScraper()
    .then((n) => { console.log(`Done. ${n} new jobs saved.`); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}