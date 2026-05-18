export type Frequency = "daily" | "weekly" | "custom";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface Schedule {
  id: string;
  productId: string;
  userId: string;
  frequency: Frequency;
  dayOfWeek?: Weekday | null;
  daysOfWeek?: Weekday[] | null;
  time: string; // HH:MM, 24h
  timezone: string;
  enabled: boolean;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleInput {
  productId: string;
  frequency: Frequency;
  dayOfWeek?: Weekday;
  daysOfWeek?: Weekday[];
  time: string;
  timezone: string;
  enabled: boolean;
}
