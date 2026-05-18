"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { logout, startGoogleLogin } from "@/services/auth";
import { ROUTES } from "@/lib/config";
import { initials } from "@/lib/format";

export function UserMenu() {
  const { data: user, isLoading } = useCurrentUser();
  const router = useRouter();
  const { toast } = useToast();

  if (isLoading) {
    return <Skeleton className="size-8 rounded-full" />;
  }

  if (!user) {
    return (
      <Button size="sm" onClick={startGoogleLogin}>
        Sign in
      </Button>
    );
  }

  async function handleLogout() {
    try {
      await logout();
      toast({ title: "Signed out", description: "See you soon." });
      router.push(ROUTES.landing);
      router.refresh();
    } catch {
      toast({ title: "Couldn't sign out", variant: "destructive" });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <Avatar className="size-8">
            {user.picture && <AvatarImage src={user.picture} alt={user.name} />}
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              {user.name}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* <DropdownMenuItem asChild>
          <Link href={ROUTES.settings}>
            <UserIcon /> Profile
          </Link>
        </DropdownMenuItem> */}
        <DropdownMenuItem asChild>
          <Link href={ROUTES.settings}>
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
