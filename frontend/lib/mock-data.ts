/**
 * Mock data used when the backend is unreachable or returns 404 for
 * endpoints that don't exist yet. Hooks call these via `withMockFallback`
 * so the UI is always populated for development.
 */

import type { Product } from "@/types/product";
import type { Schedule } from "@/types/schedule";
import type { Report } from "@/types/report";
import type { User } from "@/types/auth";

const now = new Date();
const days = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_USER: User = {
  id: "u_demo",
  name: "Krunal Patel",
  email: "demo@example.com",
  picture: null,
  createdAt: days(120),
};

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p_groww",
    userId: MOCK_USER.id,
    productName: "Groww",
    playstoreAppId: "com.nextbillion.groww",
    appstoreAppId: "1404871703",
    googleDocId: "doc_groww",
    emailTo: "team@example.com",
    lookbackWeeks: 12,
    emailMode: "send",
    createdAt: days(80),
    updatedAt: days(2),
  },
  {
    id: "p_zerodha",
    userId: MOCK_USER.id,
    productName: "Zerodha Kite",
    playstoreAppId: "com.zerodha.kite3",
    appstoreAppId: "1449453802",
    googleDocId: null,
    emailTo: "leads@example.com",
    lookbackWeeks: 8,
    emailMode: "draft",
    createdAt: days(30),
    updatedAt: days(1),
  },
  {
    id: "p_swiggy",
    userId: MOCK_USER.id,
    productName: "Swiggy",
    playstoreAppId: "in.swiggy.android",
    appstoreAppId: "989540920",
    googleDocId: "doc_swiggy",
    emailTo: "growth@example.com",
    lookbackWeeks: 6,
    emailMode: "send",
    createdAt: days(15),
    updatedAt: days(7),
  },
];

export const MOCK_SCHEDULES: Schedule[] = [
  {
    id: "s_groww",
    productId: "p_groww",
    userId: MOCK_USER.id,
    frequency: "weekly",
    dayOfWeek: "monday",
    daysOfWeek: null,
    time: "06:00",
    timezone: "Asia/Kolkata",
    enabled: true,
    nextRunAt: days(-3),
    lastRunAt: days(4),
    createdAt: days(80),
    updatedAt: days(2),
  },
  {
    id: "s_zerodha",
    productId: "p_zerodha",
    userId: MOCK_USER.id,
    frequency: "daily",
    dayOfWeek: null,
    daysOfWeek: null,
    time: "09:30",
    timezone: "Asia/Kolkata",
    enabled: false,
    nextRunAt: null,
    lastRunAt: days(8),
    createdAt: days(30),
    updatedAt: days(1),
  },
  {
    id: "s_swiggy",
    productId: "p_swiggy",
    userId: MOCK_USER.id,
    frequency: "custom",
    dayOfWeek: null,
    daysOfWeek: ["tuesday", "friday"],
    time: "07:00",
    timezone: "Asia/Kolkata",
    enabled: true,
    nextRunAt: days(-1),
    lastRunAt: days(3),
    createdAt: days(15),
    updatedAt: days(7),
  },
];

const sampleSummary = `## Top themes

- **Login + 2FA friction** keeps surfacing as the #1 complaint, especially after the last release.
- **Order tracking accuracy** has improved week-over-week (+12% positive sentiment).
- **Wallet refunds** continue to be slow — multiple 1-star reviews mention 5+ day waits.

## Notable quotes

> "App is fast but the OTP screen gets stuck half the time." — Play Store · 2/5
> "Refunds used to take a day, now it's been a week and counting." — App Store · 1/5
> "New tracking screen is way better than before, finally feels modern." — Play Store · 5/5

## Recommended actions

1. Audit the OTP flow on Android 14 devices — disproportionate share of complaints.
2. Publish a public refund SLA; reviewers are explicitly comparing us to competitors.
3. Keep the tracking redesign momentum — promote it in the next release notes.

## Overall sentiment

Net sentiment ticked **+4 points** week-over-week, mostly driven by tracking
improvements offsetting persistent refund frustration. Sentiment among
power users (5+ orders/month) is materially stronger than first-time users.`;

export const MOCK_REPORTS: Report[] = [
  {
    id: "r_001",
    productId: "p_groww",
    userId: MOCK_USER.id,
    scheduleId: "s_groww",
    reportTitle: "Groww — Weekly Review Pulse",
    summary: sampleSummary,
    googleDocUrl: "https://docs.google.com/document/d/doc_groww/edit",
    googleDocId: "doc_groww",
    reviewCount: 248,
    status: "success",
    generatedAt: days(2),
    deliveryMeta: { doc: { status: "success" }, email: { status: "success", mode: "send" } },
    error: null,
  },
  {
    id: "r_002",
    productId: "p_swiggy",
    userId: MOCK_USER.id,
    scheduleId: "s_swiggy",
    reportTitle: "Swiggy — Weekly Review Pulse",
    summary: sampleSummary,
    googleDocUrl: "https://docs.google.com/document/d/doc_swiggy/edit",
    googleDocId: "doc_swiggy",
    reviewCount: 412,
    status: "partial",
    generatedAt: days(3),
    deliveryMeta: { doc: { status: "success" }, email_error: "User has not connected Gmail" },
    error: null,
  },
  {
    id: "r_003",
    productId: "p_groww",
    userId: MOCK_USER.id,
    scheduleId: "s_groww",
    reportTitle: "Groww — Weekly Review Pulse",
    summary: sampleSummary,
    googleDocUrl: "https://docs.google.com/document/d/doc_groww/edit",
    googleDocId: "doc_groww",
    reviewCount: 219,
    status: "success",
    generatedAt: days(9),
    deliveryMeta: { doc: { status: "success" }, email: { status: "success", mode: "send" } },
    error: null,
  },
  {
    id: "r_004",
    productId: "p_zerodha",
    userId: MOCK_USER.id,
    scheduleId: "s_zerodha",
    reportTitle: "Zerodha Kite — Weekly Review Pulse",
    summary: sampleSummary,
    googleDocUrl: null,
    googleDocId: null,
    reviewCount: 0,
    status: "failed",
    generatedAt: days(11),
    deliveryMeta: {},
    error: "ingest_failed: rate-limited by Play Store",
  },
];

export const MOCK_TRENDS = [
  { week: "W1", reviews: 180, sentiment: 64 },
  { week: "W2", reviews: 212, sentiment: 61 },
  { week: "W3", reviews: 198, sentiment: 67 },
  { week: "W4", reviews: 241, sentiment: 70 },
  { week: "W5", reviews: 219, sentiment: 68 },
  { week: "W6", reviews: 263, sentiment: 72 },
  { week: "W7", reviews: 248, sentiment: 75 },
];

/**
 * Run a real API call; if the backend returns 404 / fails with a network
 * error, fall back to the provided mock so the UI keeps working in
 * dev environments where the backend isn't fully wired yet.
 */
export async function withMockFallback<T>(
  call: () => Promise<T>,
  mock: T,
): Promise<T> {
  try {
    return await call();
  } catch (err: unknown) {
    const status = (err as { status?: number } | null)?.status ?? 0;
    if (status === 0 || status === 404 || status === 501) {
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-console
        console.warn("[mock-fallback] using mock data:", err);
      }
      return mock;
    }
    throw err;
  }
}
