// Shared mock data for the job automation dashboard

export type Platform =
  | "LinkedIn"
  | "Indeed"
  | "Greenhouse"
  | "Lever"
  | "Wellfound"
  | "Adzuna"

export type JobStatus = "New" | "Applied" | "Skipped"

export type Job = {
  id: string
  company: string
  role: string
  platform: Platform
  match: number
  location: string
  dateFound: string
  status: JobStatus
  jobUrl?: string
}

export type ApplicationStatus =
  | "Applied"
  | "Interview"
  | "Rejected"
  | "No Response"

export type Application = {
  id: string
  company: string
  role: string
  dateApplied: string
  method: "Easy Apply" | "Playwright" | "Email"
  status: ApplicationStatus
  recruiterEmail: string | null
  recruiterName?: string 
  jobId?: string
}

// deterministic color from company name
export function companyColor(name: string) {
  const colors = [
    "#3b82f6",
    "#22c55e",
    "#eab308",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#f97316",
    "#ec4899",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function matchTone(score: number): "success" | "warning" | "danger" {
  if (score >= 80) return "success"
  if (score >= 60) return "warning"
  return "danger"
}

export const jobs: Job[] = [
  { id: "j1", company: "Stripe", role: "Senior Frontend Engineer", platform: "Greenhouse", match: 92, location: "Remote (US)", dateFound: "2026-06-06", status: "Applied" },
  { id: "j2", company: "Notion", role: "Product Engineer", platform: "Lever", match: 88, location: "San Francisco, CA", dateFound: "2026-06-06", status: "New" },
  { id: "j3", company: "Vercel", role: "Full-Stack Engineer", platform: "Greenhouse", match: 85, location: "Remote", dateFound: "2026-06-06", status: "New" },
  { id: "j4", company: "Linear", role: "Frontend Engineer", platform: "Lever", match: 81, location: "Remote (EU/US)", dateFound: "2026-06-05", status: "New" },
  { id: "j5", company: "Swiggy", role: "Data Engineer", platform: "LinkedIn", match: 76, location: "Bangalore, India", dateFound: "2026-06-05", status: "Applied" },
  { id: "j6", company: "Figma", role: "Software Engineer, Web", platform: "Greenhouse", match: 73, location: "New York, NY", dateFound: "2026-06-05", status: "New" },
  { id: "j7", company: "Airbnb", role: "Senior Software Engineer", platform: "LinkedIn", match: 69, location: "Remote (US)", dateFound: "2026-06-04", status: "Skipped" },
  { id: "j8", company: "Coinbase", role: "Backend Engineer", platform: "Greenhouse", match: 64, location: "Remote", dateFound: "2026-06-04", status: "New" },
  { id: "j9", company: "Datadog", role: "Platform Engineer", platform: "Indeed", match: 58, location: "Boston, MA", dateFound: "2026-06-04", status: "Skipped" },
  { id: "j10", company: "Ramp", role: "Frontend Engineer", platform: "Wellfound", match: 83, location: "New York, NY", dateFound: "2026-06-03", status: "Applied" },
  { id: "j11", company: "Brex", role: "Software Engineer II", platform: "Lever", match: 71, location: "Remote", dateFound: "2026-06-03", status: "New" },
  { id: "j12", company: "Razorpay", role: "SDE III - Frontend", platform: "Adzuna", match: 67, location: "Bangalore, India", dateFound: "2026-06-03", status: "New" },
]

export const applications: Application[] = [
  { id: "a1", company: "Stripe", role: "Senior Frontend Engineer", dateApplied: "2026-06-06", method: "Playwright", status: "Applied", recruiterEmail: "recruiting@stripe.com" },
  { id: "a2", company: "Ramp", role: "Frontend Engineer", dateApplied: "2026-06-05", method: "Easy Apply", status: "Interview", recruiterEmail: "talent@ramp.com" },
  { id: "a3", company: "Swiggy", role: "Data Engineer", dateApplied: "2026-06-05", method: "Email", status: "No Response", recruiterEmail: "careers@swiggy.in" },
  { id: "a4", company: "Notion", role: "Product Engineer", dateApplied: "2026-06-04", method: "Playwright", status: "Rejected", recruiterEmail: "recruiter@notion.so" },
  { id: "a5", company: "Vercel", role: "Full-Stack Engineer", dateApplied: "2026-06-04", method: "Email", status: "Interview", recruiterEmail: "jobs@vercel.com" },
  { id: "a6", company: "Linear", role: "Frontend Engineer", dateApplied: "2026-06-03", method: "Easy Apply", status: "Applied", recruiterEmail: null },
  { id: "a7", company: "Figma", role: "Software Engineer, Web", dateApplied: "2026-06-02", method: "Playwright", status: "No Response", recruiterEmail: "hiring@figma.com" },
]

export const pipeline = [
  { stage: "Scraped", count: 247, total: 247, tone: "info" as const },
  { stage: "Matched (>75%)", count: 86, total: 247, tone: "info" as const },
  { stage: "Applied", count: 42, total: 247, tone: "success" as const },
  { stage: "Email Sent", count: 18, total: 247, tone: "warning" as const },
  { stage: "Response Received", count: 6, total: 247, tone: "success" as const },
]

export type ActivityItem = {
  id: string
  type: "scrape" | "apply" | "email" | "resume" | "match"
  message: string
  time: string
}

export const activity: ActivityItem[] = [
  { id: "ac1", type: "scrape", message: "Scraped 23 jobs from Greenhouse", time: "2 min ago" },
  { id: "ac2", type: "apply", message: "Applied to Senior Frontend Engineer at Stripe", time: "8 min ago" },
  { id: "ac3", type: "email", message: "Cold email sent to recruiter@notion.so", time: "14 min ago" },
  { id: "ac4", type: "resume", message: "Resume tailored for Data Engineer role at Swiggy", time: "21 min ago" },
  { id: "ac5", type: "match", message: "Found 4 new matches above 80% on LinkedIn", time: "34 min ago" },
  { id: "ac6", type: "apply", message: "Applied to Frontend Engineer at Ramp via Easy Apply", time: "47 min ago" },
  { id: "ac7", type: "scrape", message: "Scraped 31 jobs from LinkedIn", time: "1 hr ago" },
  { id: "ac8", type: "email", message: "Cold email sent to talent@ramp.com", time: "1 hr ago" },
  { id: "ac9", type: "resume", message: "Resume tailored for Product Engineer role at Notion", time: "2 hr ago" },
  { id: "ac10", type: "match", message: "Match score recalculated for 86 jobs", time: "2 hr ago" },
  { id: "ac11", type: "scrape", message: "Scraped 18 jobs from Lever", time: "3 hr ago" },
  { id: "ac12", type: "apply", message: "Applied to Full-Stack Engineer at Vercel", time: "3 hr ago" },
]

export type TailoredResume = {
  id: string
  company: string
  role: string
  dateGenerated: string
  matchBefore: number
  matchAfter: number
}

export const tailoredResumes: TailoredResume[] = [
  { id: "tr1", company: "Stripe", role: "Senior Frontend Engineer", dateGenerated: "2026-06-06", matchBefore: 74, matchAfter: 92 },
  { id: "tr2", company: "Notion", role: "Product Engineer", dateGenerated: "2026-06-04", matchBefore: 68, matchAfter: 88 },
  { id: "tr3", company: "Swiggy", role: "Data Engineer", dateGenerated: "2026-06-05", matchBefore: 62, matchAfter: 81 },
  { id: "tr4", company: "Vercel", role: "Full-Stack Engineer", dateGenerated: "2026-06-04", matchBefore: 71, matchAfter: 85 },
  { id: "tr5", company: "Ramp", role: "Frontend Engineer", dateGenerated: "2026-06-03", matchBefore: 70, matchAfter: 83 },
]

export const resumeSkills = [
  "React", "TypeScript", "Next.js", "Node.js", "GraphQL", "PostgreSQL",
  "AWS", "Docker", "Python", "System Design", "REST APIs", "Tailwind CSS",
  "Redis", "CI/CD", "Playwright",
]

export const resumeKeywords = [
  "Frontend", "Distributed Systems", "Performance", "Accessibility",
  "Microservices", "Leadership", "Mentoring",
]

export type Email = {
  id: string
  recruiter: string
  company: string
  subject: string
  body: string
  linkedJob: string
  scheduledFor?: string
  sentAt?: string
  status?: "Delivered" | "Opened" | "Replied"
}

export const pendingEmails: Email[] = [
  {
    id: "e1",
    recruiter: "Sarah Chen",
    company: "Vercel",
    subject: "Full-Stack Engineer — excited to contribute",
    body: "Hi Sarah,\n\nI came across the Full-Stack Engineer opening at Vercel and was immediately drawn to your work on the frontend cloud. With 6 years building performant React and Node.js applications, I'd love to bring that experience to your team.\n\nI've attached a resume tailored specifically to this role. Would you be open to a quick chat this week?\n\nBest,\nAlex Morgan",
    linkedJob: "Full-Stack Engineer at Vercel",
    scheduledFor: "Today, 2:30 PM",
  },
  {
    id: "e2",
    recruiter: "James Patel",
    company: "Linear",
    subject: "Frontend Engineer role — quick intro",
    body: "Hi James,\n\nLinear's focus on speed and craft really resonates with me. I've spent the last few years obsessing over UI performance and developer experience, and I think I could be a strong fit for your Frontend Engineer role.\n\nHappy to share more — would love 15 minutes of your time.\n\nThanks,\nAlex Morgan",
    linkedJob: "Frontend Engineer at Linear",
    scheduledFor: "Today, 4:00 PM",
  },
  {
    id: "e3",
    recruiter: "Priya Nair",
    company: "Razorpay",
    subject: "SDE III Frontend — interested in the team",
    body: "Hi Priya,\n\nI've been following Razorpay's growth and would love to contribute to the frontend platform team as an SDE III. My background in scalable React architecture aligns well with the role.\n\nCould we set up a short call?\n\nRegards,\nAlex Morgan",
    linkedJob: "SDE III - Frontend at Razorpay",
    scheduledFor: "Tomorrow, 9:30 AM",
  },
]

export const sentEmails: Email[] = [
  {
    id: "se1",
    recruiter: "Recruiting Team",
    company: "Stripe",
    subject: "Senior Frontend Engineer — application follow-up",
    body: "Hi team,\n\nFollowing up on my application for the Senior Frontend Engineer role. I'm very excited about Stripe's mission and would love to discuss how I can contribute.\n\nBest,\nAlex Morgan",
    linkedJob: "Senior Frontend Engineer at Stripe",
    sentAt: "Today, 9:12 AM",
    status: "Opened",
  },
  {
    id: "se2",
    recruiter: "Maya Rodriguez",
    company: "Ramp",
    subject: "Frontend Engineer — thanks for the consideration",
    body: "Hi Maya,\n\nThank you for considering my application. I'm thrilled about the opportunity at Ramp and look forward to the next steps.\n\nBest,\nAlex Morgan",
    linkedJob: "Frontend Engineer at Ramp",
    sentAt: "Yesterday, 3:45 PM",
    status: "Replied",
  },
  {
    id: "se3",
    recruiter: "Careers",
    company: "Swiggy",
    subject: "Data Engineer role — introduction",
    body: "Hi,\n\nReaching out about the Data Engineer position. My experience with large-scale data pipelines would be a strong match.\n\nRegards,\nAlex Morgan",
    linkedJob: "Data Engineer at Swiggy",
    sentAt: "2 days ago",
    status: "Delivered",
  },
]

export type SyncEvent = {
  id: string
  timestamp: string
  rows: number
  status: "success" | "error"
}

export const syncLog: SyncEvent[] = [
  { id: "s1", timestamp: "2026-06-06 14:02", rows: 23, status: "success" },
  { id: "s2", timestamp: "2026-06-06 12:30", rows: 18, status: "success" },
  { id: "s3", timestamp: "2026-06-06 10:15", rows: 0, status: "error" },
  { id: "s4", timestamp: "2026-06-06 08:00", rows: 31, status: "success" },
  { id: "s5", timestamp: "2026-06-05 18:45", rows: 12, status: "success" },
  { id: "s6", timestamp: "2026-06-05 14:20", rows: 27, status: "success" },
]

export const columnMapping = [
  { field: "Company", column: "A — Company" },
  { field: "Role", column: "B — Job Title" },
  { field: "Platform", column: "C — Source" },
  { field: "Match Score", column: "D — Match %" },
  { field: "Status", column: "E — Status" },
  { field: "Date Found", column: "F — Date" },
  { field: "Recruiter Email", column: "G — Contact" },
  { field: "Applied At", column: "H — Applied On" },
]

// chart data for dashboard
export const weeklyActivity = [
  { day: "Mon", scraped: 38, applied: 6 },
  { day: "Tue", scraped: 52, applied: 9 },
  { day: "Wed", scraped: 41, applied: 7 },
  { day: "Thu", scraped: 63, applied: 11 },
  { day: "Fri", scraped: 47, applied: 12 },
  { day: "Sat", scraped: 22, applied: 4 },
  { day: "Sun", scraped: 18, applied: 3 },
]
