import { Card } from "@/components/ui/card"
import { pipeline } from "@/lib/data"
import { cn } from "@/lib/utils"

export function PipelineTracker() {
  return (
    <Card className="flex flex-col gap-1 p-5">
      <h2 className="text-base font-semibold text-foreground">Application Pipeline</h2>
      <p className="mb-3 text-sm text-muted-foreground">Jobs by stage this week</p>
      <div className="flex flex-col gap-4">
        {pipeline.map((stage) => {
          const pct = Math.round((stage.count / stage.total) * 100)
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
