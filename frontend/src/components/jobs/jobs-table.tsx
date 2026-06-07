"use client"

import { useMemo, useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { CompanyAvatar, MatchBadge, PlatformBadge } from "@/components/shared-badges"
import { jobs as allJobs, type Job } from "@/lib/data"
import { cn } from "@/lib/utils"
import { Search, RefreshCw, ExternalLink, Check, X } from "lucide-react"
import { toast } from "sonner"

function StatusBadge({ status }: { status: Job["status"] }) {
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
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [platform, setPlatform] = useState("all")
  const [score, setScore] = useState("all")
  const [status, setStatus] = useState("all")

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900)
    return () => clearTimeout(t)
  }, [])

  const filtered = useMemo(() => {
    return allJobs.filter((j) => {
      if (
        search &&
        !`${j.company} ${j.role} ${j.location}`.toLowerCase().includes(search.toLowerCase())
      )
        return false
      if (platform !== "all" && j.platform !== platform) return false
      if (status !== "all" && j.status !== status) return false
      if (score === "high" && j.match < 80) return false
      if (score === "mid" && (j.match < 60 || j.match >= 80)) return false
      if (score === "low" && j.match >= 60) return false
      return true
    })
  }, [search, platform, score, status])

  function refresh() {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast("Jobs refreshed", { description: "Scraped the latest postings." })
    }, 900)
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
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
          <Select value={platform} onValueChange={setPlatform}>
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
          <Select value={score} onValueChange={setScore}>
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
          <Select value={status} onValueChange={setStatus}>
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
          <Button onClick={refresh} variant="outline" className="col-span-2 gap-2 sm:col-span-1 lg:w-auto">
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh Jobs
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
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
              ? Array.from({ length: 6 }).map((_, i) => (
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
                    <TableCell className="text-foreground">{job.role}</TableCell>
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
                        <Button variant="ghost" size="icon" aria-label="View" title="View">
                          <ExternalLink className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Apply"
                          title="Apply"
                          className="text-success hover:text-success"
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Skip"
                          title="Skip"
                          className="text-muted-foreground"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        {!loading && filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No jobs match your filters.
          </p>
        )}
      </div>
    </Card>
  )
}
