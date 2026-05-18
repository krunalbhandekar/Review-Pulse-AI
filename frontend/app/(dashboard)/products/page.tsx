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
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useDeleteProduct,
  useProducts,
} from "@/hooks/use-products";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRunReport } from "@/hooks/use-reports";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import type { Product } from "@/types/product";

export default function ProductsPage() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  // Debounce the input so we send a single request per typing burst
  // rather than one per keystroke.
  const debouncedSearch = useDebouncedValue(search, 300);

  // Reset to page 1 whenever the active filter changes — otherwise the
  // user could land on (e.g.) page 4 of a much shorter filtered result
  // and see an empty page.
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useProducts({
    page,
    limit: DEFAULT_PAGE_SIZE,
    search: debouncedSearch,
  });
  const products = data?.items ?? [];

  const deleteProduct = useDeleteProduct();
  const runReport = useRunReport();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [toDelete, setToDelete] = React.useState<Product | null>(null);

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

  // Distinguish "no results for this search" from "no products at all"
  // using the server's total. ``total === 0`` with a non-empty search
  // term means the search matched nothing; ``total === 0`` with no
  // search means the user hasn't created any products yet.
  const hasActiveSearch = debouncedSearch.trim().length > 0;
  const totalRows = data?.total ?? 0;

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
      ) : products.length === 0 ? (
        hasActiveSearch ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description="Try a different search term."
          />
        ) : totalRows === 0 ? (
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
          <EmptyState icon={Package} title="No products on this page" />
        )
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
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
          {data && (
            <Pagination
              page={data.page}
              totalPages={data.total_pages}
              total={data.total}
              unit="product"
              onPageChange={setPage}
              busy={isFetching}
            />
          )}
        </>
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
