import { api } from "@/services/api";
import { MOCK_PRODUCTS, withMockFallback } from "@/lib/mock-data";
import {
  DEFAULT_PAGE_SIZE,
  mockPage,
  type Page,
  type PageParams,
} from "@/types/pagination";
import type { Product, ProductInput } from "@/types/product";

export type ProductSortBy = "createdAt" | "updatedAt" | "productName";
export type SortOrder = "asc" | "desc";

export interface ListProductsParams extends PageParams {
  search?: string;
  sortBy?: ProductSortBy;
  sortOrder?: SortOrder;
}

function matchesSearch(p: Product, q: string): boolean {
  const needle = q.toLowerCase();
  return [p.productName, p.playstoreAppId, p.appstoreAppId, p.emailTo]
    .filter(Boolean)
    .some((v) => v!.toLowerCase().includes(needle));
}

export async function listProducts(
  params: ListProductsParams = {},
): Promise<Page<Product>> {
  const page = params.page ?? 1;
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  const search = params.search?.trim() || undefined;
  return withMockFallback(
    () =>
      api<Page<Product>>("/products", {
        query: {
          page,
          limit,
          search,
          sort_by: params.sortBy,
          sort_order: params.sortOrder,
        },
      }),
    // Mock branch mirrors the server's filter/sort/paginate so the
    // offline dev experience is consistent with prod.
    mockPage(
      filterAndSortMocks(MOCK_PRODUCTS, search, params.sortBy, params.sortOrder),
      page,
      limit,
    ),
  );
}

function filterAndSortMocks(
  rows: Product[],
  search: string | undefined,
  sortBy: ProductSortBy | undefined,
  sortOrder: SortOrder | undefined,
): Product[] {
  let out = search ? rows.filter((p) => matchesSearch(p, search)) : rows.slice();
  const key = sortBy ?? "createdAt";
  const dir = (sortOrder ?? "desc") === "desc" ? -1 : 1;
  out = out.sort((a, b) => {
    const av = (a[key] ?? "") as string;
    const bv = (b[key] ?? "") as string;
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
  return out;
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
