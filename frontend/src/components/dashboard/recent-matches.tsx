import { useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CompanyAvatar, MatchBadge, PlatformBadge } from "@/components/shared-badges"
import { type Job } from "@/lib/data"
import { fetchRecentMatches, updateJobStatus, logActivity } from "@/lib/jobs-api"
import { createApplication } from "@/lib/applications-api"
import { ExternalLink, Check, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function RecentMatches() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [skippingId, setSkippingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchRecentMatches(5)
      setJobs(data)
    } catch {
      toast.error("Could not load recent matches")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function recordApplication(job: Job) {
    if (applyingId === job.id || job.status === "Applied") return
    setApplyingId(job.id)
    try {
      await createApplication({
        jobId: job.id,
        company: job.company,
        role: job.role,
        method: "Easy Apply",
      })
      const remaining = jobs.filter((j) => j.id !== job.id)
      const fresh = await fetchRecentMatches(6)
      const currentIds = new Set(remaining.map((j) => j.id))
      const replacement = fresh.find(
        (j) => !currentIds.has(j.id) && j.status !== "Applied"
      )
      setJobs(replacement ? [...remaining, replacement] : remaining)
      toast.success("Application recorded!", {
        description: `${job.role} at ${job.company}`,
      })
    } catch {
      toast.error("Failed to record application")
    } finally {
      setApplyingId(null)
    }
  }

  async function handleSkip(job: Job) {
    if (skippingId === job.id) return
    setSkippingId(job.id)
    try {
      // Sets status = "Skipped" in DB.
      // Job stays in DB for deduplication — scraper won't re-insert it.
      // fetchRecentMatches filters status = "New" so it disappears from dashboard.
      await updateJobStatus(job.id, "Skipped")
      await logActivity("scrape", `Skipped ${job.role} at ${job.company}`)

      const remaining = jobs.filter((j) => j.id !== job.id)
      const fresh = await fetchRecentMatches(6)
      const currentIds = new Set(remaining.map((j) => j.id))
      const replacement = fresh.find((j) => !currentIds.has(j.id) && j.status === "New")
      setJobs(replacement ? [...remaining, replacement] : remaining)
      toast.success("Job skipped")
    } catch {
      toast.error("Failed to skip job")
    } finally {
      setSkippingId(null)
    }
  }

  return (
    <Card className="flex flex-col gap-1 p-5">
      <h2 className="text-base font-semibold text-foreground">Recent Job Matches</h2>
      <p className="mb-2 text-sm text-muted-foreground">
        Last 24h jobs ranked by match score, then older matches
      </p>
      <div className="flex flex-col gap-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-4">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))
          : jobs.length === 0
          ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No matches yet. Run the automation to scrape jobs.
            </p>
          )
          : jobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-4 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left: company + role info */}
                <div className="flex items-center gap-3">
                  <CompanyAvatar name={job.company} />
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground">{job.role}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">{job.company}</span>
                      <PlatformBadge platform={job.platform} />
                      {/* Fetch time from created_at */}
                      {job.fetchedAt && (
                        <span className="text-xs text-muted-foreground/60">
                          fetched {job.fetchedAt}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: match badge + action buttons */}
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <MatchBadge score={job.match} />
                  <div className="flex items-center gap-2">
                    {/* View JD */}
                    {job.jobUrl ? (
                      <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
                      >
                        <ExternalLink className="size-3.5" /> View JD
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed">
                        <ExternalLink className="size-3.5" /> View JD
                      </span>
                    )}

                    {/* Apply Now */}
                    {job.status === "Applied" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-success/15 px-3 py-1.5 text-sm font-medium text-success">
                        <Check className="size-3.5" /> Applied
                      </span>
                    ) : job.jobUrl ? (
                      <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={() => recordApplication(job)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors",
                          applyingId === job.id && "opacity-70 pointer-events-none"
                        )}
                      >
                        {applyingId === job.id ? "Recording..." : "Apply Now"}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground cursor-not-allowed opacity-50">
                        No URL
                      </span>
                    )}

                    {/* Skip — status="Skipped" in DB, removed from dashboard, kept for dedup */}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Skip this job"
                      disabled={skippingId === job.id}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => handleSkip(job)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
      </div>
    </Card>
  )
}