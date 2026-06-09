/**
 * profile-api.ts
 * All Supabase read/write operations for the profile section.
 * Used by profile-context.tsx — not called directly from components.
 */

import { supabase } from "@/lib/supabase";
import type {
  ProfileData,
  ExperienceEntry,
  EducationEntry,
  ProjectEntry,
} from "@/lib/profile-types";

// ─── helpers ────────────────────────────────────────────────

function toSnake<T extends Record<string, unknown>>(obj: T) {
  return obj; // fields already match DB columns — mapped explicitly below
}

// ─── PROFILE (flat fields) ───────────────────────────────────

export async function fetchProfile(userId: string): Promise<ProfileData | null> {
  const { data: p, error } = await supabase
    .from("profile")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !p) return null;

  const [expRes, eduRes, projRes] = await Promise.all([
    supabase.from("experience").select("*").eq("profile_id", p.id).order("position"),
    supabase.from("education").select("*").eq("profile_id", p.id).order("position"),
    supabase.from("projects").select("*").eq("profile_id", p.id).order("position"),
  ]);

  return dbToProfile(p, expRes.data ?? [], eduRes.data ?? [], projRes.data ?? []);
}

export async function upsertProfile(
  userId: string,
  profile: ProfileData
): Promise<{ error: string | null }> {
  // 1. upsert main profile row
  const row = profileToDb(userId, profile);
  const { data: saved, error: profileErr } = await supabase
    .from("profile")
    .upsert(row, { onConflict: "user_id" })
    .select("id")
    .single();

  if (profileErr) return { error: profileErr.message };
  const profileId = saved.id;

  // 2. replace experience rows
  await supabase.from("experience").delete().eq("profile_id", profileId);
  if (profile.experience.length > 0) {
    const expRows = profile.experience.map((e, i) => expToDb(profileId, e, i));
    const { error: expErr } = await supabase.from("experience").insert(expRows);
    if (expErr) return { error: expErr.message };
  }

  // 3. replace education rows
  await supabase.from("education").delete().eq("profile_id", profileId);
  if (profile.education.length > 0) {
    const eduRows = profile.education.map((e, i) => eduToDb(profileId, e, i));
    const { error: eduErr } = await supabase.from("education").insert(eduRows);
    if (eduErr) return { error: eduErr.message };
  }

  // 4. replace project rows
  await supabase.from("projects").delete().eq("profile_id", profileId);
  if (profile.projects.length > 0) {
    const projRows = profile.projects.map((p, i) => projToDb(profileId, p, i));
    const { error: projErr } = await supabase.from("projects").insert(projRows);
    if (projErr) return { error: projErr.message };
  }

  return { error: null };
}

// ─── MAPPERS: DB → ProfileData ───────────────────────────────

function dbToProfile(
  p: Record<string, unknown>,
  exp: Record<string, unknown>[],
  edu: Record<string, unknown>[],
  proj: Record<string, unknown>[]
): ProfileData {
  return {
    title: (p.title as string) ?? "",
    personal: {
      firstName: (p.first_name as string) ?? "",
      middleName: (p.middle_name as string) ?? "",
      lastName: (p.last_name as string) ?? "",
      preferredName: (p.preferred_name as string) ?? "",
      dob: (p.dob as string) ?? "",
      gender: (p.gender as string) ?? "",
      nationality: (p.nationality as string) ?? "",
      authorisedToWork: (p.authorised_to_work as boolean) ?? true,
      willingToRelocate: (p.willing_to_relocate as boolean) ?? false,
      relocateTo: (p.relocate_to as string[]) ?? [],
      workPreference: (p.work_preference as string[]) ?? [],
      noticePeriod: (p.notice_period as string) ?? "",
      expectedCtc: (p.expected_ctc as string) ?? "",
      currentCtc: (p.current_ctc as string) ?? "",
    },
    contact: {
      primaryEmail: (p.primary_email as string) ?? "",
      secondaryEmail: (p.secondary_email as string) ?? "",
      countryCode: (p.country_code as string) ?? "+91",
      mobile: (p.mobile as string) ?? "",
      altMobile: (p.alt_mobile as string) ?? "",
      linkedin: (p.linkedin as string) ?? "",
      github: (p.github as string) ?? "",
      portfolio: (p.portfolio as string) ?? "",
      twitter: (p.twitter as string) ?? "",
      leetcode: (p.leetcode as string) ?? "",
      codeforces: (p.codeforces as string) ?? "",
      gfg: (p.gfg as string) ?? "",
    },
    currentAddress: {
      line1: (p.addr_line1 as string) ?? "",
      line2: (p.addr_line2 as string) ?? "",
      line3: (p.addr_line3 as string) ?? "",
      city: (p.addr_city as string) ?? "",
      state: (p.addr_state as string) ?? "",
      pincode: (p.addr_pincode as string) ?? "",
      country: (p.addr_country as string) ?? "India",
    },
    permanentSameAsCurrent: (p.perm_same_as_current as boolean) ?? true,
    permanentAddress: {
      line1: (p.perm_line1 as string) ?? "",
      line2: (p.perm_line2 as string) ?? "",
      line3: (p.perm_line3 as string) ?? "",
      city: (p.perm_city as string) ?? "",
      state: (p.perm_state as string) ?? "",
      pincode: (p.perm_pincode as string) ?? "",
      country: (p.perm_country as string) ?? "India",
    },
    technicalSkills: (p.technical_skills as { name: string; level: string }[]) ?? [],
    softSkills: (p.soft_skills as string[]) ?? [],
    languages: (p.languages as { id: string; name: string; proficiency: string }[]) ?? [],
    useAiCoverLetters: (p.use_ai_cover_letters as boolean) ?? true,
    coverLetterTemplate: (p.cover_letter_template as string) ?? "",
    resume: p.resume_file_name
      ? {
          fileName: p.resume_file_name as string,
          uploadedAt: p.resume_uploaded_at as string,
          size: p.resume_file_size as string,
        }
      : null,
    additionalDocs: [],
    experience: exp.map(dbToExp),
    education: edu.map(dbToEdu),
    projects: proj.map(dbToProj),
  };
}

function dbToExp(e: Record<string, unknown>): ExperienceEntry {
  return {
    id: e.id as string,
    title: (e.title as string) ?? "",
    company: (e.company as string) ?? "",
    employmentType: (e.employment_type as string) ?? "",
    location: (e.location as string) ?? "",
    workMode: (e.work_mode as string) ?? "",
    startMonth: (e.start_month as string) ?? "",
    startYear: (e.start_year as string) ?? "",
    endMonth: (e.end_month as string) ?? "",
    endYear: (e.end_year as string) ?? "",
    current: (e.current as boolean) ?? false,
    description: (e.description as string) ?? "",
    technologies: (e.technologies as string[]) ?? [],
  };
}

function dbToEdu(e: Record<string, unknown>): EducationEntry {
  return {
    id: e.id as string,
    degree: (e.degree as string) ?? "",
    field: (e.field as string) ?? "",
    institution: (e.institution as string) ?? "",
    university: (e.university as string) ?? "",
    startYear: (e.start_year as string) ?? "",
    endYear: (e.end_year as string) ?? "",
    current: (e.current as boolean) ?? false,
    grade: (e.grade as string) ?? "",
    gradeType: ((e.grade_type as string) ?? "CGPA") as "CGPA" | "Percentage",
    achievements: (e.achievements as string) ?? "",
  };
}

function dbToProj(p: Record<string, unknown>): ProjectEntry {
  return {
    id: p.id as string,
    name: (p.name as string) ?? "",
    oneLiner: (p.one_liner as string) ?? "",
    description: (p.description as string) ?? "",
    techStack: (p.tech_stack as string[]) ?? [],
    type: (p.type as string) ?? "",
    liveUrl: (p.live_url as string) ?? "",
    githubUrl: (p.github_url as string) ?? "",
    startDate: (p.start_date as string) ?? "",
    endDate: (p.end_date as string) ?? "",
    ongoing: (p.ongoing as boolean) ?? false,
  };
}

// ─── MAPPERS: ProfileData → DB ───────────────────────────────

function profileToDb(userId: string, p: ProfileData) {
  return {
    user_id: userId,
    title: p.title,
    first_name: p.personal.firstName,
    middle_name: p.personal.middleName,
    last_name: p.personal.lastName,
    preferred_name: p.personal.preferredName,
    dob: p.personal.dob || null,
    gender: p.personal.gender,
    nationality: p.personal.nationality,
    authorised_to_work: p.personal.authorisedToWork,
    willing_to_relocate: p.personal.willingToRelocate,
    relocate_to: p.personal.relocateTo,
    work_preference: p.personal.workPreference,
    notice_period: p.personal.noticePeriod,
    expected_ctc: p.personal.expectedCtc,
    current_ctc: p.personal.currentCtc,
    primary_email: p.contact.primaryEmail,
    secondary_email: p.contact.secondaryEmail,
    country_code: p.contact.countryCode,
    mobile: p.contact.mobile,
    alt_mobile: p.contact.altMobile,
    linkedin: p.contact.linkedin,
    github: p.contact.github,
    portfolio: p.contact.portfolio,
    twitter: p.contact.twitter,
    leetcode: p.contact.leetcode,
    codeforces: p.contact.codeforces,
    gfg: p.contact.gfg,
    addr_line1: p.currentAddress.line1,
    addr_line2: p.currentAddress.line2,
    addr_line3: p.currentAddress.line3,
    addr_city: p.currentAddress.city,
    addr_state: p.currentAddress.state,
    addr_pincode: p.currentAddress.pincode,
    addr_country: p.currentAddress.country,
    perm_same_as_current: p.permanentSameAsCurrent,
    perm_line1: p.permanentAddress.line1,
    perm_line2: p.permanentAddress.line2,
    perm_line3: p.permanentAddress.line3,
    perm_city: p.permanentAddress.city,
    perm_state: p.permanentAddress.state,
    perm_pincode: p.permanentAddress.pincode,
    perm_country: p.permanentAddress.country,
    technical_skills: p.technicalSkills,
    soft_skills: p.softSkills,
    languages: p.languages,
    use_ai_cover_letters: p.useAiCoverLetters,
    cover_letter_template: p.coverLetterTemplate,
    resume_file_name: p.resume?.fileName ?? null,
    resume_uploaded_at: p.resume?.uploadedAt ?? null,
    resume_file_size: p.resume?.size ?? null,
  };
}

function expToDb(profileId: string, e: ExperienceEntry, position: number) {
  return {
    profile_id: profileId,
    position,
    title: e.title,
    company: e.company,
    employment_type: e.employmentType,
    location: e.location,
    work_mode: e.workMode,
    start_month: e.startMonth,
    start_year: e.startYear,
    end_month: e.endMonth,
    end_year: e.endYear,
    current: e.current,
    description: e.description,
    technologies: e.technologies,
  };
}

function eduToDb(profileId: string, e: EducationEntry, position: number) {
  return {
    profile_id: profileId,
    position,
    degree: e.degree,
    field: e.field,
    institution: e.institution,
    university: e.university,
    start_year: e.startYear,
    end_year: e.endYear,
    current: e.current,
    grade: e.grade,
    grade_type: e.gradeType,
    achievements: e.achievements,
  };
}

function projToDb(profileId: string, p: ProjectEntry, position: number) {
  return {
    profile_id: profileId,
    position,
    name: p.name,
    one_liner: p.oneLiner,
    description: p.description,
    tech_stack: p.techStack,
    type: p.type,
    live_url: p.liveUrl,
    github_url: p.githubUrl,
    start_date: p.startDate,
    end_date: p.endDate,
    ongoing: p.ongoing,
  };
}