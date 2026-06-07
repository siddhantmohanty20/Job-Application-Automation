export type WorkPreference = "On-site" | "Hybrid" | "Remote"
export type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert"
export type LanguageProficiency = "Native" | "Fluent" | "Intermediate" | "Basic"

export interface TechnicalSkill {
  name: string
  level: SkillLevel
}

export interface LanguageEntry {
  id: string
  name: string
  proficiency: LanguageProficiency
}

export interface ExperienceEntry {
  id: string
  title: string
  company: string
  employmentType: string
  location: string
  workMode: string
  startMonth: string
  startYear: string
  endMonth: string
  endYear: string
  current: boolean
  description: string
  technologies: string[]
}

export interface EducationEntry {
  id: string
  degree: string
  field: string
  institution: string
  university: string
  startYear: string
  endYear: string
  current: boolean
  grade: string
  gradeType: "CGPA" | "Percentage"
  achievements: string
}

export interface ProjectEntry {
  id: string
  name: string
  oneLiner: string
  description: string
  techStack: string[]
  type: string
  liveUrl: string
  githubUrl: string
  startDate: string
  endDate: string
  ongoing: boolean
}

export interface UploadedDoc {
  id: string
  label: string
  fileName: string
  uploadedAt: string
  size: string
}

export interface AddressFields {
  line1: string
  line2: string
  line3: string
  city: string
  state: string
  pincode: string
  country: string
}

export interface ProfileData {
  personal: {
    firstName: string
    middleName: string
    lastName: string
    preferredName: string
    dob: string
    gender: string
    nationality: string
    authorisedToWork: boolean
    willingToRelocate: boolean
    relocateTo: string[]
    workPreference: WorkPreference[]
    noticePeriod: string
    expectedCtc: string
    currentCtc: string
  }
  contact: {
    primaryEmail: string
    secondaryEmail: string
    countryCode: string
    mobile: string
    altMobile: string
    linkedin: string
    github: string
    portfolio: string
    twitter: string
    leetcode: string
    codeforces: string
    gfg: string
  }
  currentAddress: AddressFields
  permanentSameAsCurrent: boolean
  permanentAddress: AddressFields
  experience: ExperienceEntry[]
  education: EducationEntry[]
  technicalSkills: TechnicalSkill[]
  softSkills: string[]
  languages: LanguageEntry[]
  projects: ProjectEntry[]
  resume: {
    fileName: string
    uploadedAt: string
    size: string
  } | null
  useAiCoverLetters: boolean
  coverLetterTemplate: string
  additionalDocs: UploadedDoc[]
  title: string
}

const emptyAddress: AddressFields = {
  line1: "",
  line2: "",
  line3: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
}

export const defaultProfile: ProfileData = {
  title: "Senior Frontend Engineer",
  personal: {
    firstName: "Aarav",
    middleName: "",
    lastName: "Sharma",
    preferredName: "Aarav",
    dob: "1998-04-12",
    gender: "Male",
    nationality: "India",
    authorisedToWork: true,
    willingToRelocate: true,
    relocateTo: ["Bangalore", "Mumbai", "Remote"],
    workPreference: ["Hybrid", "Remote"],
    noticePeriod: "30 days",
    expectedCtc: "32 LPA",
    currentCtc: "24 LPA",
  },
  contact: {
    primaryEmail: "aarav.sharma@gmail.com",
    secondaryEmail: "",
    countryCode: "+91",
    mobile: "98765 43210",
    altMobile: "",
    linkedin: "https://linkedin.com/in/aaravsharma",
    github: "https://github.com/aaravsharma",
    portfolio: "https://aarav.dev",
    twitter: "",
    leetcode: "https://leetcode.com/aaravsharma",
    codeforces: "",
    gfg: "",
  },
  currentAddress: {
    line1: "Flat 402, Lotus Residency",
    line2: "MG Road, Indiranagar",
    line3: "Near Metro Station",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560038",
    country: "India",
  },
  permanentSameAsCurrent: false,
  permanentAddress: { ...emptyAddress },
  experience: [
    {
      id: "exp-1",
      title: "Frontend Engineer",
      company: "Razorpay",
      employmentType: "Full-time",
      location: "Bangalore",
      workMode: "Hybrid",
      startMonth: "Jul",
      startYear: "2022",
      endMonth: "",
      endYear: "",
      current: true,
      description:
        "Led the redesign of the merchant dashboard used by 100k+ businesses.\nBuilt a reusable component library that cut feature delivery time by 30%.",
      technologies: ["React", "TypeScript", "Next.js", "Redux"],
    },
  ],
  education: [
    {
      id: "edu-1",
      degree: "B.Tech",
      field: "Electronics and Communication Engineering",
      institution: "MNIT Jaipur",
      university: "MNIT Jaipur",
      startYear: "2016",
      endYear: "2020",
      current: false,
      grade: "8.4",
      gradeType: "CGPA",
      achievements: "Coordinator, Technical Fest. Top 5% of batch.",
    },
  ],
  technicalSkills: [
    { name: "React", level: "Expert" },
    { name: "TypeScript", level: "Advanced" },
    { name: "Next.js", level: "Advanced" },
    { name: "Node.js", level: "Intermediate" },
  ],
  softSkills: ["Leadership", "Problem Solving", "Communication"],
  languages: [
    { id: "lang-1", name: "English", proficiency: "Fluent" },
    { id: "lang-2", name: "Hindi", proficiency: "Native" },
  ],
  projects: [
    {
      id: "proj-1",
      name: "DevBoard",
      oneLiner: "Real-time Kanban board for engineering teams",
      description:
        "A collaborative project management tool with live cursors, optimistic updates, and offline support.",
      techStack: ["React", "WebSockets", "Postgres"],
      type: "Open Source",
      liveUrl: "https://devboard.app",
      githubUrl: "https://github.com/aaravsharma/devboard",
      startDate: "2023-01",
      endDate: "2023-06",
      ongoing: false,
    },
  ],
  resume: {
    fileName: "Aarav_Sharma_Resume.pdf",
    uploadedAt: "2026-05-28",
    size: "248 KB",
  },
  useAiCoverLetters: true,
  coverLetterTemplate:
    "I'm a frontend engineer with 4+ years of experience building performant, accessible web applications. I'm excited about roles where I can own product surfaces end to end and mentor other engineers.",
  additionalDocs: [
    {
      id: "doc-1",
      label: "Degree Certificate",
      fileName: "BTech_Degree.pdf",
      uploadedAt: "2026-05-20",
      size: "1.2 MB",
    },
  ],
}

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh",
]

export const NATIONALITIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia",
  "Germany", "France", "Singapore", "United Arab Emirates", "Japan",
  "China", "Brazil", "South Africa", "Nigeria", "Netherlands", "Ireland",
]

export const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia",
  "Germany", "France", "Singapore", "United Arab Emirates", "Netherlands",
]

export const COUNTRY_CODES = ["+91", "+1", "+44", "+61", "+65", "+971", "+49", "+33"]

export const SKILL_SUGGESTIONS = [
  "React", "Vue", "Angular", "Svelte", "Next.js", "Nuxt", "TypeScript",
  "JavaScript", "Node.js", "Python", "Go", "Rust", "Java", "C++", "GraphQL",
  "REST", "PostgreSQL", "MongoDB", "Redis", "Docker", "Kubernetes", "AWS",
  "GCP", "Azure", "Tailwind CSS", "Redux", "Zustand", "Jest", "Cypress",
  "Webpack", "Vite", "Figma", "CI/CD", "Terraform",
]

export function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}
