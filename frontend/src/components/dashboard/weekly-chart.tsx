"use client"

import { Card } from "@/components/ui/card"
import { weeklyActivity } from "@/lib/data"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export function WeeklyChart() {
  return (
    <Card className="flex flex-col gap-1 p-5">
      <h2 className="text-base font-semibold text-foreground">Weekly Activity</h2>
      <p className="mb-3 text-sm text-muted-foreground">Jobs scraped vs. applications sent</p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={weeklyActivity} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="scrapedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="appliedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
            <XAxis dataKey="day" stroke="#8b8b8b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#8b8b8b" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: 8,
                color: "#fafafa",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="scraped"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#scrapedFill)"
              name="Scraped"
            />
            <Area
              type="monotone"
              dataKey="applied"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#appliedFill)"
              name="Applied"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
