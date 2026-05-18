import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        // Status variants: bg uses a 15% wash, text uses the theme-aware
        // *-on-tint token so contrast stays >=5:1 in light mode (the brand
        // colours alone read at <2:1 against pale tints on white). Dark
        // mode keeps the vibrant brand tone via the same token.
        success: "border-transparent bg-success/15 text-success-on-tint",
        warning: "border-transparent bg-warning/15 text-warning-on-tint",
        destructive:
          "border-transparent bg-destructive/15 text-destructive-on-tint",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
