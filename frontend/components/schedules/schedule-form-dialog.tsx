"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useProducts } from "@/hooks/use-products";
import {
  useCreateSchedule,
  useUpdateSchedule,
} from "@/hooks/use-schedules";
import { useToast } from "@/hooks/use-toast";
import { DEFAULTS } from "@/lib/config";
import { cn } from "@/lib/utils";
import type {
  Frequency,
  Schedule,
  ScheduleInput,
  Weekday,
} from "@/types/schedule";

const WEEKDAYS: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Australia/Sydney",
  "UTC",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: Schedule | null;
  defaultProductId?: string;
}

function emptyInput(productId: string): ScheduleInput {
  return {
    productId,
    frequency: "weekly",
    dayOfWeek: "monday",
    daysOfWeek: undefined,
    time: DEFAULTS.scheduleTime,
    timezone: DEFAULTS.timezone,
    enabled: true,
  };
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  schedule,
  defaultProductId,
}: Props) {
  const { data: products = [] } = useProducts();
  const create = useCreateSchedule();
  const update = useUpdateSchedule();
  const { toast } = useToast();
  const isEdit = Boolean(schedule);

  const [form, setForm] = React.useState<ScheduleInput>(
    emptyInput(defaultProductId ?? products[0]?.id ?? ""),
  );

  React.useEffect(() => {
    if (!open) return;
    setForm(
      schedule
        ? {
            productId: schedule.productId,
            frequency: schedule.frequency,
            dayOfWeek: schedule.dayOfWeek ?? undefined,
            daysOfWeek: schedule.daysOfWeek ?? undefined,
            time: schedule.time,
            timezone: schedule.timezone,
            enabled: schedule.enabled,
          }
        : emptyInput(defaultProductId ?? products[0]?.id ?? ""),
    );
  }, [schedule, defaultProductId, open, products]);

  function update_<K extends keyof ScheduleInput>(key: K, value: ScheduleInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleDay(day: Weekday) {
    const current = new Set(form.daysOfWeek ?? []);
    if (current.has(day)) current.delete(day);
    else current.add(day);
    update_("daysOfWeek", Array.from(current));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.productId) {
      toast({ title: "Pick a product first", variant: "destructive" });
      return;
    }

    const payload: ScheduleInput = {
      ...form,
      dayOfWeek: form.frequency === "weekly" ? form.dayOfWeek : undefined,
      daysOfWeek:
        form.frequency === "custom"
          ? form.daysOfWeek?.length
            ? form.daysOfWeek
            : ["monday"]
          : undefined,
    };

    try {
      if (isEdit && schedule) {
        await update.mutateAsync({ id: schedule.id, input: payload });
        toast({ title: "Schedule updated" });
      } else {
        await create.mutateAsync(payload);
        toast({ title: "Schedule created" });
      }
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Couldn't save schedule",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  }

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit schedule" : "New schedule"}</DialogTitle>
            <DialogDescription>
              Daily, weekly, or hand-picked weekdays — your call.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select
                value={form.productId}
                onValueChange={(v) => update_("productId", v)}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose product…" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.productName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["daily", "weekly", "custom"] as Frequency[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => update_("frequency", f)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors",
                      form.frequency === f
                        ? "border-foreground bg-foreground text-background"
                        : "border-input bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {form.frequency === "weekly" && (
              <div className="space-y-1.5">
                <Label>Day of week</Label>
                <Select
                  value={form.dayOfWeek ?? "monday"}
                  onValueChange={(v) => update_("dayOfWeek", v as Weekday)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((d) => (
                      <SelectItem key={d} value={d} className="capitalize">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.frequency === "custom" && (
              <div className="space-y-1.5">
                <Label>Days of week</Label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((d) => {
                    const active = form.daysOfWeek?.includes(d);
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() => toggleDay(d)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-input text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {d.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => update_("time", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Select
                  value={form.timezone}
                  onValueChange={(v) => update_("timezone", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Enabled</p>
                <p className="text-xs text-muted-foreground">
                  Pausing keeps the schedule but skips runs.
                </p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => update_("enabled", v)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {isEdit ? "Save changes" : "Create schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
