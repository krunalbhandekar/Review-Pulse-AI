"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_TRENDS } from "@/lib/mock-data";

export function TrendsChart() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Review volume</CardTitle>
          <CardDescription>Last 7 weeks, all products combined</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="h-[260px] pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={MOCK_TRENDS} margin={{ top: 10, left: -16, right: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="reviewsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.25} />
                <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              cursor={{ stroke: "hsl(var(--border))" }}
            />
            <Area
              type="monotone"
              dataKey="reviews"
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              fill="url(#reviewsGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
