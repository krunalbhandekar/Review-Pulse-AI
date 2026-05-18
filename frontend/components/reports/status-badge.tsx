import { Badge } from "@/components/ui/badge";
import type { ReportStatus } from "@/types/report";

const LABEL: Record<ReportStatus, string> = {
  success: "Success",
  partial: "Partial",
  failed: "Failed",
};

const VARIANT: Record<ReportStatus, "success" | "warning" | "destructive"> = {
  success: "success",
  partial: "warning",
  failed: "destructive",
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
