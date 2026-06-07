import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ResumeVault } from "@/components/resume/resume-vault";

export const Route = createFileRoute("/resume-vault")({
  component: () => (
    <AppShell title="Resume Vault">
      <ResumeVault />
    </AppShell>
  ),
});
