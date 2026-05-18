"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReportStatus } from "@/types/report";
import type { Product } from "@/types/product";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  status: ReportStatus | "all";
  onStatusChange: (v: ReportStatus | "all") => void;
  productId: string | "all";
  onProductChange: (v: string | "all") => void;
  products: Product[];
}

export function ReportFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  productId,
  onProductChange,
  products,
}: Props) {
  return (
    // Mobile: search takes a full row, the two selects share the second
    // row 50/50. From sm up the whole bar collapses back to a single
    // line and the selects pick up their fixed widths.
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <div className="relative w-full sm:max-w-sm sm:flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search reports…"
          className="pl-9"
        />
      </div>
      <Select
        value={status}
        onValueChange={(v) => onStatusChange(v as ReportStatus | "all")}
      >
        <SelectTrigger className="min-w-0 flex-1 sm:w-[140px] sm:flex-none">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="success">Success</SelectItem>
          <SelectItem value="partial">Partial</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>
      <Select value={productId} onValueChange={(v) => onProductChange(v)}>
        <SelectTrigger className="min-w-0 flex-1 sm:w-[200px] sm:flex-none">
          <SelectValue placeholder="Product" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All products</SelectItem>
          {products.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.productName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
