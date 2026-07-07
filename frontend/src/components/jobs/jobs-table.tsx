import { useMemo, useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CompanyAvatar, MatchBadge, PlatformBadge } from "@/components/shared-badges"
import { type Job, type JobStatus, type Platform } from "@/lib/data"
import {
  fetchJobs, updateJobStatus, logActivity, deleteJob,
} from "@/lib/jobs-api"
import { createApplication } from "@/lib/applications-api"
import { cn } from "@/lib/utils"
import {
  Search, RefreshCw, ExternalLink, Check, X, Trash2,
} from "lucide-react"
import { toast } from "sonner"

function StatusBadge({ status }: { status: JobStatus }) {
  const cls = {
    New: "bg-info/15 text-info border-info/30",
    Applied: "bg-success/15 text-success border-success/30",
    Skipped: "bg-muted text-muted-foreground border-border",
  }[status]
  return (
    <Badge variant="outline" className={cn("font-medium", cls)}>
      {status}
    </Badge>
  )
}

export function JobsTable() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [platform, setPlatform] = useState<Platform | "all">("all")
  const [score, setScore] = useState<"all" | "high" | "mid" | "low">("all")
  const [status, setStatus] = useState<JobStatus | "all">("all")

  const loadJobs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchJobs()
      setJobs(data)
    } catch (e) {
      toast.error("Failed to load jobs", {
        description: e instanceof Error ? e.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadJobs() }, [loadJobs])

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (
        search &&
        !`${j.company} ${j.role} ${j.location}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false
      if (platform !== "all" && j.platform !== platform) return false
      if (status !== "all" && j.status !== status) return false
      if (score === "high" && j.match < 80) return false
      if (score === "mid" && (j.match < 60 || j.match >= 80)) return false
      if (score === "low" && j.match >= 60) return false
      return true
    })
  }, [jobs, search, platform, score, status])

  async function handleSkip(job: Job) {
    setActionId(job.id)
    try {
      await updateJobStatus(job.id, "Skipped")
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: "Skipped" } : j))
      )
      await logActivity("scrape", `Skipped ${job.role} at ${job.company}`)
      toast.success("Job skipped")
    } catch (e) {
      toast.error("Failed", { description: e instanceof Error ? e.message : "" })
    } finally {
      setActionId(null)
    }
  }

  async function handleDelete(job: Job) {
    setActionId(job.id)
    try {
      await deleteJob(job.id)
      setJobs((prev) => prev.filter((j) => j.id !== job.id))
      toast.success("Job deleted")
    } catch (e) {
      toast.error("Failed to delete", {
        description: e instanceof Error ? e.message : "",
      })
    } finally {
      setActionId(null)
    }
  }

  async function recordApplication(job: Job) {
    if (actionId === job.id || job.status === "Applied") return
    setActionId(job.id)
    try {
      await createApplication({
        jobId: job.id,
        company: job.company,
        role: job.role,
        method: "Easy Apply",
      })
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: "Applied" } : j))
      )
      await logActivity("apply", `Applied to ${job.role} at ${job.company}`)
      toast.success("Application recorded!", {
        description: `${job.role} at ${job.company}`,
      })
    } catch (e) {
      toast.error("Failed", { description: e instanceof Error ? e.message : "" })
    } finally {
      setActionId(null)
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, role, location..."
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex">
          <Select value={platform} onValueChange={(v) => setPlatform(v as Platform | "all")}>
            <SelectTrigger className="w-full lg:w-36">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="LinkedIn">LinkedIn</SelectItem>
              <SelectItem value="Indeed">Indeed</SelectItem>
              <SelectItem value="Greenhouse">Greenhouse</SelectItem>
              <SelectItem value="Lever">Lever</SelectItem>
              <SelectItem value="Wellfound">Wellfound</SelectItem>
              <SelectItem value="Adzuna">Adzuna</SelectItem>
            </SelectContent>
          </Select>
          <Select value={score} onValueChange={(v) => setScore(v as "all" | "high" | "mid" | "low")}>
            <SelectTrigger className="w-full lg:w-32">
              <SelectValue placeholder="Match" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scores</SelectItem>
              <SelectItem value="high">&gt;80%</SelectItem>
              <SelectItem value="mid">60-80%</SelectItem>
              <SelectItem value="low">&lt;60%</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as JobStatus | "all")}>
            <SelectTrigger className="w-full lg:w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Applied">Applied</SelectItem>
              <SelectItem value="Skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={loadJobs}
            variant="outline"
            className="col-span-2 gap-2 sm:col-span-1 lg:w-auto"
            disabled={loading}
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Scrollable table — fixed height so it doesn't overflow the page */}
      <ScrollArea className="h-[60vh] w-full">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow className="hover:bg-transparent">
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Match</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Date Found</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : filtered.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CompanyAvatar name={job.company} size="sm" />
                        <span className="font-medium text-foreground">{job.company}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground max-w-[200px] truncate">
                      {job.role}
                    </TableCell>
                    <TableCell>
                      <PlatformBadge platform={job.platform} />
                    </TableCell>
                    <TableCell>
                      <MatchBadge score={job.match} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {job.location}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {job.dateFound}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {/* View JD */}
                        {job.jobUrl ? (
                          <a
                            href={job.jobUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            title="View JD"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground opacity-30 cursor-not-allowed">
                            <ExternalLink className="size-4" />
                          </span>
                        )}

                        {/* Apply */}
                        {job.jobUrl && job.status !== "Applied" ? (
                          <a
                            href={job.jobUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            onClick={() => recordApplication(job)}
                            className="inline-flex items-center justify-center rounded-md p-2 text-success hover:bg-accent transition-colors"
                            title="Apply"
                          >
                            <Check className="size-4" />
                          </a>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex items-center justify-center rounded-md p-2",
                              job.status === "Applied"
                                ? "text-success opacity-50 cursor-not-allowed"
                                : "text-muted-foreground opacity-30 cursor-not-allowed"
                            )}
                          >
                            <Check className="size-4" />
                          </span>
                        )}

                        {/* Skip */}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Skip"
                          disabled={actionId === job.id || job.status === "Skipped"}
                          className="text-muted-foreground"
                          onClick={() => handleSkip(job)}
                        >
                          <X className="size-4" />
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          disabled={actionId === job.id}
                          className="text-muted-foreground hover:text-danger"
                          onClick={() => handleDelete(job)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        {!loading && filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {jobs.length === 0
              ? "No jobs yet. Click Run Scraper to fetch jobs."
              : "No jobs match your filters."}
          </p>
        )}
      </ScrollArea>

      {!loading && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {jobs.length} jobs
          {filtered.length > 0 && " — sorted by match score"}
        </p>
      )}
    </Card>
  )
}