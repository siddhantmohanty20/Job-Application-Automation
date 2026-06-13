import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CompanyAvatar } from "@/components/shared-badges"
import { useProfile } from "@/context/profile-context"
import { useAuth } from "@/context/auth-context"
import {
  uploadMasterResume,
  fetchTailoredResumes,
  getMasterResumeUrl,
  type TailoredResume,
} from "@/lib/resume-api"
import { upsertProfile } from "@/lib/profile-api"
import { cn } from "@/lib/utils"
import {
  UploadCloud, FileText, ExternalLink,
  Sparkles, Loader2, AlertTriangle,
  CheckCircle2, ArrowRight, Target, Lightbulb,
  X,
} from "lucide-react"
import { toast } from "sonner"

// ── gap analysis types ────────────────────────────────────────

type GapAnalysis = {
  missingKeywords: string[]
  missingSkills: string[]
  presentKeywords: string[]
  suggestions: string[]
  overallFit: string
  estimatedScoreIfFixed: number
  priorityActions: string[]
}

// ── gap analysis modal ────────────────────────────────────────

function GapModal({
  resume,
  onClose,
}: {
  resume: TailoredResume
  onClose: () => void
}) {
  let analysis: GapAnalysis | null = null
  try {
    analysis = JSON.parse(resume.content)
  } catch {
    analysis = null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Gap Analysis — {resume.role}
            </h3>
            <p className="text-sm text-muted-foreground">{resume.company} · {resume.dateGenerated}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5 p-5">
          {/* score */}
          <div className="flex items-center gap-4 rounded-lg border border-border bg-background/40 p-4">
            <Target className="size-5 text-muted-foreground shrink-0" />
            <div className="flex flex-1 items-center gap-3">
              <span className="text-2xl font-bold tabular-nums text-foreground">{resume.matchBefore}%</span>
              <ArrowRight className="size-4 text-muted-foreground" />
              <span className="text-2xl font-bold tabular-nums text-success">{resume.matchAfter}%</span>
              <span className="text-sm text-muted-foreground">estimated after fixes</span>
            </div>
          </div>

          {/* overall fit */}
          {analysis?.overallFit && (
            <div className="rounded-lg border border-info/30 bg-info/10 p-3 text-sm text-info">
              {analysis.overallFit}
            </div>
          )}

          {/* priority actions */}
          {analysis?.priorityActions && analysis.priorityActions.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Lightbulb className="size-4 text-warning" />
                <h4 className="text-sm font-semibold text-foreground">Priority Actions</h4>
              </div>
              <div className="flex flex-col gap-2">
                {analysis.priorityActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-warning/20 text-xs font-bold text-warning">
                      {i + 1}
                    </span>
                    <span className="text-sm text-foreground">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* missing keywords */}
          {analysis?.missingKeywords && analysis.missingKeywords.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="size-4 text-danger" />
                <h4 className="text-sm font-semibold text-foreground">
                  Missing Keywords ({analysis.missingKeywords.length})
                </h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.missingKeywords.map((k) => (
                  <Badge key={k} variant="outline" className="border-danger/40 bg-danger/10 text-danger">
                    {k}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* missing skills */}
          {analysis?.missingSkills && analysis.missingSkills.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="size-4 text-warning" />
                <h4 className="text-sm font-semibold text-foreground">
                  Skills to Add ({analysis.missingSkills.length})
                </h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.missingSkills.map((s) => (
                  <Badge key={s} variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* present keywords */}
          {analysis?.presentKeywords && analysis.presentKeywords.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-success" />
                <h4 className="text-sm font-semibold text-foreground">
                  Keywords Already Present ({analysis.presentKeywords.length})
                </h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.presentKeywords.map((k) => (
                  <Badge key={k} variant="outline" className="border-success/40 bg-success/10 text-success">
                    {k}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* suggestions */}
          {analysis?.suggestions && analysis.suggestions.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Suggestions</h4>
              <ul className="flex flex-col gap-1.5">
                {analysis.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* fallback if not parsed */}
          {!analysis && (
            <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-4 text-xs text-foreground font-mono">
              {resume.content}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────

export function ResumeVault() {
  const { profile, update } = useProfile()
  const { user } = useAuth()
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [analyses, setAnalyses] = useState<TailoredResume[]>([])
  const [loadingAnalyses, setLoadingAnalyses] = useState(true)
  const [activeAnalysis, setActiveAnalysis] = useState<TailoredResume | null>(null)
  const [resumeUrl, setResumeUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchTailoredResumes()
      .then(setAnalyses)
      .catch(() => toast.error("Could not load gap analyses"))
      .finally(() => setLoadingAnalyses(false))
  }, [])

  useEffect(() => {
    if (!user || !profile.resume) return
    getMasterResumeUrl(user.id).then(setResumeUrl)
  }, [user, profile.resume])

  const handleUpload = useCallback(
    async (file: File) => {
      if (!user) return
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large", { description: "Max 5MB allowed." })
        return
      }
      setUploading(true)
      try {
        const { path, error } = await uploadMasterResume(file, user.id)
        if (error) { toast.error("Upload failed", { description: error }); return }
        update((d) => ({
          ...d,
          resume: {
            fileName: file.name,
            uploadedAt: new Date().toISOString().slice(0, 10),
            size: `${Math.round(file.size / 1024)} KB`,
          },
        }))
        await upsertProfile(user.id, {
          ...profile,
          resume: {
            fileName: file.name,
            uploadedAt: new Date().toISOString().slice(0, 10),
            size: `${Math.round(file.size / 1024)} KB`,
          },
        })
        const url = await getMasterResumeUrl(user.id)
        setResumeUrl(url)
        toast.success("Resume uploaded!", { description: file.name })
      } catch (e) {
        toast.error("Upload failed", { description: e instanceof Error ? e.message : "Unknown" })
      } finally {
        setUploading(false)
      }
    },
    [user, profile, update]
  )

  async function handleParse() {
    if (!profile.resume) { toast.error("Upload a resume first"); return }
    setParsing(true)
    setTimeout(() => {
      setParsing(false)
      toast.success("Resume analysis ready", {
        description: "Skills and keywords are pulled from your Profile page.",
      })
    }, 1500)
  }

  const skills = profile.technicalSkills.map((s) => s.name)
  const keywords = [...new Set([
    ...profile.softSkills,
    ...profile.technicalSkills.slice(0, 8).map((s) => s.name),
  ])]

  return (
    <>
      {activeAnalysis && (
        <GapModal resume={activeAnalysis} onClose={() => setActiveAnalysis(null)} />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Upload + Analysis */}
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="mb-3 text-base font-semibold text-foreground">Master Resume</h2>
            <label
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragging(false)
                const f = e.dataTransfer.files?.[0]
                if (f) handleUpload(f)
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                dragging ? "border-primary bg-primary/5" : "border-border bg-background/40 hover:bg-accent/20"
              )}
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                {uploading ? <Loader2 className="size-6 animate-spin" /> : <UploadCloud className="size-6" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {uploading ? "Uploading..." : "Drag & drop your resume here"}
                </p>
                <p className="text-xs text-muted-foreground">PDF or DOCX, up to 5MB</p>
              </div>
              {!uploading && <Button variant="outline" size="sm" type="button" onClick={(e) => e.preventDefault()}>Browse files</Button>}
              <input type="file" accept=".pdf,.docx" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
            </label>

            {profile.resume && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <FileText className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{profile.resume.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {profile.resume.uploadedAt} · {profile.resume.size}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {resumeUrl && (
                    <a href={resumeUrl} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
                      <ExternalLink className="size-3" /> View
                    </a>
                  )}
                  <label className="cursor-pointer rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
                    Replace
                    <input type="file" accept=".pdf,.docx" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
                  </label>
                </div>
              </div>
            )}

            <Button
              className={cn("mt-3 gap-2 text-white",
                parsing ? "bg-muted text-muted-foreground"
                  : "bg-gradient-to-r from-primary to-chart-5 hover:opacity-90")}
              disabled={parsing || !profile.resume}
              onClick={handleParse}
            >
              {parsing
                ? <><Loader2 className="size-4 animate-spin" /> Analyzing...</>
                : <><Sparkles className="size-4" /> Analyze Resume</>}
            </Button>
          </Card>

          {/* Resume analysis from profile */}
          <Card className="p-5">
            <h2 className="text-base font-semibold text-foreground">Profile Analysis</h2>
            <p className="mb-4 text-sm text-muted-foreground">Based on your saved profile</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <p className="text-2xl font-semibold text-foreground">
                  {profile.experience.length > 0
                    ? profile.experience.reduce((acc, e) => {
                        const start = parseInt(e.startYear || "0", 10)
                        const end = e.current ? new Date().getFullYear() : parseInt(e.endYear || "0", 10)
                        return acc + Math.max(0, end - start)
                      }, 0)
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">years experience</p>
              </div>
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <p className="text-2xl font-semibold text-foreground">{skills.length || "—"}</p>
                <p className="text-xs text-muted-foreground">skills listed</p>
              </div>
            </div>

            {skills.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Technical Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <Badge key={s} variant="outline" className="border-border bg-muted/50 font-normal">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {keywords.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Key Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.slice(0, 12).map((k) => (
                    <Badge key={k} className="bg-primary/15 text-primary hover:bg-primary/15">{k}</Badge>
                  ))}
                </div>
              </div>
            )}

            {skills.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Fill in your Skills section in Profile to see analysis here.
              </p>
            )}
          </Card>
        </div>

        {/* Right: Gap analyses */}
        <Card className="flex flex-col gap-1 p-5">
          <h2 className="text-base font-semibold text-foreground">Job Gap Analyses</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            AI-powered keyword gap analysis per job — click to see what to add
          </p>
          <div className="flex flex-col gap-3">
            {loadingAnalyses ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-3 w-28 mb-3" />
                  <Skeleton className="h-8 w-36" />
                </div>
              ))
            ) : analyses.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <Target className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">No gap analyses yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Apply to jobs and run the analyzer worker to see keyword gaps for each role.
                </p>
                <div className="mt-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs font-mono text-muted-foreground">
                  node src/tailor.js &lt;job-id&gt;
                </div>
              </div>
            ) : (
              analyses.map((r) => {
                let missingCount = 0
                try {
                  const parsed = JSON.parse(r.content)
                  missingCount = parsed.missingKeywords?.length ?? 0
                } catch { /* ignore */ }

                return (
                  <div key={r.id}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-4 transition-colors hover:bg-accent/40">
                    <div className="flex items-center gap-3">
                      <CompanyAvatar name={r.company} size="sm" />
                      <div className="flex flex-1 flex-col min-w-0">
                        <span className="truncate font-medium text-foreground">{r.role}</span>
                        <span className="text-sm text-muted-foreground">{r.company} · {r.dateGenerated}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {missingCount > 0 && (
                          <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning text-xs">
                            {missingCount} missing
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <span className="text-muted-foreground tabular-nums">{r.matchBefore}%</span>
                          <ArrowRight className="size-3 text-muted-foreground" />
                          <span className="text-success tabular-nums">{r.matchAfter}%</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{r.changesSummary}</p>
                    <Button variant="outline" size="sm" className="gap-1.5 self-start"
                      onClick={() => setActiveAnalysis(r)}>
                      <Target className="size-3.5" /> View Gap Analysis
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>
    </>
  )
}