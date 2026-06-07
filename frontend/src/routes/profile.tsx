import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ProfilePage } from "@/components/profile/profile-page";

export const Route = createFileRoute("/profile")({
  component: () => (
    <AppShell title="Profile">
      <ProfilePage />
    </AppShell>
  ),
});
