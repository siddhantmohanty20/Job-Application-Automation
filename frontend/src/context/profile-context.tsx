import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { defaultProfile, type ProfileData } from "@/lib/profile-types";

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
  completion: number;
  sectionStatus: Record<SectionKey, boolean>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function computeSectionStatus(p: ProfileData): Record<SectionKey, boolean> {
  return {
    personal: Boolean(
      p.personal.firstName && p.personal.lastName && p.personal.dob && p.personal.noticePeriod,
    ),
    contact: Boolean(p.contact.primaryEmail && p.contact.mobile),
    address: Boolean(
      p.currentAddress.line1 && p.currentAddress.city && p.currentAddress.state && p.currentAddress.pincode,
    ),
    experience: p.experience.length > 0,
    education: p.education.length > 0,
    skills: p.technicalSkills.length > 0,
    projects: p.projects.length > 0,
    links: Boolean(p.resume && (p.contact.linkedin || p.contact.github)),
  };
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProfile({ ...defaultProfile, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      /* ignore */
    }
  }, [profile]);

  function update(updater: (draft: ProfileData) => ProfileData) {
    setProfile((prev) => updater(structuredClone(prev)));
  }

  const sectionStatus = computeSectionStatus(profile);
  const filled = Object.values(sectionStatus).filter(Boolean).length;
  const completion = Math.round((filled / Object.keys(sectionStatus).length) * 100);

  return (
    <ProfileContext.Provider value={{ profile, update, completion, sectionStatus }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
