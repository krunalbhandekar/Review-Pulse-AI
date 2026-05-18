"use client";

import * as React from "react";
import { Package, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CardListShimmer } from "@/components/shared/loading-shimmer";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ProductCard } from "@/components/products/product-card";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useDeleteProduct,
  useProducts,
} from "@/hooks/use-products";
import { useRunReport } from "@/hooks/use-reports";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/types/product";

export default function ProductsPage() {
  const { data: products = [], isLoading, isError, refetch } = useProducts();
  const deleteProduct = useDeleteProduct();
  const runReport = useRunReport();
  const { toast } = useToast();

  const [search, setSearch] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [toDelete, setToDelete] = React.useState<Product | null>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.productName, p.playstoreAppId, p.appstoreAppId, p.emailTo]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [products, search]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteProduct.mutateAsync(toDelete.id);
      toast({ title: "Product deleted", description: toDelete.productName });
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

  async function runNow(p: Product) {
    try {
      await runReport.mutateAsync({ productId: p.id });
      toast({
        title: "Run queued",
        description: `${p.productName} report is generating.`,
      });
    } catch (err) {
      toast({
        title: "Couldn't queue run",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Connect every app you ship. Each product gets its own digest cadence and delivery."
        actions={
          <Button onClick={openCreate}>
            <Plus /> New product
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products by name or app ID…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <CardListShimmer count={6} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add your first product to start generating weekly review intelligence."
            action={
              <Button onClick={openCreate}>
                <Plus /> Connect your first product
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No matches"
            description="Try a different search term."
          />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onEdit={openEdit}
              onDelete={setToDelete}
              onRunNow={runNow}
              isRunning={runReport.isPending}
            />
          ))}
        </div>
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete product?"
        description={
          toDelete
            ? `This deletes "${toDelete.productName}" and all of its schedules. Past reports are kept for your records.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        busy={deleteProduct.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
