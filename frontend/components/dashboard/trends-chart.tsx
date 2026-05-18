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
    // ``min-w-0 w-full`` defends against grid/flex parents that haven't
    // set ``min-width: 0`` themselves — without it, Recharts' SVG can
    // push the card past the viewport on mobile and the page scrolls
    // horizontally. ``overflow-hidden`` clips the inner SVG to the card's
    // rounded corners (tooltips render in a portal, unaffected).
    <Card className="w-full min-w-0 overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2 sm:p-6 sm:pb-2">
        <div className="min-w-0">
          <CardTitle className="truncate">Review volume</CardTitle>
          <CardDescription className="truncate">
            Last 7 weeks, all products combined
          </CardDescription>
        </div>
      </CardHeader>
      {/*
        Mobile: tighter horizontal padding so the 360px viewport leaves
        more room for the plot area. Slightly shorter height so the
        chart doesn't dominate the fold on phones.
        Desktop (sm+): restore generous padding + the original height.
      */}
      <CardContent className="h-[220px] px-2 pb-3 pt-0 sm:h-[260px] sm:px-6 sm:pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={MOCK_TRENDS}
            // No negative left margin: the parent's padding already
            // pulls the Y-axis close to the card edge, and going
            // negative on a 360px viewport clipped the axis labels.
            margin={{ top: 8, left: 0, right: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="reviewsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.25} />
                <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              // ``preserveStartEnd`` keeps the first/last labels visible
              // on narrow viewports while letting recharts drop the
              // middle ones to avoid overlap.
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
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
