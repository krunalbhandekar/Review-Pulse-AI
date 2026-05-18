"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "@/services/products";
import type { ProductInput } from "@/types/product";

export const productsKey = (id?: string) =>
  id ? (["products", id] as const) : (["products"] as const);

export function useProducts() {
  return useQuery({ queryKey: productsKey(), queryFn: listProducts });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productsKey(id),
    queryFn: () => getProduct(id),
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductInput) => createProduct(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKey() }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProductInput> }) =>
      updateProduct(id, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: productsKey() });
      qc.invalidateQueries({ queryKey: productsKey(id) });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKey() }),
  });
}
