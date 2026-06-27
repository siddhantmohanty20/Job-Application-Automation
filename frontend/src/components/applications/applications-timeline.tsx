import { findRecruiter } from "@/lib/automation-api"
import { UserSearch } from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CompanyAvatar } from "@/components/shared-badges"
import { type Application, type ApplicationStatus } from "@/lib/data"
import { fetchApplications, updateApplicationStatus } from "@/lib/applications-api"
import { cn } from "@/lib/utils"
import { FileText, Mail, Calendar, Zap, RefreshCw } from "lucide-react"
import { toast } from "sonner"

const statusStyles: Record<ApplicationStatus, string> = {
  Applied: "bg-info/15 text-info border-info/30",
  Interview: "bg-success/15 text-success border-success/30",
  Rejected: "bg-danger/15 text-danger border-danger/30",
  "No Response": "bg-muted text-muted-foreground border-border",
}

const statusOptions: ApplicationStatus[] = [
  "Applied",
  "Interview",
  "Rejected",
  "No Response",
]

const filters: ("All" | ApplicationStatus)[] = [
  "All",
  "Applied",
  "Interview",
  "Rejected",
  "No Response",
]

export function ApplicationsTimeline() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<(typeof filters)[number]>("All")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [findingId, setFindingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchApplications()
      setApplications(data)
    } catch (e) {
      toast.error("Failed to load applications", {
        description: e instanceof Error ? e.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible =
    filter === "All"
      ? applications
      : applications.filter((a) => a.status === filter)

  async function handleStatusChange(id: string, status: ApplicationStatus) {
    setUpdatingId(id)
    try {
      await updateApplicationStatus(id, status)
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      )
      toast.success("Status updated", { description: status })
    } catch (e) {
      toast.error("Failed to update status", {
        description: e instanceof Error ? e.message : "Unknown error",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleFindRecruiter(app: Application) {
    if (!app.jobId) {
      toast.error("Cannot search — missing job reference")
      return
    }
    setFindingId(app.id)
    try {
      const result = await findRecruiter(app.jobId)
      if (result.found) {
        toast.success(`Found recruiter: ${result.name}`, {
          description: result.email,
        })
        await load()
      } else {
        toast.info("No recruiter found", {
          description: "Could not find a verified contact for this company.",
        })
      }
    } catch (e) {
      toast.error("Recruiter search failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      })
    } finally {
      setFindingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* filters + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f}
              {f !== "All" && (
                <span className="ml-1.5 rounded-full bg-background/20 px-1.5 text-xs">
                  {applications.filter((a) => a.status === f).length}
                </span>
              )}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* empty state */}
      {!loading && applications.length === 0 && (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <Zap className="size-8 text-muted-foreground" />
          <p className="text-base font-medium text-foreground">No applications yet</p>
          <p className="text-sm text-muted-foreground">
            Click "Apply Now" on any job in the Jobs page to start tracking.
          </p>
        </Card>
      )}

      {/* timeline */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="size-12 rounded-full shrink-0" />
              <Skeleton className="h-28 flex-1 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="relative flex flex-col gap-4 before:absolute before:left-5 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border sm:before:left-6">
          {visible.map((app) => (
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
                          <Calendar className="size-3.5" />
                          {app.dateApplied}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="size-3.5" />
                          {app.method}
                        </span>
                        {app.recruiterEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="size-3.5" />
                            {app.recruiterName ? `${app.recruiterName} · ${app.recruiterEmail}` : app.recruiterEmail}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* status selector */}
                  <Select
                    value={app.status}
                    onValueChange={(v) =>
                      handleStatusChange(app.id, v as ApplicationStatus)
                    }
                    disabled={updatingId === app.id}
                  >
                    <SelectTrigger className="w-36 h-8">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-medium border-0 bg-transparent p-0",
                          statusStyles[app.status]
                        )}
                      >
                        {app.status}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          <Badge
                            variant="outline"
                            className={cn("font-medium", statusStyles[s])}
                          >
                            {s}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() =>
                      toast.info("Resume tailoring coming in Part E")
                    }
                  >
                    <FileText className="size-3.5" /> View Tailored Resume
                  </Button>

                  {!app.recruiterEmail ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={findingId === app.id}
                      onClick={() => handleFindRecruiter(app)}
                    >
                      {findingId === app.id ? (
                        <>Searching...</>
                      ) : (
                        <>
                          <UserSearch className="size-3.5" /> Find Recruiter
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() =>
                        toast.info("Email outreach coming in Part E")
                      }
                    >
                      <Mail className="size-3.5" /> View Cold Email
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {!loading && visible.length === 0 && applications.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No applications with status "{filter}".
        </p>
      )}
    </div>
  )
}