import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { EmailOutreach } from "@/components/email/email-outreach";

export const Route = createFileRoute("/email-outreach")({
  component: () => (
    <AppShell title="Email Outreach">
      <EmailOutreach />
    </AppShell>
  ),
});
