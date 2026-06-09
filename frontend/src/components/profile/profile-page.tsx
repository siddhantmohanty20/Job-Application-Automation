import { useMemo, useState, type ReactNode } from "react";
import { useProfile, SECTION_LABELS, type SectionKey } from "@/context/profile-context";
import {
  INDIAN_STATES,
  NATIONALITIES,
  COUNTRIES,
  COUNTRY_CODES,
  SKILL_SUGGESTIONS,
  newId,
  type SkillLevel,
  type LanguageProficiency,
} from "@/lib/profile-types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TagsInput } from "@/components/settings/tags-input";
import { initials } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Check,
  AlertTriangle,
  Upload,
  Loader2,
  Mail,
  Plus,
  Trash2,
  GripVertical,
  Sparkles,
  FileText,
  X,
  Info,
  Briefcase,
  GraduationCap,
} from "lucide-react";

const TABS: { key: SectionKey; label: string }[] = [
  { key: "personal", label: "Personal" },
  { key: "contact", label: "Contact" },
  { key: "address", label: "Address" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "skills", label: "Skills" },
  { key: "projects", label: "Projects" },
  { key: "links", label: "Links & Resume" },
];

function Req() {
  return <span className="text-danger ml-0.5">*</span>;
}

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm">
        {label}
        {required && <Req />}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ProfilePage() {
  const { profile, update, saveSection, saving, loading, completion, sectionStatus } = useProfile();
  const [tab, setTab] = useState<SectionKey>("personal");
  const [dirty, setDirty] = useState<Record<SectionKey, boolean>>({} as Record<SectionKey, boolean>);

  const fullName = `${profile.personal.firstName} ${profile.personal.lastName}`.trim() || "Your Name";
  const skillsCount = profile.technicalSkills.length + profile.softSkills.length;
  const yearsExp = useMemo(() => {
    const years = profile.experience.reduce((acc, e) => {
      const start = parseInt(e.startYear || "0", 10);
      const end = e.current ? new Date().getFullYear() : parseInt(e.endYear || "0", 10);
      return acc + Math.max(0, end - start);
    }, 0);
    return years;
  }, [profile.experience]);

  function markDirty(key: SectionKey) {
    setDirty((d) => ({ ...d, [key]: true }));
  }

  async function handleSave(key: SectionKey) {
    await saveSection(key);
    setDirty((d) => ({ ...d, [key]: false }));
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-10">
      {/* Left Summary Panel */}
      <aside className="lg:col-span-3">
        <Card className="lg:sticky lg:top-20 flex flex-col gap-5 p-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <Avatar className="size-24 text-2xl">
              <AvatarFallback className="bg-primary/15 text-primary font-semibold">
                {initials(fullName)}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Upload className="size-3.5" /> Upload Photo
            </Button>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{fullName}</h2>
              <input
                value={profile.title}
                onChange={(e) => {
                  update((d) => ({ ...d, title: e.target.value }));
                }}
                className="mt-1 w-full bg-transparent text-center text-sm text-muted-foreground outline-none focus:text-foreground"
                placeholder="Target role"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Profile</span>
              <span className="font-semibold text-success">{completion}% complete</span>
            </div>
            <Progress value={completion} className="h-2 [&>div]:bg-success" />
          </div>

          <div className="grid grid-cols-3 gap-2 border-y border-border py-3 text-center">
            <Stat label="Years Exp" value={yearsExp.toString()} />
            <Stat label="Skills" value={skillsCount.toString()} />
            <Stat label="Projects" value={profile.projects.length.toString()} />
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sections</p>
            {(Object.keys(SECTION_LABELS) as SectionKey[]).map((key) => {
              const ok = sectionStatus[key];
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/40",
                    tab === key && "bg-accent/40 text-foreground",
                  )}
                >
                  <span className="text-foreground">{SECTION_LABELS[key]}</span>
                  {ok ? (
                    <Check className="size-4 text-success" />
                  ) : (
                    <AlertTriangle className="size-4 text-warning" />
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      </aside>

      {/* Right Tabbed Form */}
      <section className="lg:col-span-7">
        <Card className="p-0">
          <Tabs value={tab} onValueChange={(v) => setTab(v as SectionKey)}>
            <div className="overflow-x-auto border-b border-border">
              <TabsList className="h-auto rounded-none bg-transparent p-0">
                {TABS.map((t) => (
                  <TabsTrigger
                    key={t.key}
                    value={t.key}
                    className={cn(
                      "relative gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-sm text-muted-foreground shadow-none",
                      "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none",
                    )}
                  >
                    {t.label}
                    {dirty[t.key] && <span className="size-1.5 rounded-full bg-warning" />}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="personal" className="mt-0">
                <PersonalTab onChange={() => markDirty("personal")} />
                <SectionFooter onSave={() => handleSave("personal")} saving={saving} />
              </TabsContent>
              <TabsContent value="contact" className="mt-0">
                <ContactTab onChange={() => markDirty("contact")} />
                <SectionFooter onSave={() => handleSave("contact")} saving={saving} />
              </TabsContent>
              <TabsContent value="address" className="mt-0">
                <AddressTab onChange={() => markDirty("address")} />
                <SectionFooter onSave={() => handleSave("address")} saving={saving} />
              </TabsContent>
              <TabsContent value="experience" className="mt-0">
                <ExperienceTab onChange={() => markDirty("experience")} />
                <SectionFooter onSave={() => handleSave("experience")} saving={saving} />
              </TabsContent>
              <TabsContent value="education" className="mt-0">
                <EducationTab onChange={() => markDirty("education")} />
                <SectionFooter onSave={() => handleSave("education")} saving={saving} />
              </TabsContent>
              <TabsContent value="skills" className="mt-0">
                <SkillsTab onChange={() => markDirty("skills")} />
                <SectionFooter onSave={() => handleSave("skills")} saving={saving} />
              </TabsContent>
              <TabsContent value="projects" className="mt-0">
                <ProjectsTab onChange={() => markDirty("projects")} />
                <SectionFooter onSave={() => handleSave("projects")} saving={saving} />
              </TabsContent>
              <TabsContent value="links" className="mt-0">
                <LinksTab onChange={() => markDirty("links")} />
                <SectionFooter onSave={() => handleSave("links")} saving={saving} />
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-lg font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function SectionFooter({ onSave, saving }: { onSave: () => void; saving?: boolean }) {
  return (
    <div className="mt-6 flex justify-end border-t border-border pt-4">
      <Button
        onClick={onSave}
        disabled={saving}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {saving ? (
          <><Loader2 className="size-4 animate-spin mr-2" />Saving...</>
        ) : (
          "Save Section"
        )}
      </Button>
    </div>
  );
}

function SearchSelect({
  value, onValueChange, placeholder, options,
}: { value: string; onValueChange: (v: string) => void; placeholder: string; options: string[] }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/* ---------- TAB 1: PERSONAL ---------- */
function PersonalTab({ onChange }: { onChange: () => void }) {
  const { profile, update } = useProfile();
  const p = profile.personal;
  function set<K extends keyof typeof p>(key: K, value: (typeof p)[K]) {
    update((d) => ({ ...d, personal: { ...d.personal, [key]: value } }));
    onChange();
  }
  return (
    <div className="flex flex-col gap-5 border-l-2 border-primary/40 pl-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="First Name" required>
          <Input value={p.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Middle Name">
          <Input value={p.middleName} onChange={(e) => set("middleName", e.target.value)} />
        </Field>
        <Field label="Last Name" required>
          <Input value={p.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
      </div>
      <Field label="Preferred / Display Name" hint="Used in emails and cover letters.">
        <Input value={p.preferredName} onChange={(e) => set("preferredName", e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date of Birth" required>
          <Input type="date" value={p.dob} onChange={(e) => set("dob", e.target.value)} />
        </Field>
        <Field label="Gender">
          <Select value={p.gender} onValueChange={(v) => set("gender", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {["Male", "Female", "Non-binary", "Prefer not to say"].map((g) =>
                <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Nationality">
        <SearchSelect value={p.nationality} onValueChange={(v) => set("nationality", v)} placeholder="Select country" options={NATIONALITIES} />
      </Field>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Label className="text-sm">Legally authorised to work in India?</Label>
          <p className="text-xs text-muted-foreground">Required by most ATS forms.</p>
        </div>
        <Switch checked={p.authorisedToWork} onCheckedChange={(v) => set("authorisedToWork", v)} />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Label className="text-sm">Willing to relocate?</Label>
        <Switch checked={p.willingToRelocate} onCheckedChange={(v) => set("willingToRelocate", v)} />
      </div>
      {p.willingToRelocate && (
        <Field label="Willing to relocate to">
          <TagsInput value={p.relocateTo} onChange={(v) => set("relocateTo", v)} placeholder="Type a city and press Enter" />
        </Field>
      )}
      <Field label="Work preference">
        <div className="flex flex-wrap gap-4">
          {(["On-site", "Hybrid", "Remote"] as const).map((opt) => {
            const checked = p.workPreference.includes(opt);
            return (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => {
                    const next = v ? [...p.workPreference, opt] : p.workPreference.filter((o) => o !== opt);
                    set("workPreference", next);
                  }}
                />
                {opt}
              </label>
            );
          })}
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Notice period" required>
          <Select value={p.noticePeriod} onValueChange={(v) => set("noticePeriod", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {["Immediate", "15 days", "30 days", "60 days", "90 days"].map((o) =>
                <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Expected CTC" required>
          <Input value={p.expectedCtc} onChange={(e) => set("expectedCtc", e.target.value)} placeholder="e.g. 12 LPA" />
        </Field>
        <Field label="Current CTC">
          <Input value={p.currentCtc} onChange={(e) => set("currentCtc", e.target.value)} placeholder="e.g. 8 LPA" />
        </Field>
      </div>
    </div>
  );
}

/* ---------- TAB 2: CONTACT ---------- */
function ContactTab({ onChange }: { onChange: () => void }) {
  const { profile, update } = useProfile();
  const c = profile.contact;
  function set<K extends keyof typeof c>(key: K, value: (typeof c)[K]) {
    update((d) => ({ ...d, contact: { ...d.contact, [key]: value } }));
    onChange();
  }
  return (
    <div className="flex flex-col gap-5 border-l-2 border-primary/40 pl-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Primary Email" required>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" type="email" value={c.primaryEmail} onChange={(e) => set("primaryEmail", e.target.value)} />
          </div>
        </Field>
        <Field label="Secondary Email">
          <Input type="email" value={c.secondaryEmail} onChange={(e) => set("secondaryEmail", e.target.value)} />
        </Field>
      </div>
      <Field label="Mobile Number" required>
        <div className="flex gap-2">
          <Select value={c.countryCode} onValueChange={(v) => set("countryCode", v)}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTRY_CODES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input className="flex-1" value={c.mobile} onChange={(e) => set("mobile", e.target.value)} />
        </div>
      </Field>
      <Field label="Alternate Mobile">
        <Input value={c.altMobile} onChange={(e) => set("altMobile", e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="LinkedIn URL"><Input value={c.linkedin} onChange={(e) => set("linkedin", e.target.value)} /></Field>
        <Field label="GitHub URL"><Input value={c.github} onChange={(e) => set("github", e.target.value)} /></Field>
        <Field label="Portfolio Website"><Input value={c.portfolio} onChange={(e) => set("portfolio", e.target.value)} /></Field>
        <Field label="Twitter / X handle"><Input value={c.twitter} onChange={(e) => set("twitter", e.target.value)} /></Field>
        <Field label="LeetCode"><Input value={c.leetcode} onChange={(e) => set("leetcode", e.target.value)} /></Field>
        <Field label="Codeforces"><Input value={c.codeforces} onChange={(e) => set("codeforces", e.target.value)} /></Field>
        <Field label="GeeksforGeeks"><Input value={c.gfg} onChange={(e) => set("gfg", e.target.value)} /></Field>
      </div>
    </div>
  );
}

/* ---------- TAB 3: ADDRESS ---------- */
function AddressTab({ onChange }: { onChange: () => void }) {
  const { profile, update } = useProfile();
  const cur = profile.currentAddress;
  const perm = profile.permanentAddress;
  const same = profile.permanentSameAsCurrent;
  function setCur<K extends keyof typeof cur>(key: K, value: (typeof cur)[K]) {
    update((d) => ({ ...d, currentAddress: { ...d.currentAddress, [key]: value } }));
    onChange();
  }
  function setPerm<K extends keyof typeof perm>(key: K, value: (typeof perm)[K]) {
    update((d) => ({ ...d, permanentAddress: { ...d.permanentAddress, [key]: value } }));
    onChange();
  }
  return (
    <div className="flex flex-col gap-6 border-l-2 border-primary/40 pl-4">
      <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info/10 p-3 text-sm text-info">
        <Info className="size-4 mt-0.5 shrink-0" />
        <span>This is used to auto-fill address fields in ATS forms. Fill exactly as you want it to appear.</span>
      </div>
      <AddressFieldGroup title="Current Address" addr={cur} onSet={setCur} />
      <div className="border-t border-border pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Permanent Address</h3>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={same}
              onCheckedChange={(v) => {
                update((d) => ({
                  ...d,
                  permanentSameAsCurrent: Boolean(v),
                  permanentAddress: v ? { ...d.currentAddress } : d.permanentAddress,
                }));
                onChange();
              }}
            />
            Same as current address
          </label>
        </div>
        {!same && <AddressFieldGroup title="" addr={perm} onSet={setPerm} />}
      </div>
    </div>
  );
}

function AddressFieldGroup<T extends { line1: string; line2: string; line3: string; city: string; state: string; pincode: string; country: string }>({
  title, addr, onSet,
}: { title: string; addr: T; onSet: <K extends keyof T>(k: K, v: T[K]) => void }) {
  return (
    <div className="flex flex-col gap-4">
      {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}
      <Field label="Address Line 1" required>
        <Input value={addr.line1} onChange={(e) => onSet("line1" as keyof T, e.target.value as T[keyof T])} placeholder="House/Flat number, building" />
      </Field>
      <Field label="Address Line 2">
        <Input value={addr.line2} onChange={(e) => onSet("line2" as keyof T, e.target.value as T[keyof T])} placeholder="Street, locality, area" />
      </Field>
      <Field label="Address Line 3">
        <Input value={addr.line3} onChange={(e) => onSet("line3" as keyof T, e.target.value as T[keyof T])} placeholder="Landmark" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" required>
          <Input value={addr.city} onChange={(e) => onSet("city" as keyof T, e.target.value as T[keyof T])} />
        </Field>
        <Field label="State" required>
          <SearchSelect value={addr.state} onValueChange={(v) => onSet("state" as keyof T, v as T[keyof T])} placeholder="Select state" options={INDIAN_STATES} />
        </Field>
        <Field label="Pin Code" required>
          <Input value={addr.pincode} maxLength={6} onChange={(e) => onSet("pincode" as keyof T, e.target.value.replace(/\D/g, "") as T[keyof T])} />
        </Field>
        <Field label="Country" required>
          <SearchSelect value={addr.country} onValueChange={(v) => onSet("country" as keyof T, v as T[keyof T])} placeholder="Select country" options={COUNTRIES} />
        </Field>
      </div>
    </div>
  );
}

/* ---------- TAB 4: EXPERIENCE ---------- */
function ExperienceTab({ onChange }: { onChange: () => void }) {
  const { profile, update } = useProfile();
  function add() {
    update((d) => ({
      ...d,
      experience: [
        ...d.experience,
        {
          id: newId("exp"), title: "", company: "", employmentType: "Full-time",
          location: "", workMode: "On-site", startMonth: "", startYear: "",
          endMonth: "", endYear: "", current: false, description: "", technologies: [],
        },
      ],
    }));
    onChange();
  }
  function remove(id: string) {
    update((d) => ({ ...d, experience: d.experience.filter((e) => e.id !== id) }));
    onChange();
  }
  function patch(id: string, patch: Record<string, unknown>) {
    update((d) => ({
      ...d, experience: d.experience.map((e) => e.id === id ? { ...e, ...patch } : e),
    }));
    onChange();
  }
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const years = Array.from({ length: 40 }, (_, i) => (new Date().getFullYear() - i).toString());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Work Experience</h3>
        <Button onClick={add} size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="size-3.5" /> Add Experience
        </Button>
      </div>
      {profile.experience.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No experience added yet. Click "Add Experience" to start.
        </p>
      )}
      {profile.experience.map((e) => (
        <div key={e.id} className="rounded-lg border border-border bg-background/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GripVertical className="size-4 cursor-grab" />
              <Briefcase className="size-4" />
              {e.title || "New role"} {e.company && <>· {e.company}</>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(e.id)} aria-label="Delete">
              <Trash2 className="size-4 text-danger" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Job Title" required><Input value={e.title} onChange={(ev) => patch(e.id, { title: ev.target.value })} /></Field>
            <Field label="Company" required><Input value={e.company} onChange={(ev) => patch(e.id, { company: ev.target.value })} /></Field>
            <Field label="Employment Type">
              <Select value={e.employmentType} onValueChange={(v) => patch(e.id, { employmentType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Full-time", "Part-time", "Internship", "Contract", "Freelance"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Location"><Input value={e.location} onChange={(ev) => patch(e.id, { location: ev.target.value })} /></Field>
            <Field label="Work Mode">
              <Select value={e.workMode} onValueChange={(v) => patch(e.id, { workMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["On-site", "Hybrid", "Remote"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Start Month">
                <Select value={e.startMonth} onValueChange={(v) => patch(e.id, { startMonth: v })}>
                  <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>{months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Start Year">
                <Select value={e.startYear} onValueChange={(v) => patch(e.id, { startYear: v })}>
                  <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            {!e.current && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="End Month">
                  <Select value={e.endMonth} onValueChange={(v) => patch(e.id, { endMonth: v })}>
                    <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent>{months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="End Year">
                  <Select value={e.endYear} onValueChange={(v) => patch(e.id, { endYear: v })}>
                    <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
            )}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <Checkbox checked={e.current} onCheckedChange={(v) => patch(e.id, { current: Boolean(v) })} />
            Currently working here
          </label>
          <div className="mt-3">
            <Field label="Description">
              <Textarea rows={4} value={e.description} onChange={(ev) => patch(e.id, { description: ev.target.value })}
                placeholder="Describe your key responsibilities and achievements. Use bullet points." />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Technologies Used">
              <TagsInput value={e.technologies} onChange={(v) => patch(e.id, { technologies: v })} placeholder="React, Node.js..." />
            </Field>
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Tip: Your most recent experience is used by the AI to match your seniority level with job descriptions.
      </p>
    </div>
  );
}

/* ---------- TAB 5: EDUCATION ---------- */
function EducationTab({ onChange }: { onChange: () => void }) {
  const { profile, update } = useProfile();
  function add() {
    update((d) => ({
      ...d, education: [...d.education, {
        id: newId("edu"), degree: "B.Tech", field: "", institution: "", university: "",
        startYear: "", endYear: "", current: false, grade: "", gradeType: "CGPA", achievements: "",
      }],
    }));
    onChange();
  }
  function remove(id: string) {
    update((d) => ({ ...d, education: d.education.filter((e) => e.id !== id) }));
    onChange();
  }
  function patch(id: string, patch: Record<string, unknown>) {
    update((d) => ({ ...d, education: d.education.map((e) => e.id === id ? { ...e, ...patch } : e) }));
    onChange();
  }
  const years = Array.from({ length: 50 }, (_, i) => (new Date().getFullYear() - i + 5).toString());
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Education</h3>
        <Button onClick={add} size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="size-3.5" /> Add Education
        </Button>
      </div>
      {profile.education.map((e) => (
        <div key={e.id} className="rounded-lg border border-border bg-background/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="size-4" />
              {e.degree} {e.field && <>· {e.field}</>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="size-4 text-danger" /></Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Degree" required>
              <Select value={e.degree} onValueChange={(v) => patch(e.id, { degree: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["B.Tech", "M.Tech", "BCA", "MCA", "B.Sc", "M.Sc", "MBA", "PhD", "Diploma", "Other"].map((o) =>
                    <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Field of Study"><Input value={e.field} onChange={(ev) => patch(e.id, { field: ev.target.value })} /></Field>
            <Field label="Institution" required><Input value={e.institution} onChange={(ev) => patch(e.id, { institution: ev.target.value })} /></Field>
            <Field label="University / Board"><Input value={e.university} onChange={(ev) => patch(e.id, { university: ev.target.value })} /></Field>
            <Field label="Start Year">
              <Select value={e.startYear} onValueChange={(v) => patch(e.id, { startYear: v })}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {!e.current && (
              <Field label="End Year">
                <Select value={e.endYear} onValueChange={(v) => patch(e.id, { endYear: v })}>
                  <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Grade">
              <div className="flex gap-2">
                <Input className="flex-1" value={e.grade} onChange={(ev) => patch(e.id, { grade: ev.target.value })} />
                <Select value={e.gradeType} onValueChange={(v) => patch(e.id, { gradeType: v })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CGPA">CGPA</SelectItem>
                    <SelectItem value="Percentage">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Field>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <Checkbox checked={e.current} onCheckedChange={(v) => patch(e.id, { current: Boolean(v) })} />
            Currently enrolled
          </label>
          <div className="mt-3">
            <Field label="Achievements / Activities">
              <Textarea rows={3} value={e.achievements} onChange={(ev) => patch(e.id, { achievements: ev.target.value })} />
            </Field>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- TAB 6: SKILLS ---------- */
const LEVEL_COLOR: Record<SkillLevel, string> = {
  Beginner: "bg-muted-foreground",
  Intermediate: "bg-info",
  Advanced: "bg-warning",
  Expert: "bg-success",
};

function SkillsTab({ onChange }: { onChange: () => void }) {
  const { profile, update } = useProfile();
  const [draft, setDraft] = useState("");
  const suggestions = useMemo(() => {
    if (!draft) return [];
    const taken = new Set(profile.technicalSkills.map((s) => s.name.toLowerCase()));
    return SKILL_SUGGESTIONS.filter((s) => s.toLowerCase().includes(draft.toLowerCase()) && !taken.has(s.toLowerCase())).slice(0, 6);
  }, [draft, profile.technicalSkills]);

  function addTech(name: string) {
    const t = name.trim();
    if (!t) return;
    if (profile.technicalSkills.some((s) => s.name.toLowerCase() === t.toLowerCase())) return;
    update((d) => ({ ...d, technicalSkills: [...d.technicalSkills, { name: t, level: "Intermediate" }] }));
    setDraft("");
    onChange();
  }
  function patchLevel(name: string, level: SkillLevel) {
    update((d) => ({ ...d, technicalSkills: d.technicalSkills.map((s) => s.name === name ? { ...s, level } : s) }));
    onChange();
  }
  function removeTech(name: string) {
    update((d) => ({ ...d, technicalSkills: d.technicalSkills.filter((s) => s.name !== name) }));
    onChange();
  }
  function addLang() {
    update((d) => ({ ...d, languages: [...d.languages, { id: newId("lang"), name: "", proficiency: "Intermediate" }] }));
    onChange();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Technical Skills</h3>
        <div className="relative">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTech(draft); } }}
            placeholder="Type a skill and press Enter"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover p-1 shadow-md">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => addTech(s)} className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent">{s}</button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.technicalSkills.map((s) => (
            <div key={s.name} className="flex items-center gap-2 rounded-full border border-border bg-background/40 py-1 pl-3 pr-1">
              <span className={cn("size-2 rounded-full", LEVEL_COLOR[s.level])} />
              <span className="text-sm text-foreground">{s.name}</span>
              <Select value={s.level} onValueChange={(v) => patchLevel(s.name, v as SkillLevel)}>
                <SelectTrigger className="h-7 w-32 border-0 bg-transparent text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Beginner", "Intermediate", "Advanced", "Expert"] as SkillLevel[]).map((l) =>
                    <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <button onClick={() => removeTech(s.name)} className="rounded-full p-1 hover:bg-accent"><X className="size-3" /></button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Soft Skills</h3>
        <TagsInput value={profile.softSkills} onChange={(v) => { update((d) => ({ ...d, softSkills: v })); onChange(); }} placeholder="Leadership, Communication..." />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Languages</h3>
          <Button size="sm" variant="outline" onClick={addLang} className="gap-1.5"><Plus className="size-3.5" /> Add Language</Button>
        </div>
        <div className="flex flex-col gap-2">
          {profile.languages.map((l) => (
            <div key={l.id} className="flex items-center gap-2">
              <Input
                placeholder="Language"
                value={l.name}
                onChange={(e) => { update((d) => ({ ...d, languages: d.languages.map((x) => x.id === l.id ? { ...x, name: e.target.value } : x) })); onChange(); }}
              />
              <Select
                value={l.proficiency}
                onValueChange={(v) => { update((d) => ({ ...d, languages: d.languages.map((x) => x.id === l.id ? { ...x, proficiency: v as LanguageProficiency } : x) })); onChange(); }}
              >
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Native", "Fluent", "Intermediate", "Basic"] as LanguageProficiency[]).map((p) =>
                    <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => { update((d) => ({ ...d, languages: d.languages.filter((x) => x.id !== l.id) })); onChange(); }}>
                <Trash2 className="size-4 text-danger" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- TAB 7: PROJECTS ---------- */
function ProjectsTab({ onChange }: { onChange: () => void }) {
  const { profile, update } = useProfile();
  function add() {
    update((d) => ({ ...d, projects: [...d.projects, {
      id: newId("proj"), name: "", oneLiner: "", description: "", techStack: [], type: "Personal",
      liveUrl: "", githubUrl: "", startDate: "", endDate: "", ongoing: false,
    }] }));
    onChange();
  }
  function patch(id: string, p: Record<string, unknown>) {
    update((d) => ({ ...d, projects: d.projects.map((x) => x.id === id ? { ...x, ...p } : x) }));
    onChange();
  }
  function remove(id: string) {
    update((d) => ({ ...d, projects: d.projects.filter((x) => x.id !== id) }));
    onChange();
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Projects</h3>
        <Button onClick={add} size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="size-3.5" /> Add Project
        </Button>
      </div>
      {profile.projects.map((p) => (
        <div key={p.id} className="rounded-lg border border-border bg-background/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{p.name || "New project"}</span>
            <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="size-4 text-danger" /></Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Project Name" required><Input value={p.name} onChange={(e) => patch(p.id, { name: e.target.value })} /></Field>
            <Field label="Type">
              <Select value={p.type} onValueChange={(v) => patch(p.id, { type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Personal", "Academic", "Open Source", "Professional", "Freelance"].map((o) =>
                    <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="mt-3">
            <Field label="One-line description"><Input value={p.oneLiner} onChange={(e) => patch(p.id, { oneLiner: e.target.value })} /></Field>
          </div>
          <div className="mt-3">
            <Field label="Detailed Description"><Textarea rows={4} value={p.description} onChange={(e) => patch(p.id, { description: e.target.value })} /></Field>
          </div>
          <div className="mt-3">
            <Field label="Tech Stack"><TagsInput value={p.techStack} onChange={(v) => patch(p.id, { techStack: v })} placeholder="React, Postgres..." /></Field>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Live URL"><Input value={p.liveUrl} onChange={(e) => patch(p.id, { liveUrl: e.target.value })} /></Field>
            <Field label="GitHub URL"><Input value={p.githubUrl} onChange={(e) => patch(p.id, { githubUrl: e.target.value })} /></Field>
            <Field label="Start Date"><Input type="month" value={p.startDate} onChange={(e) => patch(p.id, { startDate: e.target.value })} /></Field>
            {!p.ongoing && <Field label="End Date"><Input type="month" value={p.endDate} onChange={(e) => patch(p.id, { endDate: e.target.value })} /></Field>}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <Checkbox checked={p.ongoing} onCheckedChange={(v) => patch(p.id, { ongoing: Boolean(v) })} />
            Ongoing
          </label>
        </div>
      ))}
    </div>
  );
}

/* ---------- TAB 8: LINKS & RESUME ---------- */
function LinksTab({ onChange }: { onChange: () => void }) {
  const { profile, update } = useProfile();
  const [parsing, setParsing] = useState(false);
  const [drag, setDrag] = useState(false);

  function handleUpload(file: File) {
    update((d) => ({ ...d, resume: { fileName: file.name, uploadedAt: new Date().toISOString().slice(0, 10), size: `${Math.round(file.size / 1024)} KB` } }));
    onChange();
    toast.success("Resume uploaded");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleUpload(f);
  }

  function parseResume() {
    setParsing(true);
    setTimeout(() => { setParsing(false); toast.success("Resume parsed — fields auto-filled."); }, 2200);
  }

  function addDoc() {
    update((d) => ({ ...d, additionalDocs: [...d.additionalDocs, { id: newId("doc"), label: "New Document", fileName: "untitled.pdf", uploadedAt: new Date().toISOString().slice(0, 10), size: "0 KB" }] }));
    onChange();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resume</h3>
        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            drag ? "border-primary bg-primary/5" : "border-border bg-background/40 hover:bg-accent/20",
          )}
        >
          <Upload className="size-6 text-muted-foreground" />
          <span className="text-sm text-foreground">Drag and drop resume here or click to browse</span>
          <span className="text-xs text-muted-foreground">PDF or DOCX, up to 5 MB</span>
          <input
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
          />
        </label>
        {profile.resume && (
          <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-background/40 p-3">
            <div className="flex items-center gap-3">
              <FileText className="size-5 text-primary" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{profile.resume.fileName}</span>
                <span className="text-xs text-muted-foreground">Uploaded {profile.resume.uploadedAt} · {profile.resume.size}</span>
              </div>
            </div>
            <Button variant="outline" size="sm">Replace</Button>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            disabled={parsing || !profile.resume}
            onClick={parseResume}
            className={cn("gap-2 text-white", parsing ? "animate-shimmer" : "bg-gradient-to-r from-primary to-chart-5 hover:opacity-90")}
          >
            <Sparkles className="size-4" />
            {parsing ? "Parsing Resume…" : "Parse Resume with AI"}
          </Button>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
          <span>Your master resume is the source of truth. The AI will tailor copies of it — the original is never modified.</span>
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cover Letter</h3>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={profile.useAiCoverLetters} onCheckedChange={(v) => { update((d) => ({ ...d, useAiCoverLetters: v })); onChange(); }} />
            Use AI-generated cover letters
          </label>
        </div>
        <Field label="Base cover letter template">
          <Textarea
            rows={6}
            value={profile.coverLetterTemplate}
            onChange={(e) => { update((d) => ({ ...d, coverLetterTemplate: e.target.value })); onChange(); }}
            placeholder="Write a general cover letter template. The AI will personalise the opening, skills mentioned, and company-specific lines for each application."
          />
        </Field>
      </div>

      <div className="border-t border-border pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Additional Documents</h3>
          <Button size="sm" variant="outline" onClick={addDoc} className="gap-1.5"><Plus className="size-3.5" /> Add Document</Button>
        </div>
        <div className="flex flex-col gap-2">
          {profile.additionalDocs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 rounded-md border border-border bg-background/40 p-3">
              <FileText className="size-4 text-muted-foreground" />
              <Input
                className="h-8 flex-1"
                value={doc.label}
                onChange={(e) => { update((d) => ({ ...d, additionalDocs: d.additionalDocs.map((x) => x.id === doc.id ? { ...x, label: e.target.value } : x) })); onChange(); }}
              />
              <Badge variant="outline" className="font-normal">{doc.fileName}</Badge>
              <span className="text-xs text-muted-foreground">{doc.uploadedAt}</span>
              <Button
                variant="ghost" size="icon"
                onClick={() => { update((d) => ({ ...d, additionalDocs: d.additionalDocs.filter((x) => x.id !== doc.id) })); onChange(); }}
              >
                <Trash2 className="size-4 text-danger" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
