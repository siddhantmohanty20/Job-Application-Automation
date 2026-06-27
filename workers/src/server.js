/**
 * server.js
 * Multi-user safe API server. The authenticated user's id comes from
 * the frontend (via the request), not a hardcoded env var.
 */
import { findRecruiterForJob } from "./recruiter.js";
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

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:8080",
  methods: ["GET", "POST"],
}));
app.use(express.json());

// ── auth: verify worker API key + extract user from Supabase JWT ──
async function auth(req, res, next) {
  const key = req.headers["x-api-key"];
  if (key !== process.env.WORKER_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // get the calling user's id from their Supabase access token
  const authHeader = req.headers["authorization"];
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user) {
      req.userId = data.user.id;
    }
  }
  next();
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// scraper/matcher run for ALL active users (shared job pool, distributed per-user)
app.post("/api/scraper/run", auth, async (req, res) => {
  console.log("[api] Scraper triggered from UI");
  res.json({ message: "Scraper started", status: "running" });
  try {
    const saved = await runScraper();
    const matched = await runMatcher();
    console.log(`[api] Scraper done — ${saved} jobs, ${matched} matched`);
  } catch (e) {
    console.error("[api] Scraper error:", e.message);
  }
});

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

// gap analysis — scoped to the calling user
app.post("/api/analyze/:jobId", auth, async (req, res) => {
  const { jobId } = req.params;
  console.log(`[api] Gap analysis triggered for job ${jobId}`);
  res.json({ message: "Analysis started", status: "running", jobId });
  try {
    await analyzeResumeGap(jobId, req.userId);
    console.log(`[api] Gap analysis done for ${jobId}`);
  } catch (e) {
    console.error("[api] Gap analysis error:", e.message);
  }
});

app.post("/api/automation/start", auth, async (req, res) => {
  console.log("[api] Full automation triggered from UI");
  res.json({ message: "Automation started", status: "running" });
  try {
    if (req.userId) {
      await supabase.from("settings").update({ automation_active: true }).eq("user_id", req.userId);
    }
    const saved = await runScraper();
    const matched = await runMatcher();
    console.log(`[api] Automation done — ${saved} jobs scraped, ${matched} matched`);
  } catch (e) {
    console.error("[api] Automation error:", e.message);
  }
});

app.post("/api/automation/stop", auth, async (req, res) => {
  try {
    if (req.userId) {
      await supabase.from("settings").update({ automation_active: false }).eq("user_id", req.userId);
    }
    res.json({ message: "Stop signal sent" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

 app.post("/api/recruiter/find/:jobId", auth, async (req, res) => {
    const { jobId } = req.params;
    if (!req.userId) {
      return res.status(401).json({ error: "User not identified" });
    }
    console.log(`[api] Recruiter find triggered for job ${jobId}`);
    try {
      const result = await findRecruiterForJob(jobId, req.userId);
      res.json(result);
    } catch (e) {
      console.error("[api] Recruiter find error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

app.get("/api/automation/status", auth, async (req, res) => {
  if (!req.userId) return res.json({ active: false });
  const { data } = await supabase.from("settings").select("automation_active").eq("user_id", req.userId).single();
  res.json({ active: data?.automation_active ?? false });
});

app.listen(PORT, () => {
  console.log(`[server] API server running on port ${PORT}`);
});

export { app };