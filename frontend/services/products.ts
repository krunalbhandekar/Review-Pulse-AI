import { api } from "@/services/api";
import { MOCK_PRODUCTS, withMockFallback } from "@/lib/mock-data";
import {
  DEFAULT_PAGE_SIZE,
  mockPage,
  type Page,
  type PageParams,
} from "@/types/pagination";
import type { Product, ProductInput } from "@/types/product";

export async function listProducts(
  params: PageParams = {},
): Promise<Page<Product>> {
  const page = params.page ?? 1;
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  return withMockFallback(
    () => api<Page<Product>>("/products", { query: { page, limit } }),
    mockPage(MOCK_PRODUCTS, page, limit),
  );
}

export async function getProduct(id: string): Promise<Product> {
  return withMockFallback(
    () => api<Product>(`/products/${id}`),
    MOCK_PRODUCTS.find((p) => p.id === id) ?? MOCK_PRODUCTS[0],
  );
}

export async function createProduct(input: ProductInput): Promise<Product> {
  return api<Product>("/products", { method: "POST", body: input });
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<Product> {
  return api<Product>(`/products/${id}`, { method: "PATCH", body: input });
}

export async function deleteProduct(id: string): Promise<void> {
  await api<void>(`/products/${id}`, { method: "DELETE" });
}
