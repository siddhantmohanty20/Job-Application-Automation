/**
 * settings-api.ts
 * Supabase read/write for user settings.
 */

import { supabase } from "@/lib/supabase";

export type AppSettings = {
  // job preferences
  targetRoles: string[];
  preferredLocations: string[];
  minMatchScore: number;
  platformsToScrape: string[];
  // application settings
  maxApplicationsPerDay: number;
  autoApply: boolean;
  autoApplyPlatforms: string[];
  // email settings
  maxEmailsPerDay: number;
  emailWindowStart: string;
  emailWindowEnd: string;
  emailSignature: string;
  emailCooldownDays: number;
  // api keys
  geminiApiKey: string;
  hunterApiKey: string;
  sheetsSpreadsheetId: string;
  // automation state
  automationActive: boolean;
};

export const defaultSettings: AppSettings = {
  targetRoles: ["Frontend Engineer", "Full Stack Engineer", "Software Engineer"],
  preferredLocations: ["Remote", "Bangalore", "Mumbai"],
  minMatchScore: 75,
  platformsToScrape: ["LinkedIn", "Greenhouse", "Lever", "Adzuna"],
  maxApplicationsPerDay: 30,
  autoApply: true,
  autoApplyPlatforms: ["Greenhouse", "Lever"],
  maxEmailsPerDay: 5,
  emailWindowStart: "09:00",
  emailWindowEnd: "18:00",
  emailSignature: "",
  emailCooldownDays: 14,
  geminiApiKey: "",
  hunterApiKey: "",
  sheetsSpreadsheetId: "",
  automationActive: false,
};

export async function fetchSettings(userId: string): Promise<AppSettings> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return defaultSettings;

  return {
    targetRoles: data.target_roles ?? defaultSettings.targetRoles,
    preferredLocations: data.preferred_locations ?? defaultSettings.preferredLocations,
    minMatchScore: data.min_match_score ?? defaultSettings.minMatchScore,
    platformsToScrape: data.platforms_to_scrape ?? defaultSettings.platformsToScrape,
    maxApplicationsPerDay: data.max_applications_per_day ?? defaultSettings.maxApplicationsPerDay,
    autoApply: data.auto_apply ?? defaultSettings.autoApply,
    autoApplyPlatforms: data.auto_apply_platforms ?? defaultSettings.autoApplyPlatforms,
    maxEmailsPerDay: data.max_emails_per_day ?? defaultSettings.maxEmailsPerDay,
    emailWindowStart: data.email_window_start ?? defaultSettings.emailWindowStart,
    emailWindowEnd: data.email_window_end ?? defaultSettings.emailWindowEnd,
    emailSignature: data.email_signature ?? defaultSettings.emailSignature,
    emailCooldownDays: data.email_cooldown_days ?? defaultSettings.emailCooldownDays,
    geminiApiKey: data.gemini_api_key ?? "",
    hunterApiKey: data.hunter_api_key ?? "",
    sheetsSpreadsheetId: data.sheets_spreadsheet_id ?? "",
    automationActive: data.automation_active ?? false,
  };
}

export async function saveSettings(
  userId: string,
  settings: AppSettings
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("settings")
    .upsert(
      {
        user_id: userId,
        target_roles: settings.targetRoles,
        preferred_locations: settings.preferredLocations,
        min_match_score: settings.minMatchScore,
        platforms_to_scrape: settings.platformsToScrape,
        max_applications_per_day: settings.maxApplicationsPerDay,
        auto_apply: settings.autoApply,
        auto_apply_platforms: settings.autoApplyPlatforms,
        max_emails_per_day: settings.maxEmailsPerDay,
        email_window_start: settings.emailWindowStart,
        email_window_end: settings.emailWindowEnd,
        email_signature: settings.emailSignature,
        email_cooldown_days: settings.emailCooldownDays,
        gemini_api_key: settings.geminiApiKey,
        hunter_api_key: settings.hunterApiKey,
        sheets_spreadsheet_id: settings.sheetsSpreadsheetId,
        automation_active: settings.automationActive,
      },
      { onConflict: "user_id" }
    );

  return { error: error?.message ?? null };
}

export async function updateAutomationState(
  userId: string,
  active: boolean
): Promise<void> {
  await supabase
    .from("settings")
    .update({ automation_active: active })
    .eq("user_id", userId);
}