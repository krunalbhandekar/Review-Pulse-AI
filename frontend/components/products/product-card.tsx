"use client";

import Link from "next/link";
import {
  ExternalLink,
  Mail,
  MoreVertical,
  Pencil,
  PlayCircle,
  Smartphone,
  Trash2,
} from "lucide-react";
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
import { ROUTES } from "@/lib/config";
import { fmtRelative } from "@/lib/format";
import type { Product } from "@/types/product";

interface Props {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onRunNow: (product: Product) => void;
  isRunning?: boolean;
}

export function ProductCard({ product, onEdit, onDelete, onRunNow, isRunning }: Props) {
  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={ROUTES.product(product.id)}
            className="min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <p className="truncate text-base font-semibold text-foreground">
              {product.productName}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Updated {fmtRelative(product.updatedAt)}
            </p>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Actions">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onRunNow(product)} disabled={isRunning}>
                <PlayCircle /> Run now
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEdit(product)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => onDelete(product)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-5 grid gap-2 text-xs text-muted-foreground">
          {product.playstoreAppId && (
            <Row icon={<Smartphone className="size-3.5" />} label="Play Store">
              <span className="font-mono">{product.playstoreAppId}</span>
            </Row>
          )}
          {product.appstoreAppId && (
            <Row icon={<Smartphone className="size-3.5" />} label="App Store">
              <span className="font-mono">{product.appstoreAppId}</span>
            </Row>
          )}
          {product.emailTo && (
            <Row icon={<Mail className="size-3.5" />} label="Email">
              <span className="truncate">{product.emailTo}</span>
            </Row>
          )}
          {product.googleDocId && (
            <Row icon={<ExternalLink className="size-3.5" />} label="Doc">
              <span className="font-mono">{product.googleDocId}</span>
            </Row>
          )}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Badge variant="muted">Lookback {product.lookbackWeeks}w</Badge>
          <Badge variant={product.emailMode === "send" ? "success" : "warning"}>
            {product.emailMode === "send" ? "Send email" : "Draft email"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-5 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <span className="truncate text-foreground">{children}</span>
    </div>
  );
}
