"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CompanyAvatar } from "@/components/shared-badges"
import { tailoredResumes, resumeSkills, resumeKeywords } from "@/lib/data"
import { cn } from "@/lib/utils"
import { UploadCloud, FileText, Download, GitCompare, ArrowRight } from "lucide-react"
import { toast } from "sonner"

export function ResumeVault() {
  const [dragging, setDragging] = useState(false)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left: Upload + Analysis */}
      <div className="flex flex-col gap-6">
        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold text-foreground">Master Resume</h2>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              toast("Resume uploaded", { description: "Alex_Morgan_Resume.pdf processed." })
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border bg-background/40",
            )}
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <UploadCloud className="size-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Drag & drop your resume here
              </p>
              <p className="text-xs text-muted-foreground">PDF or DOCX, up to 5MB</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast("Resume uploaded", { description: "Alex_Morgan_Resume.pdf processed." })}
            >
              Browse files
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-danger/15 text-danger">
              <FileText className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Alex_Morgan_Resume.pdf</p>
              <p className="text-xs text-muted-foreground">Uploaded June 4, 2026 · 248 KB</p>
            </div>
            <Button variant="ghost" size="sm">
              Replace
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-foreground">Resume Analysis</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Extracted from your master resume
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <p className="text-2xl font-semibold text-foreground">6.5</p>
              <p className="text-xs text-muted-foreground">years experience</p>
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <p className="text-2xl font-semibold text-foreground">{resumeSkills.length}</p>
              <p className="text-xs text-muted-foreground">skills detected</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {resumeSkills.map((s) => (
                <Badge key={s} variant="outline" className="border-border bg-muted/50 font-normal">
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Key Keywords
            </p>
            <div className="flex flex-wrap gap-1.5">
              {resumeKeywords.map((k) => (
                <Badge key={k} className="bg-primary/15 text-primary hover:bg-primary/15">
                  {k}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Right: Tailored resumes */}
      <Card className="flex flex-col gap-1 p-5">
        <h2 className="text-base font-semibold text-foreground">Tailored Resumes</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          AI-generated variants optimized per role
        </p>
        <div className="flex flex-col gap-3">
          {tailoredResumes.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-4 transition-colors hover:bg-accent/40"
            >
              <div className="flex items-center gap-3">
                <CompanyAvatar name={r.company} size="sm" />
                <div className="flex flex-1 flex-col">
                  <span className="font-medium text-foreground">{r.role}</span>
                  <span className="text-sm text-muted-foreground">
                    {r.company} · {r.dateGenerated}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="text-muted-foreground tabular-nums">{r.matchBefore}%</span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                  <span className="text-success tabular-nums">{r.matchAfter}%</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="size-3.5" /> Download PDF
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <GitCompare className="size-3.5" /> View Diff
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
