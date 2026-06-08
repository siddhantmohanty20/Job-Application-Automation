import { useState, type ReactNode } from "react";
import { Menu, Play, Pause, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarContent } from "@/components/sidebar";
import { useAutomation } from "@/context/automation-context";
import { AuthGuard } from "@/components/auth/auth-guard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { active, toggle } = useAutomation();

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-border md:block">
          <SidebarContent />
        </aside>

        {/* Mobile sidebar overlay */}
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

        {/* Main content */}
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
              onClick={() => {
                toggle();
                toast(active ? "Automation paused" : "Automation started", {
                  description: active
                    ? "Scraping and applying halted."
                    : "Running across all enabled platforms.",
                });
              }}
              className={cn(
                "gap-2 font-medium text-white",
                active
                  ? "bg-success hover:bg-success/90 animate-pulse-ring"
                  : "bg-muted hover:bg-muted/80 text-foreground",
              )}
            >
              {active ? (
                <>
                  <Pause className="size-4" />
                  <span className="hidden sm:inline">Automation Running</span>
                  <span className="sm:hidden">Running</span>
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