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
  type ListProductsParams,
} from "@/services/products";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import type { ProductInput } from "@/types/product";

// Query key encodes every server-meaningful param so React Query treats
// each filter combination as its own cache entry.
export const productsListKey = (params: ListProductsParams = {}) =>
  [
    "products",
    "list",
    {
      page: params.page ?? 1,
      limit: params.limit ?? DEFAULT_PAGE_SIZE,
      search: params.search ?? "",
      sortBy: params.sortBy ?? "createdAt",
      sortOrder: params.sortOrder ?? "desc",
    },
  ] as const;

export const productsKey = (id: string) => ["products", id] as const;

export function useProducts(params: ListProductsParams = {}) {
  return useQuery({
    queryKey: productsListKey(params),
    queryFn: () => listProducts(params),
    // Keep the previous page on screen while the next one loads — no
    // "blink to empty" between pages or while debouncing search.
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
