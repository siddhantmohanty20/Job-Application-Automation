/**
 * index.js
 * Main entry point for the workers process.
 * Runs on Render as a background worker.
 * Schedules daily scraping and matching via node-cron.
 */
import { analyzeResumeGap } from "./tailor.js";
import { supabase } from "./supabase.js";
import cron from "node-cron";
import { runScraper } from "./scraper.js";
import { runMatcher } from "./matcher.js";
import dotenv from "dotenv";
dotenv.config();

console.log("[workers] Starting AutoApply worker process...");

// ── DAILY SCRAPE: every day at 7:00 AM ───────────────────────
cron.schedule("0 7 * * *", async () => {
  console.log("[cron] Running daily job scrape...");
  try {
    const saved = await runScraper();
    console.log(`[cron] Scrape complete — ${saved} new jobs`);

    // immediately run matcher after scrape
    console.log("[cron] Running matcher on new jobs...");
    const matched = await runMatcher();
    console.log(`[cron] Matching complete — ${matched} jobs scored`);
  } catch (e) {
    console.error("[cron] Scrape/match failed:", e.message);
  }
});

// ── MATCH SWEEP: every 2 hours (catch any missed jobs) ───────
cron.schedule("0 */2 * * *", async () => {
  console.log("[cron] Running match sweep...");
  try {
    const matched = await runMatcher();
    if (matched > 0) console.log(`[cron] Sweep matched ${matched} jobs`);
  } catch (e) {
    console.error("[cron] Match sweep failed:", e.message);
  }
});

// ── RUN ONCE ON STARTUP (for testing) ────────────────────────
const RUN_ON_START = process.env.RUN_ON_START === "true";
if (RUN_ON_START) {
  console.log("[workers] RUN_ON_START=true — running scraper + matcher now...");
  runScraper()
    .then(() => runMatcher())
    .then(() => console.log("[workers] Startup run complete"))
    .catch((e) => console.error("[workers] Startup run failed:", e.message));
}

console.log("[workers] Scheduler running. Waiting for cron triggers...");

// hourly — analyze gaps for new applications
cron.schedule("0 * * * *", async () => {
  console.log("[cron] Running gap analysis for new applications...");
  try {
    const { data: apps } = await supabase
      .from("applications")
      .select("job_id")
      .is("tailored_resume_id", null)
      .limit(3);

    for (const app of apps ?? []) {
      if (app.job_id) {
        await analyzeResumeGap(app.job_id);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  } catch (e) {
    console.error("[cron] Gap analysis failed:", e.message);
  }
});