"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { syncLog, columnMapping } from "@/lib/data"
import { cn } from "@/lib/utils"
import { CheckCircle2, RefreshCw, Table as TableIcon, ArrowRight } from "lucide-react"
import { toast } from "sonner"

export function SheetsSync() {
  const [connected] = useState(true)
  const [syncing, setSyncing] = useState(false)

  function syncNow() {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      toast("Sync complete", { description: "23 rows updated in Google Sheets." })
    }, 1200)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Connection status */}
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-11 items-center justify-center rounded-lg",
              connected ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
            )}
          >
            <TableIcon className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Google Sheets</span>
              <Badge
                variant="outline"
                className={cn(
                  "font-medium",
                  connected
                    ? "bg-success/15 text-success border-success/30"
                    : "bg-danger/15 text-danger border-danger/30",
                )}
              >
                {connected ? "Connected" : "Not connected"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {connected
                ? "Job Tracker 2026 · last synced Today, 2:02 PM"
                : "Connect to start syncing your pipeline"}
            </p>
          </div>
        </div>
        {connected ? (
          <Button onClick={syncNow} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <RefreshCw className={cn("size-4", syncing && "animate-spin")} /> Sync Now
          </Button>
        ) : (
          <Button className="gap-2 bg-success text-white hover:bg-success/90">
            Connect Google Sheets
          </Button>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sync log */}
        <Card className="flex flex-col gap-1 p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-foreground">Sync Log</h2>
          <p className="mb-3 text-sm text-muted-foreground">Recent synchronization events</p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Rows Updated</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLog.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="whitespace-nowrap font-mono text-sm text-muted-foreground">
                      {event.timestamp}
                    </TableCell>
                    <TableCell className="tabular-nums text-foreground">{event.rows}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-medium",
                          event.status === "success"
                            ? "bg-success/15 text-success border-success/30"
                            : "bg-danger/15 text-danger border-danger/30",
                        )}
                      >
                        {event.status === "success" ? "Success" : "Error"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Column mapping */}
        <Card className="flex flex-col gap-1 p-5">
          <h2 className="text-base font-semibold text-foreground">Column Mapping</h2>
          <p className="mb-3 text-sm text-muted-foreground">App fields → sheet columns</p>
          <div className="flex flex-col gap-2">
            {columnMapping.map((m) => (
              <div
                key={m.field}
                className="flex items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-sm"
              >
                <span className="flex-1 font-medium text-foreground">{m.field}</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
                <span className="flex-1 text-right text-muted-foreground">{m.column}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-success" />
            Mapping is read-only and managed by the sync config.
          </div>
        </Card>
      </div>
    </div>
  )
}
