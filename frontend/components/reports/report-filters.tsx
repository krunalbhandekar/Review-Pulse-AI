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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search reports…"
          className="pl-9"
        />
      </div>
      <div className="flex gap-2">
        <Select value={status} onValueChange={(v) => onStatusChange(v as ReportStatus | "all")}>
          <SelectTrigger className="w-[140px]">
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
          <SelectTrigger className="w-[200px]">
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
    </div>
  );
}
