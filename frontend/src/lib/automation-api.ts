/**
 * automation-api.ts
 * Frontend API calls to trigger worker actions.
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "http://localhost:3001";
const WORKER_API_KEY = import.meta.env.VITE_WORKER_API_KEY || "";

const headers = {
  "Content-Type": "application/json",
  "x-api-key": WORKER_API_KEY,
};

export async function triggerScraper(): Promise<{ message: string }> {
  const res = await fetch(`${WORKER_URL}/api/scraper/run`, {
    method: "POST",
    headers,
  });
  if (!res.ok) throw new Error("Failed to trigger scraper");
  return res.json();
}

export async function triggerMatcher(): Promise<{ message: string }> {
  const res = await fetch(`${WORKER_URL}/api/matcher/run`, {
    method: "POST",
    headers,
  });
  if (!res.ok) throw new Error("Failed to trigger matcher");
  return res.json();
}

export async function triggerGapAnalysis(jobId: string): Promise<{ message: string }> {
  const res = await fetch(`${WORKER_URL}/api/analyze/${jobId}`, {
    method: "POST",
    headers,
  });
  if (!res.ok) throw new Error("Failed to trigger gap analysis");
  return res.json();
}

export async function triggerFullAutomation(): Promise<{ message: string }> {
  const res = await fetch(`${WORKER_URL}/api/automation/start`, {
    method: "POST",
    headers,
  });
  if (!res.ok) throw new Error("Failed to trigger automation");
  return res.json();
}

export async function getAutomationStatus(): Promise<{ active: boolean }> {
  const res = await fetch(`${WORKER_URL}/api/automation/status`, { headers });
  if (!res.ok) return { active: false };
  return res.json();
}