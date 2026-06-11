import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { RecentMatches } from "@/components/dashboard/recent-matches";
import { PipelineTracker } from "@/components/dashboard/pipeline-tracker";
import { ActivityLog } from "@/components/dashboard/activity-log";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { fetchDashboardMetrics, type DashboardMetrics } from "@/lib/jobs-api";
import { Briefcase, Send, Target, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    fetchDashboardMetrics()
      .then(setMetrics)
      .catch(() => toast.error("Could not load dashboard metrics"));
  }, []);

  return (
    <AppShell title="Dashboard">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Jobs Found Today"
            value={metrics ? String(metrics.jobsFoundToday) : "—"}
            subtitle="across all platforms"
            icon={Briefcase}
            tone="info"
          />
          <MetricCard
            label="Applications Sent"
            value={metrics ? String(metrics.applicationsSentToday) : "—"}
            subtitle="today"
            icon={Send}
            tone="success"
          />
          <MetricCard
            label="Match Rate"
            value={metrics ? `${metrics.matchRate}%` : "—"}
            subtitle="jobs above 75% match"
            icon={Target}
            tone="warning"
          />
          <MetricCard
            label="Emails Queued"
            value={metrics ? String(metrics.emailsQueued) : "—"}
            subtitle="to recruiters"
            icon={Mail}
            tone="info"
          />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><RecentMatches /></div>
          <div><PipelineTracker /></div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <WeeklyChart />
          <ActivityLog />
        </div>
      </div>
    </AppShell>
  );
}