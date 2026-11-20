import { queryOptions } from "@tanstack/react-query";
import { getCoupons, getCategories, getPage, getPost, getPostCategories, getPosts, getProduct, getProducts, getShippingMethods } from "./store.functions";

const MIN = 60_000;

export type ProductQuery = {
  page?: number | undefined;
  perPage?: number | undefined;
  category?: number | undefined;
  search?: string | undefined;
  featured?: boolean | undefined;
  orderby?: "date" | "price" | "popularity" | undefined;
  order?: "asc" | "desc" | undefined;
};

export const productsQuery = (q: ProductQuery) =>
  queryOptions({ queryKey: ["products", q], queryFn: () => getProducts({ data: q as never }), staleTime: MIN });
export const productQuery = (slug: string) =>
  queryOptions({ queryKey: ["product", slug], queryFn: () => getProduct({ data: { slug } }), staleTime: MIN });
export const categoriesQuery = () =>
  queryOptions({ queryKey: ["categories"], queryFn: () => getCategories(), staleTime: 5 * MIN });
export type PostQuery = { page: number; perPage: number; category?: number | undefined; search?: string | undefined };
export const postsQuery = (q: PostQuery) =>
  queryOptions({ queryKey: ["posts", q], queryFn: () => getPosts({ data: q }), staleTime: 5 * MIN });
export const postCategoriesQuery = () =>
  queryOptions({ queryKey: ["post-categories"], queryFn: () => getPostCategories(), staleTime: 5 * MIN });
export const postQuery = (slug: string) =>
  queryOptions({ queryKey: ["post", slug], queryFn: () => getPost({ data: { slug } }), staleTime: 5 * MIN });
export const pageQuery = (slug: string) =>
  queryOptions({ queryKey: ["page", slug], queryFn: () => getPage({ data: { slug } }), staleTime: 5 * MIN });
export const shippingQuery = () =>
  queryOptions({ queryKey: ["shipping"], queryFn: () => getShippingMethods(), staleTime: 10 * MIN });
export const couponsQuery = () =>
  queryOptions({ queryKey: ["coupons"], queryFn: () => getCoupons(), staleTime: 5 * MIN });
