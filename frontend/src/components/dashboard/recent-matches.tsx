import { useEffect, useState, useCallback, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CompanyAvatar, MatchBadge, PlatformBadge } from "@/components/shared-badges"
import { type Job } from "@/lib/data"
import {
  fetchRecentMatches,
  updateJobStatus,
  logActivity,
  type MatchCursor,
} from "@/lib/jobs-api"
import { createApplication } from "@/lib/applications-api"
import { ExternalLink, Check, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function RecentMatches() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [skippingId, setSkippingId] = useState<string | null>(null)

  // Pagination cursors — kept in refs so IntersectionObserver closure always
  // sees the latest values without needing them as effect dependencies
  const recentExhaustedRef = useRef(false)
  const recentCursorRef = useRef<MatchCursor>(null)
  const olderCursorRef = useRef<MatchCursor>(null)

  // Sentinel div at the bottom of the scroll container
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // ── initial load ──────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    setLoading(true)
    recentExhaustedRef.current = false
    recentCursorRef.current = null
    olderCursorRef.current = null

    try {
      const result = await fetchRecentMatches({ pageSize: 50 })
      setJobs(result.jobs)
      setHasMore(result.hasMore)
      recentExhaustedRef.current = result.recentExhausted
      recentCursorRef.current = result.recentCursor
      olderCursorRef.current = result.olderCursor
    } catch {
      toast.error("Could not load recent matches")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadInitial() }, [loadInitial])

  // ── load next page ────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const result = await fetchRecentMatches({
        pageSize: 50,
        recentExhausted: recentExhaustedRef.current,
        recentCursor: recentCursorRef.current,
        olderCursor: olderCursorRef.current,
      })
      setJobs((prev) => [...prev, ...result.jobs])
      setHasMore(result.hasMore)
      recentExhaustedRef.current = result.recentExhausted
      recentCursorRef.current = result.recentCursor
      olderCursorRef.current = result.olderCursor
    } catch {
      toast.error("Could not load more jobs")
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore])

  // ── IntersectionObserver on sentinel ─────────────────────
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "0px",
        threshold: 0.1,
      }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [loadMore])

  // ── apply ─────────────────────────────────────────────────
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
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: "Applied" as const } : j))
      )
      toast.success("Application recorded!", {
        description: `${job.role} at ${job.company}`,
      })
    } catch {
      toast.error("Failed to record application")
    } finally {
      setApplyingId(null)
    }
  }

  // ── skip ──────────────────────────────────────────────────
  async function handleSkip(job: Job) {
    if (skippingId === job.id) return
    setSkippingId(job.id)
    try {
      // Sets status="Skipped" in DB — stays for deduplication,
      // disappears from dashboard because fetchRecentMatches filters status="New"
      await updateJobStatus(job.id, "Skipped")
      await logActivity("scrape", `Skipped ${job.role} at ${job.company}`)
      setJobs((prev) => prev.filter((j) => j.id !== job.id))
      toast.success("Job skipped")
    } catch {
      toast.error("Failed to skip job")
    } finally {
      setSkippingId(null)
    }
  }

  return (
    <Card className="flex flex-col gap-1 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Recent Job Matches</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Last 24h jobs ranked by match score, then older matches
          </p>
        </div>
        {!loading && (
          <span className="text-xs text-muted-foreground">
            {jobs.length} loaded
          </span>
        )}
      </div>

      {/* Fixed-height scrollable container */}
      <div
        ref={scrollContainerRef}
        className="mt-3 flex flex-col gap-3 overflow-y-auto"
        style={{ maxHeight: "600px" }}
      >
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))
        ) : jobs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No matches yet. Run the automation to scrape jobs.
          </p>
        ) : (
          <>
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-4 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left: company + role */}
                <div className="flex items-center gap-3">
                  <CompanyAvatar name={job.company} />
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground">{job.role}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">{job.company}</span>
                      <PlatformBadge platform={job.platform} />
                      {job.fetchedAt && (
                        <span className="text-xs text-muted-foreground/60">
                          fetched {job.fetchedAt}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: match badge + actions */}
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

                    {/* Skip — status="Skipped" in DB, kept for dedup */}
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

            {/* Sentinel — IntersectionObserver triggers loadMore when visible */}
            <div ref={sentinelRef} className="py-1">
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading more jobs...
                </div>
              )}
              {!hasMore && jobs.length > 0 && (
                <p className="py-3 text-center text-xs text-muted-foreground">
                  All {jobs.length} matches loaded
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  )
}