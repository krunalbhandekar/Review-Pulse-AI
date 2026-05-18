"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateProduct, useProducts, useUpdateProduct } from "@/hooks/use-products";
import { useToast } from "@/hooks/use-toast";
import { DEFAULTS } from "@/lib/config";
import { MAX_PAGE_SIZE } from "@/types/pagination";
import type { Product, ProductInput } from "@/types/product";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

const EMPTY: ProductInput = {
  productName: "",
  playstoreAppId: "",
  appstoreAppId: "",
  googleDocId: "",
  emailTo: "",
  lookbackWeeks: DEFAULTS.lookbackWeeks,
  emailMode: "send",
};

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: ProductFormDialogProps) {
  const isEdit = Boolean(product);
  // Used only for the local duplicate-name check; the server's unique
  // index is the actual enforcement. MAX_PAGE_SIZE is enough to cover
  // the realistic small-tenant case without paying for a full list endpoint.
  const { data: productsPage } = useProducts({ limit: MAX_PAGE_SIZE });
  const products = productsPage?.items ?? [];
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const { toast } = useToast();

  const [form, setForm] = React.useState<ProductInput>(EMPTY);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      product
        ? {
            productName: product.productName,
            playstoreAppId: product.playstoreAppId ?? "",
            appstoreAppId: product.appstoreAppId ?? "",
            googleDocId: product.googleDocId ?? "",
            emailTo: product.emailTo ?? "",
            lookbackWeeks: product.lookbackWeeks,
            emailMode: product.emailMode,
          }
        : EMPTY,
    );
  }, [product, open]);

  function update_<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const name = form.productName.trim();
    if (!name) {
      setError("Product name is required.");
      return;
    }

    // Client-side duplicate check — server enforces this too via a unique index.
    const dup = products.find(
      (p) =>
        p.productName.toLowerCase() === name.toLowerCase() && p.id !== product?.id,
    );
    if (dup) {
      setError("You already have a product with that name.");
      return;
    }

    const payload: ProductInput = {
      ...form,
      productName: name,
      playstoreAppId: form.playstoreAppId?.trim() || undefined,
      appstoreAppId: form.appstoreAppId?.trim() || undefined,
      googleDocId: form.googleDocId?.trim() || undefined,
      emailTo: form.emailTo?.trim() || undefined,
    };

    try {
      if (isEdit && product) {
        await update.mutateAsync({ id: product.id, input: payload });
        toast({ title: "Product updated", description: name });
      } else {
        await create.mutateAsync(payload);
        toast({ title: "Product created", description: name });
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ?? "Something went wrong.";
      setError(message);
    }
  }

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit product" : "New product"}</DialogTitle>
            <DialogDescription>
              Track an app across Play Store + App Store and route its weekly
              digest to a Google Doc and a recipient.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <Field
              label="Product name"
              hint="Must be unique within your workspace."
            >
              <Input
                value={form.productName}
                onChange={(e) => update_("productName", e.target.value)}
                placeholder="Groww"
                autoFocus
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Play Store app ID" hint="e.g. com.nextbillion.groww">
                <Input
                  value={form.playstoreAppId ?? ""}
                  onChange={(e) => update_("playstoreAppId", e.target.value)}
                  placeholder="com.example.app"
                />
              </Field>
              <Field label="App Store app ID" hint="Numeric ID from iTunes URL">
                <Input
                  value={form.appstoreAppId ?? ""}
                  onChange={(e) => update_("appstoreAppId", e.target.value)}
                  placeholder="1404871703"
                />
              </Field>
            </div>

            <Field label="Google Doc ID" hint="Leave blank to auto-create a new doc.">
              <Input
                value={form.googleDocId ?? ""}
                onChange={(e) => update_("googleDocId", e.target.value)}
                placeholder="1A2B3C…"
              />
            </Field>

            <Field label="Email recipient">
              <Input
                type="email"
                value={form.emailTo ?? ""}
                onChange={(e) => update_("emailTo", e.target.value)}
                placeholder="team@example.com"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Lookback window (weeks)">
                <Input
                  type="number"
                  min={1}
                  max={52}
                  value={form.lookbackWeeks}
                  onChange={(e) =>
                    update_("lookbackWeeks", Number(e.target.value) || 1)
                  }
                />
              </Field>
              <Field label="Email mode">
                <Select
                  value={form.emailMode}
                  onValueChange={(v) =>
                    update_("emailMode", v as ProductInput["emailMode"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send">Send</SelectItem>
                    <SelectItem value="draft">Draft only</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {isEdit ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
