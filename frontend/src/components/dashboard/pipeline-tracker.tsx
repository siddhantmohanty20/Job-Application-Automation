import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchDashboardMetrics, type DashboardMetrics } from "@/lib/jobs-api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function PipelineTracker() {
  const [pipeline, setPipeline] = useState<DashboardMetrics["pipeline"]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardMetrics()
      .then((m) => setPipeline(m.pipeline))
      .catch(() => toast.error("Could not load pipeline"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card className="flex flex-col gap-1 p-5">
      <h2 className="text-base font-semibold text-foreground">Application Pipeline</h2>
      <p className="mb-3 text-sm text-muted-foreground">Jobs by stage this week</p>
      <div className="flex flex-col gap-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-6" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))
          : pipeline.map((stage) => {
              const pct = Math.round((stage.count / Math.max(stage.total, 1)) * 100)
              const barClass = {
                info: "bg-info",
                success: "bg-success",
                warning: "bg-warning",
                danger: "bg-danger",
              }[stage.tone]
              return (
                <div key={stage.stage} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{stage.stage}</span>
                    <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                      {stage.count}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all", barClass)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
      </div>
    </Card>
  )
}