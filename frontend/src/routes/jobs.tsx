import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { JobsTable } from "@/components/jobs/jobs-table";

export const Route = createFileRoute("/jobs")({
  component: () => (
    <AppShell title="Jobs">
      <JobsTable />
    </AppShell>
  ),
});
