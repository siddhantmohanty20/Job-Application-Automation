import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SheetsSync } from "@/components/sheets/sheets-sync";

export const Route = createFileRoute("/sheets-sync")({
  component: () => (
    <AppShell title="Google Sheets Sync">
      <SheetsSync />
    </AppShell>
  ),
});
