import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SettingsForm } from "@/components/settings/settings-form";

export const Route = createFileRoute("/settings")({
  component: () => (
    <AppShell title="Settings">
      <SettingsForm />
    </AppShell>
  ),
});
