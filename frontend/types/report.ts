export type ReportStatus = "success" | "partial" | "failed";

export interface Report {
  id: string;
  productId: string;
  userId: string;
  scheduleId?: string | null;
  reportTitle: string;
  summary: string;
  googleDocUrl?: string | null;
  googleDocId?: string | null;
  reviewCount: number;
  status: ReportStatus;
  generatedAt: string;
  deliveryMeta: {
    doc?: { status?: string };
    email?: { status?: string; mode?: "send" | "draft" };
    doc_error?: string;
    email_error?: string;
  };
  error?: string | null;
}
