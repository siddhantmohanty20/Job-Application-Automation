"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MetricCard } from "@/components/metric-card"
import { CompanyAvatar } from "@/components/shared-badges"
import { pendingEmails, sentEmails, type Email } from "@/lib/data"
import { cn } from "@/lib/utils"
import { FileEdit, Mail, MailCheck, MailOpen, Reply, Eye, Pencil, Send, X, Clock, Link2 } from "lucide-react"
import { toast } from "sonner"

function EmailPreview({ email }: { email: Email }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Eye className="size-3.5" /> Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{email.subject}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              To: <span className="text-foreground">{email.recruiter}</span> @ {email.company}
            </span>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-4 text-sm leading-relaxed text-foreground whitespace-pre-line">
            {email.body}
          </div>
          <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
            <Link2 className="size-3.5" />
            Linked to: {email.linkedJob}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const statusBadge = {
  Delivered: "bg-muted text-muted-foreground border-border",
  Opened: "bg-info/15 text-info border-info/30",
  Replied: "bg-success/15 text-success border-success/30",
}

export function EmailOutreach() {
  const [pending, setPending] = useState(pendingEmails)

  function removePending(id: string, action: "sent" | "cancelled") {
    setPending((p) => p.filter((e) => e.id !== id))
    toast(action === "sent" ? "Email sent" : "Email cancelled")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Drafted" value="14" subtitle="this week" icon={FileEdit} tone="info" />
        <MetricCard label="Sent" value="9" subtitle="this week" icon={Mail} tone="success" />
        <MetricCard label="Opened" value="6" subtitle="67% open rate" icon={MailOpen} tone="warning" />
        <MetricCard label="Replied" value="3" subtitle="33% reply rate" icon={Reply} tone="success" />
      </div>

      <Card className="flex flex-col gap-1 p-5">
        <h2 className="text-base font-semibold text-foreground">Pending Emails</h2>
        <p className="mb-3 text-sm text-muted-foreground">Queued and scheduled to send</p>
        <div className="flex flex-col gap-3">
          {pending.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No pending emails in the queue.
            </p>
          )}
          {pending.map((email) => (
            <div
              key={email.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-4 transition-colors hover:bg-accent/40 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex items-start gap-3">
                <CompanyAvatar name={email.company} size="sm" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-foreground">
                    {email.recruiter} · {email.company}
                  </span>
                  <span className="text-sm text-muted-foreground line-clamp-1">
                    {email.subject}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" /> {email.scheduledFor}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <EmailPreview email={email} />
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Pencil className="size-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => removePending(email.id, "sent")}
                >
                  <Send className="size-3.5" /> Send Now
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Cancel"
                  className="text-danger hover:text-danger"
                  onClick={() => removePending(email.id, "cancelled")}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-1 p-5">
        <h2 className="text-base font-semibold text-foreground">Sent Emails</h2>
        <p className="mb-3 text-sm text-muted-foreground">Delivered to recruiters</p>
        <div className="flex flex-col gap-3">
          {sentEmails.map((email) => (
            <div
              key={email.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-4 transition-colors hover:bg-accent/40 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex items-start gap-3">
                <CompanyAvatar name={email.company} size="sm" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-foreground">
                    {email.recruiter} · {email.company}
                  </span>
                  <span className="text-sm text-muted-foreground line-clamp-1">
                    {email.subject}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MailCheck className="size-3" /> Sent {email.sentAt}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {email.status && (
                  <Badge
                    variant="outline"
                    className={cn("font-medium", statusBadge[email.status])}
                  >
                    {email.status}
                  </Badge>
                )}
                <EmailPreview email={email} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
