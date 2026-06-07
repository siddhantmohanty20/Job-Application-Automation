import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ApplicationsTimeline } from "@/components/applications/applications-timeline";

export const Route = createFileRoute("/applications")({
  component: () => (
    <AppShell title="Applications">
      <ApplicationsTimeline />
    </AppShell>
  ),
});
