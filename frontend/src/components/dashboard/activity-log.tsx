import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchActivityLog, type ActivityEntry } from "@/lib/jobs-api"
import { cn } from "@/lib/utils"
import { Search, Send, Mail, FileText, Target } from "lucide-react"
import { toast } from "sonner"

const iconMap: Record<ActivityEntry["type"], { icon: typeof Search; tone: string }> = {
  scrape: { icon: Search, tone: "bg-info/15 text-info" },
  apply:  { icon: Send,   tone: "bg-success/15 text-success" },
  email:  { icon: Mail,   tone: "bg-warning/15 text-warning" },
  resume: { icon: FileText, tone: "bg-chart-5/15 text-chart-5" },
  match:  { icon: Target, tone: "bg-info/15 text-info" },
}

export function ActivityLog() {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivityLog(20)
      .then(setEntries)
      .catch(() => toast.error("Could not load activity log"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card className="flex flex-col gap-1 p-5">
      <h2 className="text-base font-semibold text-foreground">Automation Activity Log</h2>
      <p className="mb-3 text-sm text-muted-foreground">Recent actions taken by the bot</p>
      <ScrollArea className="h-72 pr-3">
        <div className="flex flex-col gap-1">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))
          ) : entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No activity yet. Run the automation to see logs here.
            </p>
          ) : (
            entries.map((item) => {
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
            })
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}