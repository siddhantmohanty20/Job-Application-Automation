import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Briefcase,
  Send,
  FileText,
  Mail,
  Table,
  Settings,
  Zap,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useAutomation } from "@/context/automation-context";
import { useProfile } from "@/context/profile-context";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/profile", label: "Profile", icon: UserCircle, isProfile: true },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/applications", label: "Applications", icon: Send },
  { href: "/resume-vault", label: "Resume Vault", icon: FileText },
  { href: "/email-outreach", label: "Email Outreach", icon: Mail },
  { href: "/sheets-sync", label: "Google Sheets Sync", icon: Table },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { active, toggle } = useAutomation();
  const { completion } = useProfile();
  const profileIncomplete = completion < 100;

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
          <Zap className="size-5 text-primary-foreground" fill="currentColor" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight text-foreground">
            AutoApply
          </span>
          <span className="text-xs text-muted-foreground">Job Automation</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <span className="relative inline-flex">
                <Icon className="size-4 shrink-0" />
                {item.isProfile && profileIncomplete && (
                  <span
                    aria-label="Profile incomplete"
                    className="absolute -right-1 -top-1 size-2 rounded-full bg-warning ring-2 ring-sidebar"
                  />
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-between rounded-lg bg-sidebar-accent px-3 py-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "size-2.5 rounded-full",
                active ? "bg-success animate-pulse-ring" : "bg-danger",
              )}
            />
            <span className="text-sm font-medium text-foreground">
              {active ? "Automation Active" : "Paused"}
            </span>
          </div>
          <Switch checked={active} onCheckedChange={toggle} aria-label="Toggle automation" />
        </div>
      </div>
    </div>
  );
}
