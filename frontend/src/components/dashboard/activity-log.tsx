import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { activity, type ActivityItem } from "@/lib/data"
import { cn } from "@/lib/utils"
import { Search, Send, Mail, FileText, Target } from "lucide-react"

const iconMap: Record<ActivityItem["type"], { icon: typeof Search; tone: string }> = {
  scrape: { icon: Search, tone: "bg-info/15 text-info" },
  apply: { icon: Send, tone: "bg-success/15 text-success" },
  email: { icon: Mail, tone: "bg-warning/15 text-warning" },
  resume: { icon: FileText, tone: "bg-chart-5/15 text-chart-5" },
  match: { icon: Target, tone: "bg-info/15 text-info" },
}

export function ActivityLog() {
  return (
    <Card className="flex flex-col gap-1 p-5">
      <h2 className="text-base font-semibold text-foreground">Automation Activity Log</h2>
      <p className="mb-3 text-sm text-muted-foreground">Recent actions taken by the bot</p>
      <ScrollArea className="h-72 pr-3">
        <div className="flex flex-col gap-1">
          {activity.map((item) => {
            const { icon: Icon, tone } = iconMap[item.type]
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-accent/40"
              >
                <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", tone)}>
                  <Icon className="size-4" />
                </div>
                <span className="flex-1 text-sm text-foreground">{item.message}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </Card>
  )
}
