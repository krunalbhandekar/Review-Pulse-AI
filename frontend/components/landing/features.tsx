"use client";

import { motion } from "framer-motion";
import {
  CalendarClock,
  FileText,
  Gauge,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    icon: Gauge,
    title: "Weekly pulse, auto-generated",
    body: "Themes, sentiment, quotes, and recommended actions — written for leadership, not analysts.",
  },
  {
    icon: FileText,
    title: "Lives in your Google Doc",
    body: "We append to a doc you control. No new tool to log into; share it the way you already share docs.",
  },
  {
    icon: Mail,
    title: "Delivered to your inbox",
    body: "Send or draft mode. Pick recipients per product, route different lines of business to different teams.",
  },
  {
    icon: CalendarClock,
    title: "Flexible scheduling",
    body: "Daily, weekly, or custom weekdays. Time and timezone per product. Trigger on-demand any time.",
  },
  {
    icon: ShieldCheck,
    title: "Your Google identity",
    body: "OAuth-only. Tokens are stored encrypted and scoped to your account — never a shared service account.",
  },
  {
    icon: Sparkles,
    title: "Multi-product, multi-tenant",
    body: "Track every app you ship. Teammates get isolated workspaces with their own products and schedules.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-b">
      <div className="container py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-muted-foreground">Why teams use it</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Built for product leaders who skim 30 reviews a day
          </h2>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group rounded-xl border bg-card p-6 transition-colors hover:bg-accent/40"
              >
                <div className="mb-4 flex size-9 items-center justify-center rounded-md bg-foreground/5 text-foreground">
                  <Icon className="size-4" />
                </div>
                <h3 className="text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
