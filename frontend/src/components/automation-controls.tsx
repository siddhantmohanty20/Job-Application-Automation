/**
 * automation-controls.tsx
 * Manual trigger buttons for the dashboard.
 * Full automation is controlled by the header button in app-shell.tsx.
 */

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  triggerScraper,
  triggerMatcher,
  triggerGapAnalysis,
} from "@/lib/automation-api"
import { cn } from "@/lib/utils"
import { Search, Brain, Loader2 } from "lucide-react"
import { toast } from "sonner"

type RunState = "idle" | "running"

export function AutomationControls() {
  const [scraperState, setScraperState] = useState<RunState>("idle")
  const [matcherState, setMatcherState] = useState<RunState>("idle")

  async function handleScraper() {
    setScraperState("running")
    try {
      await triggerScraper()
      toast.success("Scraper started!", {
        description: "Jobs will appear in 1-2 minutes.",
      })
    } catch {
      toast.error("Failed to start scraper", {
        description: "Make sure the worker server is running.",
      })
    } finally {
      setScraperState("idle")
    }
  }

  async function handleMatcher() {
    setMatcherState("running")
    try {
      await triggerMatcher()
      toast.success("Matcher started!", {
        description: "Match scores will update in 1-2 minutes.",
      })
    } catch {
      toast.error("Failed to start matcher", {
        description: "Make sure the worker server is running.",
      })
    } finally {
      setMatcherState("idle")
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-foreground">Manual Controls</h2>
          <p className="text-xs text-muted-foreground">
            Trigger individual workers — use the header button for full automation
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Run Scraper */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={scraperState === "running"}
            onClick={handleScraper}
          >
            {scraperState === "running"
              ? <Loader2 className="size-3.5 animate-spin" />
              : <Search className="size-3.5" />}
            {scraperState === "running" ? "Scraping..." : "Run Scraper"}
          </Button>

          {/* Run Matcher */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={matcherState === "running"}
            onClick={handleMatcher}
          >
            {matcherState === "running"
              ? <Loader2 className="size-3.5 animate-spin" />
              : <Brain className="size-3.5" />}
            {matcherState === "running" ? "Matching..." : "Run Matcher"}
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ── Analyze Gap button for jobs table ─────────────────────────

export function AnalyzeGapButton({
  jobId,
  company,
  role,
}: {
  jobId: string
  company: string
  role: string
}) {
  const [state, setState] = useState<RunState>("idle")

  async function handleAnalyze() {
    setState("running")
    try {
      await triggerGapAnalysis(jobId)
      toast.success("Gap analysis started!", {
        description: `${role} at ${company} — check Resume Vault in ~30 seconds.`,
      })
    } catch {
      toast.error("Failed to start gap analysis", {
        description: "Make sure the worker server is running.",
      })
    } finally {
      setState("idle")
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Analyze keyword gap"
      title="Analyze keyword gap"
      disabled={state === "running"}
      className={cn(state === "running" && "opacity-50")}
      onClick={handleAnalyze}
    >
      {state === "running"
        ? <Loader2 className="size-4 animate-spin" />
        : <Brain className="size-4" />}
    </Button>
  )
}