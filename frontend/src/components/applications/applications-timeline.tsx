"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CompanyAvatar } from "@/components/shared-badges"
import { applications, type Application, type ApplicationStatus } from "@/lib/data"
import { cn } from "@/lib/utils"
import { FileText, Mail, Calendar, Zap } from "lucide-react"

const statusStyles: Record<ApplicationStatus, string> = {
  Applied: "bg-info/15 text-info border-info/30",
  Interview: "bg-success/15 text-success border-success/30",
  Rejected: "bg-danger/15 text-danger border-danger/30",
  "No Response": "bg-muted text-muted-foreground border-border",
}

const methodIcon = {
  "Easy Apply": Zap,
  Playwright: Zap,
  Email: Mail,
}

const filters: ("All" | ApplicationStatus)[] = [
  "All",
  "Applied",
  "Interview",
  "Rejected",
  "No Response",
]

export function ApplicationsTimeline() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All")

  const visible =
    filter === "All" ? applications : applications.filter((a) => a.status === filter)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      <div className="relative flex flex-col gap-4 before:absolute before:left-5 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border sm:before:left-6">
        {visible.map((app: Application) => {
          const MethodIcon = methodIcon[app.method]
          return (
            <div key={app.id} className="relative flex gap-4">
              <div className="z-10 hidden sm:block">
                <CompanyAvatar name={app.company} />
              </div>
              <Card className="flex-1 p-4 transition-colors hover:bg-card/80">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="sm:hidden">
                      <CompanyAvatar name={app.company} size="sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">{app.role}</span>
                      <span className="text-sm text-muted-foreground">{app.company}</span>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5" /> {app.dateApplied}
                        </span>
                        <span className="flex items-center gap-1">
                          <MethodIcon className="size-3.5" /> {app.method}
                        </span>
                        {app.recruiterEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="size-3.5" /> {app.recruiterEmail}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 font-medium", statusStyles[app.status])}
                  >
                    {app.status}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <FileText className="size-3.5" /> View Tailored Resume
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Mail className="size-3.5" /> View Cold Email
                  </Button>
                </div>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
