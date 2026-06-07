import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CompanyAvatar, MatchBadge, PlatformBadge } from "@/components/shared-badges"
import { jobs } from "@/lib/data"
import { ExternalLink } from "lucide-react"

export function RecentMatches() {
  const recent = [...jobs].sort((a, b) => b.match - a.match).slice(0, 5)
  return (
    <Card className="flex flex-col gap-1 p-5">
      <h2 className="text-base font-semibold text-foreground">Recent Job Matches</h2>
      <p className="mb-2 text-sm text-muted-foreground">Top scoring jobs found today</p>
      <div className="flex flex-col gap-3">
        {recent.map((job) => (
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
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="size-3.5" /> View JD
                </Button>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Apply Now
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
