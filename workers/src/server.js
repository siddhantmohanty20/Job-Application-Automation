/**
 * server.js
 * Minimal Express API server for triggering automation from the frontend.
 * Runs alongside the cron scheduler on Render.
 */

import express from "express";
import cors from "cors";
import { runScraper } from "./scraper.js";
import { runMatcher } from "./matcher.js";
import { analyzeResumeGap } from "./tailor.js";
import { supabase } from "./supabase.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:8080",
  methods: ["GET", "POST"],
}));
app.use(express.json());

// ── simple API key auth ───────────────────────────────────────
function auth(req, res, next) {
  const key = req.headers["x-api-key"];
  if (key !== process.env.WORKER_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── health check ──────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── trigger scraper ───────────────────────────────────────────
app.post("/api/scraper/run", auth, async (req, res) => {
  console.log("[api] Scraper triggered from UI");
  // respond immediately, run in background
  res.json({ message: "Scraper started", status: "running" });
  try {
    const saved = await runScraper();
    const matched = await runMatcher();
    console.log(`[api] Scraper done — ${saved} jobs, ${matched} matched`);
    await supabase.from("activity_log").insert({
      type: "scrape",
      message: `Manual scrape complete — ${saved} new jobs, ${matched} matched`,
    });
  } catch (e) {
    console.error("[api] Scraper error:", e.message);
  }
});

// ── trigger matcher ───────────────────────────────────────────
app.post("/api/matcher/run", auth, async (req, res) => {
  console.log("[api] Matcher triggered from UI");
  res.json({ message: "Matcher started", status: "running" });
  try {
    const matched = await runMatcher();
    console.log(`[api] Matcher done — ${matched} jobs scored`);
  } catch (e) {
    console.error("[api] Matcher error:", e.message);
  }
});

// ── trigger gap analysis ──────────────────────────────────────
app.post("/api/analyze/:jobId", auth, async (req, res) => {
  const { jobId } = req.params;
  console.log(`[api] Gap analysis triggered for job ${jobId}`);
  res.json({ message: "Analysis started", status: "running", jobId });
  try {
    await analyzeResumeGap(jobId);
    console.log(`[api] Gap analysis done for ${jobId}`);
  } catch (e) {
    console.error("[api] Gap analysis error:", e.message);
  }
});

// ── trigger full automation ───────────────────────────────────
app.post("/api/automation/start", auth, async (req, res) => {
  console.log("[api] Full automation triggered from UI");
  res.json({ message: "Automation started", status: "running" });
  try {
    await supabase.from("settings").update({ automation_active: true })
      .eq("user_id", process.env.SUPABASE_USER_ID || "");
    const saved = await runScraper();
    const matched = await runMatcher();
    console.log(`[api] Automation done — ${saved} jobs scraped, ${matched} matched`);
  } catch (e) {
    console.error("[api] Automation error:", e.message);
  }
});

// ── automation status ─────────────────────────────────────────
app.get("/api/automation/status", auth, async (req, res) => {
  const { data } = await supabase.from("settings").select("automation_active").single();
  res.json({ active: data?.automation_active ?? false });
});

app.listen(PORT, () => {
  console.log(`[server] API server running on port ${PORT}`);
});

export { app };