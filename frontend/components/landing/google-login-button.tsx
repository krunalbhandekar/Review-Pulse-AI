"use client";

import { Button } from "@/components/ui/button";
import { startGoogleLogin } from "@/services/auth";
import { cn } from "@/lib/utils";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("size-4", className)}
    >
      <path
        fill="#EA4335"
        d="M12 11.5v3.05h4.27c-.18 1.1-1.32 3.25-4.27 3.25-2.57 0-4.66-2.13-4.66-4.75s2.09-4.75 4.66-4.75c1.46 0 2.44.62 3 1.16l2.05-1.97C15.84 5.55 14.13 4.7 12 4.7 7.94 4.7 4.7 7.94 4.7 12s3.24 7.3 7.3 7.3c4.21 0 7-2.96 7-7.13 0-.48-.05-.85-.12-1.22H12z"
      />
    </svg>
  );
}

interface Props {
  className?: string;
  label?: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
}

export function GoogleLoginButton({
  className,
  label = "Continue with Google",
  size = "lg",
  variant = "default",
}: Props) {
  return (
    <Button
      size={size}
      variant={variant}
      onClick={startGoogleLogin}
      className={cn("min-w-[220px]", className)}
    >
      <GoogleMark />
      {label}
    </Button>
  );
}
