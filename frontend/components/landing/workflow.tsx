"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const STEPS = [
  {
    n: "01",
    title: "Connect your Google account",
    body: "One click — we use OAuth and only ask for Docs + Gmail compose scopes.",
  },
  {
    n: "02",
    title: "Add the products you ship",
    body: "Plug in your Play Store and App Store IDs, pick a Google Doc, and a recipient.",
  },
  {
    n: "03",
    title: "Schedule the pulse",
    body: "Daily, weekly, or custom weekdays. Time and timezone per product.",
  },
  {
    n: "04",
    title: "Read it where you work",
    body: "The digest lands in your doc and your inbox — every cycle, on time.",
  },
];

export function Workflow() {
  return (
    <section id="workflow" className="border-b">
      <div className="container py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-muted-foreground">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            From OAuth to insight in under five minutes
          </h2>
        </div>
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="relative rounded-xl border bg-card/60 p-6"
            >
              <div className="mb-3 flex items-center gap-3 text-xs font-medium text-muted-foreground">
                <span className="rounded-md border bg-background px-2 py-0.5 tracking-widest">
                  {step.n}
                </span>
                <CheckCircle2 className="size-4 text-success" />
              </div>
              <h3 className="text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
