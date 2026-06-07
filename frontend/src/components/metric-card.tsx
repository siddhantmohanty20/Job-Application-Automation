import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone = "info",
}: {
  label: string
  value: string
  subtitle: string
  icon: LucideIcon
  tone?: "info" | "success" | "warning" | "danger"
}) {
  const toneClass = {
    info: "bg-info/15 text-info",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/15 text-danger",
  }[tone]

  return (
    <Card className="p-5 transition-colors hover:border-border/80 hover:bg-card/80">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-3xl font-semibold tabular-nums text-foreground">
            {value}
          </span>
        </div>
        <div className={cn("flex size-10 items-center justify-center rounded-lg", toneClass)}>
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{subtitle}</p>
    </Card>
  )
}
