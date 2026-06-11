import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CompanyAvatar, MatchBadge, PlatformBadge } from "@/components/shared-badges"
import { type Job } from "@/lib/data"
import { fetchRecentMatches, updateJobStatus, logActivity } from "@/lib/jobs-api"
import { ExternalLink, Check } from "lucide-react"
import { toast } from "sonner"

export function RecentMatches() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [applyingId, setApplyingId] = useState<string | null>(null)

  useEffect(() => {
    fetchRecentMatches(5)
      .then(setJobs)
      .catch(() => toast.error("Could not load recent matches"))
      .finally(() => setLoading(false))
  }, [])

  async function handleApply(job: Job) {
    setApplyingId(job.id)
    try {
      await updateJobStatus(job.id, "Applied")
      await logActivity("apply", `Applied to ${job.role} at ${job.company}`)
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: "Applied" } : j))
      )
      toast.success("Marked as Applied", {
        description: `${job.role} at ${job.company}`,
      })
    } catch {
      toast.error("Failed to update job status")
    } finally {
      setApplyingId(null)
    }
  }

  return (
    <Card className="flex flex-col gap-1 p-5">
      <h2 className="text-base font-semibold text-foreground">Recent Job Matches</h2>
      <p className="mb-2 text-sm text-muted-foreground">Top scoring jobs found today</p>
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
                <div className="flex items-center gap-3">
                  <CompanyAvatar name={job.company} />
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground">{job.role}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">{job.company}</span>
                      <PlatformBadge platform={job.platform} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <MatchBadge score={job.match} />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        if (job.jobUrl) window.open(job.jobUrl, "_blank")
                        else toast.info("No URL available")
                      }}
                    >
                      <ExternalLink className="size-3.5" /> View JD
                    </Button>
                    <Button
                      size="sm"
                      disabled={applyingId === job.id || job.status === "Applied"}
                      onClick={() => handleApply(job)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {job.status === "Applied" ? (
                        <><Check className="size-3.5 mr-1" /> Applied</>
                      ) : applyingId === job.id ? (
                        "Applying..."
                      ) : (
                        "Apply Now"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
      </div>
    </Card>
  )
}