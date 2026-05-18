"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  hint?: string;
}

export function StatCard({ label, value, icon: Icon, delta, hint }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      // ``min-w-0`` so a long ``hint`` or a ``value`` like a relative
      // timestamp ("3 weeks ago") can't expand the grid track and push
      // neighbouring cards off-screen.
      className="min-w-0 rounded-xl border bg-card p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <div className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-3.5" />
          </div>
        )}
      </div>
      <p className="mt-3 truncate text-3xl font-semibold tracking-tight">
        {value}
      </p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium",
              delta.direction === "up" && "bg-success/10 text-success",
              delta.direction === "down" && "bg-destructive/10 text-destructive",
              delta.direction === "flat" && "bg-muted text-muted-foreground",
            )}
          >
            {delta.direction === "up" && <ArrowUpRight className="size-3" />}
            {delta.direction === "down" && <ArrowDownRight className="size-3" />}
            {delta.value}
          </span>
        )}
        {hint && (
          <span className="truncate text-muted-foreground">{hint}</span>
        )}
      </div>
    </motion.div>
  );
}
