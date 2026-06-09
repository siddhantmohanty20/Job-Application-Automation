import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { defaultProfile, type ProfileData } from "@/lib/profile-types";
import { fetchProfile, upsertProfile } from "@/lib/profile-api";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";

const STORAGE_KEY = "autoapply.profile.v1";

export type SectionKey =
  | "personal"
  | "contact"
  | "address"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "links";

export const SECTION_LABELS: Record<SectionKey, string> = {
  personal: "Personal Info",
  contact: "Contact Details",
  address: "Address",
  experience: "Work Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  links: "Links & Resume",
};

interface ProfileContextValue {
  profile: ProfileData;
  update: (updater: (draft: ProfileData) => ProfileData) => void;
  saveSection: (key: SectionKey) => Promise<void>;
  saving: boolean;
  loading: boolean;
  completion: number;
  sectionStatus: Record<SectionKey, boolean>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function computeSectionStatus(p: ProfileData): Record<SectionKey, boolean> {
  return {
    personal: Boolean(
      p.personal.firstName &&
        p.personal.lastName &&
        p.personal.dob &&
        p.personal.noticePeriod,
    ),
    contact: Boolean(p.contact.primaryEmail && p.contact.mobile),
    address: Boolean(
      p.currentAddress.line1 &&
        p.currentAddress.city &&
        p.currentAddress.state &&
        p.currentAddress.pincode,
    ),
    experience: p.experience.length > 0,
    education: p.education.length > 0,
    skills: p.technicalSkills.length > 0,
    projects: p.projects.length > 0,
    links: Boolean(p.resume && (p.contact.linkedin || p.contact.github)),
  };
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const loaded = useRef(false);

  // ── Load profile: Supabase first, localStorage fallback ──
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const remote = await fetchProfile(user!.id);
        if (remote) {
          setProfile(remote);
          // keep localStorage in sync as a fallback
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
        } else {
          // no remote profile yet — try localStorage
          try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) setProfile({ ...defaultProfile, ...JSON.parse(raw) });
            else setProfile(defaultProfile);
          } catch {
            setProfile(defaultProfile);
          }
        }
      } catch {
        // network error — fall back to localStorage
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) setProfile({ ...defaultProfile, ...JSON.parse(raw) });
        } catch {
          /* ignore */
        }
        toast.error("Could not load profile from server", {
          description: "Using locally saved data.",
        });
      } finally {
        setLoading(false);
        loaded.current = true;
      }
    }

    load();
  }, [user]);

  // ── Auto-save to localStorage on every change (fallback) ──
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      /* ignore */
    }
  }, [profile]);

  // ── Optimistic local update ──
  function update(updater: (draft: ProfileData) => ProfileData) {
    setProfile((prev) => updater(structuredClone(prev)));
  }

  // ── Save section to Supabase ──
  const saveSection = useCallback(
    async (_key: SectionKey) => {
      if (!user) {
        toast.error("Not signed in");
        return;
      }
      setSaving(true);
      try {
        const { error } = await upsertProfile(user.id, profile);
        if (error) {
          toast.error("Save failed", { description: error });
        } else {
          toast.success("Section saved");
        }
      } catch (e) {
        toast.error("Save failed", {
          description: e instanceof Error ? e.message : "Unknown error",
        });
      } finally {
        setSaving(false);
      }
    },
    [user, profile],
  );

  const sectionStatus = computeSectionStatus(profile);
  const filled = Object.values(sectionStatus).filter(Boolean).length;
  const completion = Math.round(
    (filled / Object.keys(sectionStatus).length) * 100,
  );

  return (
    <ProfileContext.Provider
      value={{ profile, update, saveSection, saving, loading, completion, sectionStatus }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}