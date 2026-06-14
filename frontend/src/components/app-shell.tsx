import { useState, type ReactNode } from "react";
import { Menu, Play, Pause, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarContent } from "@/components/sidebar";
import { useAutomation } from "@/context/automation-context";
import { triggerScraper, triggerMatcher } from "@/lib/automation-api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth/auth-guard";

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const { active, setActive } = useAutomation();

  async function handleAutomationClick() {
    if (active) {
      // currently running — pause it
      setActive(false);
      toast("Automation paused", {
        description: "Scraping and matching halted.",
      });
      return;
    }

    // not running — start full automation
    setRunning(true);
    setActive(true);
    toast("Automation started", {
      description: "Running scraper and matcher in background...",
    });

    try {
      await triggerScraper();
      await triggerMatcher();
      toast.success("Automation complete!", {
        description: "Jobs scraped and matched. Check the Jobs page.",
      });
    } catch {
      toast.error("Automation failed", {
        description: "Make sure the worker server is running.",
      });
      setActive(false);
    } finally {
      setRunning(false);
    }
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-border md:block">
          <SidebarContent />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <div className="absolute inset-y-0 left-0 w-60 border-r border-border shadow-xl">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-3 z-10"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="size-5" />
              </Button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col md:pl-60">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            </div>

            <Button
              onClick={handleAutomationClick}
              disabled={running}
              className={cn(
                "gap-2 font-medium text-white",
                active
                  ? "bg-success hover:bg-success/90 animate-pulse-ring"
                  : "bg-muted hover:bg-muted/80 text-foreground",
              )}
            >
              {running ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span className="hidden sm:inline">Running...</span>
                  <span className="sm:hidden">Running</span>
                </>
              ) : active ? (
                <>
                  <Pause className="size-4" />
                  <span className="hidden sm:inline">Pause Automation</span>
                  <span className="sm:hidden">Pause</span>
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  <span className="hidden sm:inline">Run Automation</span>
                  <span className="sm:hidden">Run</span>
                </>
              )}
            </Button>
          </header>

          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}