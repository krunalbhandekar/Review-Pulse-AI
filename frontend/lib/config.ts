/**
 * Brand and runtime constants.
 *
 * Only one env var crosses the wire: NEXT_PUBLIC_API_URL. Everything else
 * lives here as a typed constant — diffable in git, identical across envs.
 */

export const BRAND = {
  name: "Review Pulse AI",
  // Short form for tight spots (mock URLs, mobile chrome, future favicon
  // theme-color responses, etc.). Lowercase for usability.
  shortName: "RPAI",
  tagline: "AI-Powered Product Review Intelligence",
  description:
    "Turn raw app-store reviews into weekly leadership digests — straight into your Google Doc and inbox.",
} as const;

export const CONTACT_US = {
  address: `${BRAND.name}, Nagpur, Maharashtra, India - 440027`,
  email: {
    privacy: "krunalbhandekar10@gmail.com",
    contact: "krunalbhandekar10@gmail.com",
    support: "krunalbhandekar10@gmail.com",
    security: "krunalbhandekar10@gmail.com",
  },
};

// Shown in footers and as the admin contact (e.g. "AI model unavailable").
export const DEVELOPER = {
  name: "Krunal Bhandekar",
  email: "krunalbhandekar10@gmail.com",
  linkedin: "https://www.linkedin.com/in/krunal-bhandekar/",
} as const;

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const DEFAULTS = {
  lookbackWeeks: 12,
  timezone: "Asia/Kolkata",
  scheduleTime: "06:00",
} as const;

export const ROUTES = {
  landing: "/",
  login: "/login",
  dashboard: "/dashboard",
  products: "/products",
  product: (id: string) => `/products/${id}`,
  schedules: "/schedules",
  reports: "/reports",
  report: (id: string) => `/reports/${id}`,
  settings: "/settings",
  privacyPolicy: "/privacy-policy",
  termsOfService: "/terms-of-service",
} as const;
