"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { logout, startGoogleLogin } from "@/services/auth";
import { fmtDate, initials } from "@/lib/format";
import { ROUTES } from "@/lib/config";

export default function SettingsPage() {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();
  const { toast } = useToast();
  const [signingOut, setSigningOut] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await logout();
      router.replace(ROUTES.landing);
      router.refresh();
    } catch (err) {
      toast({
        title: "Couldn't sign out",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your profile and Google connection."
      />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your details come from Google — update them there to update them
            here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              {user?.picture && (
                <AvatarImage src={user.picture} alt={user.name} />
              )}
              <AvatarFallback className="text-base">
                {initials(user?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="mt-2 h-3 w-56" />
                </>
              ) : (
                <>
                  <p className="truncate text-sm font-medium">{user?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Member since {fmtDate(user?.createdAt)}
                  </p>
                </>
              )}
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input disabled value={user?.name ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input disabled value={user?.email ?? ""} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google connection</CardTitle>
          <CardDescription>
            Re-authorize if you've revoked our access in your Google account, or
            if Docs / Gmail calls start failing.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">{user?.email}</p>
            <p className="text-xs text-muted-foreground">
              Docs + Gmail scopes are granted to your account.
            </p>
          </div>
          <Button variant="outline" onClick={startGoogleLogin}>
            <RefreshCw /> Reconnect Google
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Sign out of this device. Your data stays put.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={signingOut}
          >
            {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
            Sign out
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Sign out?"
        description="You'll need to sign back in with Google to access your workspace."
        confirmLabel="Sign out"
        destructive
        busy={signingOut}
        onConfirm={handleSignOut}
      />
    </div>
  );
}
