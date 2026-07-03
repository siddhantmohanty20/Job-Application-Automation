import { useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { CompanyAvatar } from "@/components/shared-badges"
import {
  fetchPendingEmails,
  fetchSentEmails,
  fetchEmailStats,
  updateEmailContent,
  cancelEmail,
  type Email,
  type EmailStats,
} from "@/lib/emails-api"
import { cn } from "@/lib/utils"
import {
  Mail, Send, Eye, MessageSquare, Clock,
  Edit2, X, Save, Loader2, RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

const statusStyles: Record<string, string> = {
  Pending: "bg-warning/15 text-warning border-warning/30",
  Sent: "bg-info/15 text-info border-info/30",
  Delivered: "bg-info/15 text-info border-info/30",
  Opened: "bg-success/15 text-success border-success/30",
  Replied: "bg-success/15 text-success border-success/30",
  Failed: "bg-danger/15 text-danger border-danger/30",
}

function MetricCard({
  label, value, icon: Icon, tone,
}: { label: string; value: number; icon: typeof Mail; tone: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", tone)}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  )
}

function EmailPreviewModal({
  email, onClose, onSaved,
}: { email: Email; onClose: () => void; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [subject, setSubject] = useState(email.subject)
  const [body, setBody] = useState(email.body)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await updateEmailContent(email.id, { subject, body })
      toast.success("Email updated")
      setEditing(false)
      onSaved()
    } catch (e) {
      toast.error("Failed to save", {
        description: e instanceof Error ? e.message : "Unknown error",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Email Preview</h3>
            <p className="text-sm text-muted-foreground">{email.linkedJob}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">To</span>
            <span className="text-foreground">
              {email.recruiterName} &lt;{email.recruiterEmail}&gt;
            </span>
          </div>

          {editing ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Subject</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Body</label>
                <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-sm" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  Save Changes
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Subject</span>
                <span className="text-sm font-medium text-foreground">{email.subject}</span>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-4">
                <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">{email.body}</pre>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="w-fit gap-1.5">
                <Edit2 className="size-3.5" /> Edit
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function EmailCard({
  email, onPreview, onCancel,
}: { email: Email; onPreview: () => void; onCancel: () => void }) {
  return (
    <Card className="flex flex-col gap-3 p-4 transition-colors hover:bg-accent/30">
      <div className="flex items-start gap-3">
        <CompanyAvatar name={email.company} size="sm" />
        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
          <span className="truncate text-sm font-medium text-foreground">{email.recruiterName || "Unknown recruiter"}</span>
          <span className="truncate text-xs text-muted-foreground">{email.linkedJob}</span>
          <span className="truncate text-xs text-muted-foreground">{email.subject}</span>
        </div>
        <Badge variant="outline" className={cn("shrink-0 font-medium", statusStyles[email.status])}>
          {email.status}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-2">
        {email.status === "Pending" && email.scheduledFor && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {new Date(email.scheduledFor).toLocaleString(undefined, {
              month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
            })}
          </span>
        )}
        {email.status !== "Pending" && email.sentAt && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Send className="size-3" />
            Sent {new Date(email.sentAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
        <div className="ml-auto flex gap-1.5">
          <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onPreview}>
            <Eye className="size-3" /> Preview
          </Button>
          {email.status === "Pending" && (
            <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs text-danger hover:text-danger" onClick={onCancel}>
              <X className="size-3" /> Cancel
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export function EmailOutreach() {
  const [pending, setPending] = useState<Email[]>([])
  const [sent, setSent] = useState<Email[]>([])
  const [stats, setStats] = useState<EmailStats>({ drafted: 0, sent: 0, opened: 0, replied: 0 })
  const [loading, setLoading] = useState(true)
  const [previewEmail, setPreviewEmail] = useState<Email | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, s, st] = await Promise.all([
        fetchPendingEmails(),
        fetchSentEmails(),
        fetchEmailStats(),
      ])
      setPending(p)
      setSent(s)
      setStats(st)
    } catch (e) {
      toast.error("Failed to load emails", {
        description: e instanceof Error ? e.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCancel(id: string) {
    try {
      await cancelEmail(id)
      setPending((prev) => prev.filter((e) => e.id !== id))
      toast.success("Email cancelled")
    } catch (e) {
      toast.error("Failed to cancel", {
        description: e instanceof Error ? e.message : "Unknown error",
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {previewEmail && (
        <EmailPreviewModal
          email={previewEmail}
          onClose={() => setPreviewEmail(null)}
          onSaved={() => { load(); }}
        />
      )}

      <div className="flex items-center justify-between">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Drafted" value={stats.drafted} icon={Mail} tone="bg-info/15 text-info" />
          <MetricCard label="Sent" value={stats.sent} icon={Send} tone="bg-success/15 text-success" />
          <MetricCard label="Opened" value={stats.opened} icon={Eye} tone="bg-warning/15 text-warning" />
          <MetricCard label="Replied" value={stats.replied} icon={MessageSquare} tone="bg-chart-5/15 text-chart-5" />
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="ml-3 gap-2">
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">Pending Emails</h2>
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : pending.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 p-10 text-center">
            <Mail className="size-7 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No pending emails</p>
            <p className="text-xs text-muted-foreground">
              Find a recruiter and draft a cold email from any application to see it here.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pending.map((email) => (
              <EmailCard
                key={email.id}
                email={email}
                onPreview={() => setPreviewEmail(email)}
                onCancel={() => handleCancel(email.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">Sent Emails</h2>
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : sent.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 p-10 text-center">
            <Send className="size-7 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No emails sent yet</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sent.map((email) => (
              <EmailCard
                key={email.id}
                email={email}
                onPreview={() => setPreviewEmail(email)}
                onCancel={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}