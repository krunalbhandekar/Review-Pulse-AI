"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/config";

export function OnboardingCTA() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border bg-card p-8"
    >
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_60%)]" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-foreground/5 text-foreground">
            <PackagePlus className="size-4" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Connect your first product
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add a Play Store / App Store app, pick a Google Doc, and we'll
            start drafting your weekly review digest. It only takes a minute.
          </p>
        </div>
        <Button asChild size="lg" className="self-start md:self-auto">
          <Link href={ROUTES.products}>
            Add a product <ArrowRight />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}
