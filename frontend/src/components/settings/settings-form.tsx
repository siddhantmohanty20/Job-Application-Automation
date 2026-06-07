"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { TagsInput } from "@/components/settings/tags-input"
import { useAutomation } from "@/context/automation-context"
import { Eye, EyeOff, Trash2, PauseCircle } from "lucide-react"
import { toast } from "sonner"

const PLATFORMS = ["LinkedIn", "Indeed", "Greenhouse", "Lever", "Wellfound", "Adzuna"]

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </Card>
  )
}

function ApiKeyInput({ label, defaultValue }: { label: string; defaultValue: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          defaultValue={defaultValue}
          className="pr-10 font-mono"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Hide" : "Show"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  )
}

function PlatformChecks({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (p: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {PLATFORMS.map((p) => (
        <label
          key={p}
          className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-sm transition-colors hover:bg-accent/40"
        >
          <Checkbox
            checked={selected.includes(p)}
            onCheckedChange={() => onToggle(p)}
          />
          <span className="text-foreground">{p}</span>
        </label>
      ))}
    </div>
  )
}

export function SettingsForm() {
  const { setActive } = useAutomation()
  const [roles, setRoles] = useState(["Frontend Engineer", "Full-Stack Engineer", "Software Engineer"])
  const [locations, setLocations] = useState(["Remote", "San Francisco", "New York"])
  const [threshold, setThreshold] = useState([75])
  const [scrapePlatforms, setScrapePlatforms] = useState([
    "LinkedIn",
    "Greenhouse",
    "Lever",
  ])
  const [applyPlatforms, setApplyPlatforms] = useState(["LinkedIn", "Greenhouse"])
  const [autoApply, setAutoApply] = useState(true)

  function toggle(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((p) => p !== item) : [...list, item])
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <SectionCard title="Job Preferences" description="What roles and locations to target">
        <div className="flex flex-col gap-2">
          <Label>Target Roles</Label>
          <TagsInput value={roles} onChange={setRoles} placeholder="Add a role and press Enter" />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Preferred Locations</Label>
          <TagsInput value={locations} onChange={setLocations} placeholder="Add a location and press Enter" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label>Minimum Match Score Threshold</Label>
            <span className="text-sm font-semibold tabular-nums text-primary">{threshold[0]}%</span>
          </div>
          <Slider value={threshold} onValueChange={setThreshold} min={50} max={95} step={1} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Platforms to Scrape</Label>
          <PlatformChecks
            selected={scrapePlatforms}
            onToggle={(p) => toggle(scrapePlatforms, setScrapePlatforms, p)}
          />
        </div>
      </SectionCard>

      <SectionCard title="Application Settings" description="Control how applications are submitted">
        <div className="flex flex-col gap-2 sm:max-w-xs">
          <Label>Max Applications Per Day</Label>
          <Input type="number" defaultValue={30} min={1} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Auto-Apply</p>
            <p className="text-xs text-muted-foreground">Submit applications automatically for matched jobs</p>
          </div>
          <Switch checked={autoApply} onCheckedChange={setAutoApply} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Platforms to Auto-Apply On</Label>
          <PlatformChecks
            selected={applyPlatforms}
            onToggle={(p) => toggle(applyPlatforms, setApplyPlatforms, p)}
          />
        </div>
      </SectionCard>

      <SectionCard title="Email Settings" description="Cold outreach configuration">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Max Cold Emails Per Day</Label>
            <Input type="number" defaultValue={5} min={0} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Cooldown to Same Company (days)</Label>
            <Input type="number" defaultValue={14} min={0} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Email Sending Window</Label>
          <div className="flex items-center gap-2">
            <Input type="time" defaultValue="09:00" className="w-auto" />
            <span className="text-sm text-muted-foreground">to</span>
            <Input type="time" defaultValue="18:00" className="w-auto" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Email Signature</Label>
          <Textarea
            rows={4}
            defaultValue={"Best,\nAlex Morgan\nSenior Frontend Engineer\nalex.morgan@email.com"}
          />
        </div>
      </SectionCard>

      <SectionCard title="API Keys" description="Credentials used by the automation engine">
        <ApiKeyInput label="Gemini API Key" defaultValue="AIzaSyB-xxxxxxxxxxxxxxxxxxxxxxxx" />
        <ApiKeyInput label="Hunter.io API Key" defaultValue="hunter-xxxxxxxxxxxxxxxxxxxxxxxx" />
        <ApiKeyInput label="Google Sheets Spreadsheet ID" defaultValue="1aBcD-xxxxxxxxxxxxxxxxxxxxxxxx" />
      </SectionCard>

      <div className="flex justify-end">
        <Button
          onClick={() => toast("Settings saved", { description: "Your preferences have been updated." })}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Save Changes
        </Button>
      </div>

      <Card className="border-danger/30 p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-danger">Danger Zone</h2>
          <p className="text-sm text-muted-foreground">Irreversible and disruptive actions</p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Pause All Automation</p>
              <p className="text-xs text-muted-foreground">Halt scraping, applying, and email outreach</p>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setActive(false)
                toast("Automation paused")
              }}
            >
              <PauseCircle className="size-4" /> Pause Automation
            </Button>
          </div>
          <Separator />
          <div className="flex flex-col gap-3 rounded-lg border border-danger/30 bg-danger/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Reset All Data</p>
              <p className="text-xs text-muted-foreground">Delete all jobs, applications, resumes, and emails</p>
            </div>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => toast.error("This would permanently delete all data", { description: "Disabled in demo mode." })}
            >
              <Trash2 className="size-4" /> Reset All Data
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
