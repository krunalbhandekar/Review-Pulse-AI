"use client";

import * as React from "react";
import { CalendarClock, MoreVertical, Pencil, PlayCircle, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableShimmer } from "@/components/shared/loading-shimmer";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ScheduleFormDialog } from "@/components/schedules/schedule-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useProducts } from "@/hooks/use-products";
import {
  useDeleteSchedule,
  useSchedules,
  useUpdateSchedule,
} from "@/hooks/use-schedules";
import { useRunReport } from "@/hooks/use-reports";
import { useToast } from "@/hooks/use-toast";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import { ROUTES } from "@/lib/config";
import type { Schedule } from "@/types/schedule";

function describeCadence(s: Schedule): string {
  if (s.frequency === "daily") return `Daily · ${s.time} ${s.timezone}`;
  if (s.frequency === "weekly")
    return `Weekly on ${s.dayOfWeek ?? "monday"} · ${s.time} ${s.timezone}`;
  const days = (s.daysOfWeek ?? []).map((d) => d.slice(0, 3)).join(", ");
  return `Custom · ${days} · ${s.time} ${s.timezone}`;
}

export default function SchedulesPage() {
  const { data: schedules = [], isLoading, isError, refetch } = useSchedules();
  const { data: products = [] } = useProducts();
  const update = useUpdateSchedule();
  const remove = useDeleteSchedule();
  const run = useRunReport();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Schedule | null>(null);
  const [toDelete, setToDelete] = React.useState<Schedule | null>(null);

  const productNameById = React.useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p.productName])),
    [products],
  );

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(s: Schedule) {
    setEditing(s);
    setFormOpen(true);
  }

  async function toggleEnabled(s: Schedule, enabled: boolean) {
    try {
      await update.mutateAsync({ id: s.id, input: { enabled } });
    } catch (err) {
      toast({
        title: "Couldn't update",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  }

  async function runNow(s: Schedule) {
    try {
      await run.mutateAsync({ productId: s.productId });
      toast({
        title: "Run queued",
        description: productNameById[s.productId] ?? "Report generating",
      });
    } catch (err) {
      toast({
        title: "Couldn't queue run",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await remove.mutateAsync(toDelete.id);
      toast({ title: "Schedule deleted" });
    } catch (err) {
      toast({
        title: "Couldn't delete",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setToDelete(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedules"
        description="Choose when each product's digest runs. Pause anytime — past reports stay intact."
        actions={
          <Button onClick={openCreate} disabled={products.length === 0}>
            <Plus /> New schedule
          </Button>
        }
      />

      {isLoading ? (
        <TableShimmer rows={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : schedules.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No schedules yet"
          description={
            products.length === 0
              ? "Add a product first — schedules attach to products."
              : "Create a schedule to automate this product's weekly review pulse."
          }
          action={
            products.length === 0 ? (
              <Button asChild>
                <Link href={ROUTES.products}>Add a product</Link>
              </Button>
            ) : (
              <Button onClick={openCreate}>
                <Plus /> Create schedule
              </Button>
            )
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Cadence</TableHead>
                  <TableHead>Next run</TableHead>
                  <TableHead>Last run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link
                        href={ROUTES.product(s.productId)}
                        className="font-medium hover:underline underline-offset-4"
                      >
                        {productNameById[s.productId] ?? s.productId}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {describeCadence(s)}
                    </TableCell>
                    <TableCell>{fmtDateTime(s.nextRunAt)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {fmtRelative(s.lastRunAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={s.enabled}
                          onCheckedChange={(v) => toggleEnabled(s, v)}
                        />
                        <Badge variant={s.enabled ? "success" : "muted"}>
                          {s.enabled ? "Active" : "Paused"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => runNow(s)}>
                            <PlayCircle /> Run now
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openEdit(s)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => setToDelete(s)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ScheduleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        schedule={editing}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete schedule?"
        description="Past reports stay; the schedule simply won't run anymore."
        confirmLabel="Delete"
        destructive
        busy={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
