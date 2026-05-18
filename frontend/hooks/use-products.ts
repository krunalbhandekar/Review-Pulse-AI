"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "@/services/products";
import { DEFAULT_PAGE_SIZE, type PageParams } from "@/types/pagination";
import type { ProductInput } from "@/types/product";

// All product caches share the "products" root so mutations invalidate
// every paginated slice at once. The page+limit are baked into the key
// so React Query treats each page as its own cache entry.
export const productsKey = (params?: PageParams | string) => {
  if (typeof params === "string") return ["products", params] as const;
  return [
    "products",
    "list",
    { page: params?.page ?? 1, limit: params?.limit ?? DEFAULT_PAGE_SIZE },
  ] as const;
};

export function useProducts(params: PageParams = {}) {
  return useQuery({
    queryKey: productsKey(params),
    queryFn: () => listProducts(params),
    // Avoids the "blink to empty" when paging — keep showing the
    // previous page while the next one loads.
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productsKey(id),
    queryFn: () => getProduct(id),
    enabled: Boolean(id),
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  // Match every paginated key under the "products" root.
  qc.invalidateQueries({ queryKey: ["products"] });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductInput) => createProduct(input),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProductInput> }) =>
      updateProduct(id, input),
    onSuccess: (_data, { id }) => {
      invalidateAll(qc);
      qc.invalidateQueries({ queryKey: productsKey(id) });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => invalidateAll(qc),
  });
}
