import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { TagsInput } from "@/components/settings/tags-input"
import { useAutomation } from "@/context/automation-context"
import { useAuth } from "@/context/auth-context"
import { fetchSettings, saveSettings, type AppSettings, defaultSettings } from "@/lib/settings-api"
import { Eye, EyeOff, Trash2, PauseCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

const PLATFORMS = ["LinkedIn", "Indeed", "Greenhouse", "Lever", "Wellfound", "Adzuna"]

function SectionCard({ title, description, children }: {
  title: string; description: string; children: React.ReactNode
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

function ApiKeyInput({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10 font-mono"
          placeholder="Enter key..."
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

function PlatformChecks({ selected, onToggle }: {
  selected: string[]; onToggle: (p: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {PLATFORMS.map((p) => (
        <label key={p} className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-sm transition-colors hover:bg-accent/40">
          <Checkbox checked={selected.includes(p)} onCheckedChange={() => onToggle(p)} />
          <span className="text-foreground">{p}</span>
        </label>
      ))}
    </div>
  )
}

export function SettingsForm() {
  const { user } = useAuth()
  const { active, setActive } = useAutomation()
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchSettings(user.id)
      .then(setSettings)
      .catch(() => toast.error("Could not load settings"))
      .finally(() => setLoading(false))
  }, [user])

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  function toggle(key: "platformsToScrape" | "autoApplyPlatforms", item: string) {
    const list = settings[key]
    set(key, list.includes(item) ? list.filter((p) => p !== item) : [...list, item])
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    const { error } = await saveSettings(user.id, settings)
    if (error) {
      toast.error("Failed to save settings", { description: error })
    } else {
      toast.success("Settings saved", { description: "Your preferences have been updated." })
    }
    setSaving(false)
  }

  async function handleReset() {
    if (!user) return
    const confirmed = window.confirm(
      "This will permanently delete all jobs, applications, emails and logs. Are you sure?"
    )
    if (!confirmed) return
    await Promise.all([
      supabase.from("jobs").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("applications").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("emails").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("activity_log").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("tailored_resumes").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    ])
    toast.success("All data reset successfully")
  }

  if (loading) {
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="mb-4 h-5 w-40" />
            <div className="flex flex-col gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <SectionCard title="Job Preferences" description="What roles and locations to target">
        <div className="flex flex-col gap-2">
          <Label>Target Roles</Label>
          <TagsInput value={settings.targetRoles} onChange={(v) => set("targetRoles", v)}
            placeholder="Add a role and press Enter" />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Preferred Locations</Label>
          <TagsInput value={settings.preferredLocations} onChange={(v) => set("preferredLocations", v)}
            placeholder="Add a location and press Enter" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label>Minimum Match Score Threshold</Label>
            <span className="text-sm font-semibold tabular-nums text-primary">{settings.minMatchScore}%</span>
          </div>
          <Slider value={[settings.minMatchScore]}
            onValueChange={(v) => set("minMatchScore", v[0])} min={50} max={95} step={1} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Platforms to Scrape</Label>
          <PlatformChecks selected={settings.platformsToScrape}
            onToggle={(p) => toggle("platformsToScrape", p)} />
        </div>
      </SectionCard>

      <SectionCard title="Application Settings" description="Control how applications are submitted">
        <div className="flex flex-col gap-2 sm:max-w-xs">
          <Label>Max Applications Per Day</Label>
          <Input type="number" value={settings.maxApplicationsPerDay} min={1}
            onChange={(e) => set("maxApplicationsPerDay", Number(e.target.value))} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Auto-Apply</p>
            <p className="text-xs text-muted-foreground">Submit applications automatically for matched jobs</p>
          </div>
          <Switch checked={settings.autoApply} onCheckedChange={(v) => set("autoApply", v)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Platforms to Auto-Apply On</Label>
          <PlatformChecks selected={settings.autoApplyPlatforms}
            onToggle={(p) => toggle("autoApplyPlatforms", p)} />
        </div>
      </SectionCard>

      <SectionCard title="Email Settings" description="Cold outreach configuration">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Max Cold Emails Per Day</Label>
            <Input type="number" value={settings.maxEmailsPerDay} min={0}
              onChange={(e) => set("maxEmailsPerDay", Number(e.target.value))} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Cooldown to Same Company (days)</Label>
            <Input type="number" value={settings.emailCooldownDays} min={0}
              onChange={(e) => set("emailCooldownDays", Number(e.target.value))} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Email Sending Window</Label>
          <div className="flex items-center gap-2">
            <Input type="time" value={settings.emailWindowStart} className="w-auto"
              onChange={(e) => set("emailWindowStart", e.target.value)} />
            <span className="text-sm text-muted-foreground">to</span>
            <Input type="time" value={settings.emailWindowEnd} className="w-auto"
              onChange={(e) => set("emailWindowEnd", e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Email Signature</Label>
          <Textarea rows={4} value={settings.emailSignature}
            onChange={(e) => set("emailSignature", e.target.value)}
            placeholder={"Best,\nYour Name\nYour Title\nyour@email.com"} />
        </div>
      </SectionCard>

      <SectionCard title="API Keys" description="Credentials used by the automation engine">
        <ApiKeyInput label="OpenAI API Key" value={settings.geminiApiKey}
          onChange={(v) => set("geminiApiKey", v)} />
        <ApiKeyInput label="Hunter.io API Key" value={settings.hunterApiKey}
          onChange={(v) => set("hunterApiKey", v)} />
        <ApiKeyInput label="Google Sheets Spreadsheet ID" value={settings.sheetsSpreadsheetId}
          onChange={(v) => set("sheetsSpreadsheetId", v)} />
      </SectionCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary/90">
          {saving ? <><Loader2 className="size-4 animate-spin mr-2" />Saving...</> : "Save Changes"}
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
            <Button variant="outline" className="gap-2" onClick={() => {
              setActive(false)
              toast("Automation paused")
            }}>
              <PauseCircle className="size-4" /> Pause Automation
            </Button>
          </div>
          <Separator />
          <div className="flex flex-col gap-3 rounded-lg border border-danger/30 bg-danger/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Reset All Data</p>
              <p className="text-xs text-muted-foreground">Delete all jobs, applications, resumes, and emails</p>
            </div>
            <Button variant="destructive" className="gap-2" onClick={handleReset}>
              <Trash2 className="size-4" /> Reset All Data
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}