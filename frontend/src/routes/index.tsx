import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { RecentMatches } from "@/components/dashboard/recent-matches";
import { PipelineTracker } from "@/components/dashboard/pipeline-tracker";
import { ActivityLog } from "@/components/dashboard/activity-log";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { AutomationControls } from "@/components/automation-controls";
import { fetchDashboardMetrics, type DashboardMetrics } from "@/lib/jobs-api";
import { Briefcase, Send, Target, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDashboardMetrics();
      setMetrics(data);
    } catch (e) {
      toast.error("Could not load dashboard metrics", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return (
    <AppShell title="Dashboard">
      <div className="flex flex-col gap-6">
        <AutomationControls />

        {/* metric cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Jobs"
            value={loading ? "—" : String(metrics?.jobsFoundToday ?? 0)}
            subtitle="in your database"
            icon={Briefcase}
            tone="info"
          />
          <MetricCard
            label="Applications Sent"
            value={loading ? "—" : String(metrics?.applicationsSentToday ?? 0)}
            subtitle="today"
            icon={Send}
            tone="success"
          />
          <MetricCard
            label="Match Rate"
            value={loading ? "—" : `${metrics?.matchRate ?? 0}%`}
            subtitle="jobs above 75% match"
            icon={Target}
            tone="warning"
          />
          <MetricCard
            label="Emails Queued"
            value={loading ? "—" : String(metrics?.emailsQueued ?? 0)}
            subtitle="pending outreach"
            icon={Mail}
            tone="info"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentMatches />
          </div>
          <div>
            <PipelineTracker />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <WeeklyChart />
          <ActivityLog />
        </div>
      </div>
    </AppShell>
  );
}