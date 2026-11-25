/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import { siteConfig } from "@/config/site.config";
import { fetchBiteshipRates } from "./biteship.server";
import { cached, gatewayFetch, hasWooCredentials } from "./gateway.server";
import {
  isCouponActive,
  mapCategory,
  mapCoupon,
  mapOrder,
  mapPost,
  mapProduct,
  mapStoreApiProduct,
  mapStoreApiVariation,
  mapVariation,
} from "./store.server";
import type { Category, Coupon, Paged, Post, PostCategory, Product, ShippingMethod, Variation } from "./types";

const MIN = 60_000;

export const getProducts = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(50).default(12),
        category: z.number().int().optional(),
        search: z.string().max(100).optional(),
        featured: z.boolean().optional(),
        orderby: z.enum(["date", "price", "popularity"]).optional(),
        order: z.enum(["asc", "desc"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<Paged<Product>> => {
    const useV3 = hasWooCredentials();
    return cached(`products:${useV3 ? "v3" : "store"}:${JSON.stringify(data)}`, MIN, async () => {
      if (useV3) {
        const r = await gatewayFetch("woocommerce", "/products", {
          query: {
            status: "publish",
            page: data.page,
            per_page: data.perPage,
            category: data.category,
            search: data.search,
            featured: data.featured ? "true" : undefined,
            orderby: data.orderby,
            order: data.order,
          },
        });
        return { items: r.data.map(mapProduct), total: r.total, totalPages: r.totalPages };
      }

      const r = await gatewayFetch("woocommerce-store", "/products", {
        query: {
          page: data.page,
          per_page: data.perPage,
          category: data.category,
          search: data.search,
          featured: data.featured ? "true" : undefined,
          orderby: data.orderby,
          order: data.order,
        },
      });
      const items = (r.data as any[]).map(mapStoreApiProduct);
      return { items, total: r.total || items.length, totalPages: r.totalPages || 1 };
    });
  });

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const useV3 = hasWooCredentials();
    return cached(`product:${useV3 ? "v3" : "store"}:${data.slug}`, MIN, async () => {
      if (useV3) {
        const r = await gatewayFetch("woocommerce", "/products", { query: { slug: data.slug } });
        if (!r.data[0]) throw notFound();
        const product = mapProduct(r.data[0]);
        let variations: Variation[] = [];
        if (product.type === "variable" && product.variations.length) {
          const v = await gatewayFetch("woocommerce", `/products/${product.id}/variations`, {
            query: { per_page: 100 },
          });
          variations = v.data.map(mapVariation);
        }
        return { product, variations };
      }

      const r = await gatewayFetch("woocommerce-store", "/products", { query: { slug: data.slug } });
      const raw = r.data?.[0];
      if (!raw) throw notFound();
      const product = mapStoreApiProduct(raw);
      let variations: Variation[] = [];
      if (product.type === "variable" && Array.isArray(raw.variations) && raw.variations.length) {
        const rawVars = (raw.variations as { id: number; attributes?: { name: string; value?: string }[] }[]).slice(
          0,
          50,
        );
        const fetched = await Promise.all(
          rawVars.map(async (rv) => {
            try {
              const res = await gatewayFetch("woocommerce-store", `/products/${rv.id}`);
              return mapStoreApiVariation(res.data, rv.attributes ?? []);
            } catch {
              return null;
            }
          }),
        );
        variations = fetched.filter((v): v is Variation => v !== null);
      }
      return { product, variations };
    });
  });

export const getCategories = createServerFn({ method: "GET" }).handler(async (): Promise<Category[]> => {
  const useV3 = hasWooCredentials();
  return cached(`categories:${useV3 ? "v3" : "store"}`, 5 * MIN, async () => {
    if (useV3) {
      const r = await gatewayFetch("woocommerce", "/products/categories", {
        query: { per_page: 100, hide_empty: "true", orderby: "count", order: "desc" },
      });
      return r.data.map(mapCategory).filter((c: { slug: string }) => c.slug !== "uncategorized");
    }

    const r = await gatewayFetch("woocommerce-store", "/products/categories", {
      query: { per_page: 100 },
    });
    return (r.data as any[])
      .map(mapCategory)
      .filter((c) => c.count > 0 && c.slug !== "uncategorized")
      .sort((a, b) => b.count - a.count);
  });
});

export const getPosts = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(30).default(9),
        category: z.number().int().optional(),
        search: z.string().max(100).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<Paged<Post>> => {
    return cached(`posts:${JSON.stringify(data)}`, 5 * MIN, async () => {
      const r = await gatewayFetch("wordpress", "/posts", {
        query: {
          page: data.page,
          per_page: data.perPage,
          status: "publish",
          categories: data.category,
          search: data.search,
          _embed: "wp:featuredmedia",
        },
      });
      return { items: r.data.map(mapPost), total: r.total, totalPages: r.totalPages };
    });
  });

export const getPostCategories = createServerFn({ method: "GET" }).handler(async (): Promise<PostCategory[]> => {
  return cached("post-categories", 5 * MIN, async () => {
    const r = await gatewayFetch("wordpress", "/categories", {
      query: { per_page: 100, hide_empty: "true", orderby: "count", order: "desc" },
    });
    return (r.data as { id: number; name: string; slug: string; count: number }[])
      .filter((c) => c.slug !== "uncategorized")
      .map((c) => ({ id: c.id, name: c.name, slug: c.slug, count: c.count }));
  });
});

async function getBySlug(type: "posts" | "pages", slug: string) {
  return cached(`${type}:${slug}`, 5 * MIN, async () => {
    const r = await gatewayFetch("wordpress", `/${type}`, { query: { slug, _embed: "wp:featuredmedia" } });
    if (!r.data[0]) throw notFound();
    return mapPost(r.data[0]);
  });
}

export const getPost = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(({ data }) => getBySlug("posts", data.slug));

export const getPage = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(({ data }) => getBySlug("pages", data.slug));

async function loadShippingMethods(): Promise<ShippingMethod[]> {
  if (!hasWooCredentials()) return [];
  return cached("shipping", 10 * MIN, async () => {
    const zones = await gatewayFetch("woocommerce", "/shipping/zones");
    const all: ShippingMethod[] = [];
    for (const z of zones.data as { id: number }[]) {
      const m = await gatewayFetch("woocommerce", `/shipping/zones/${z.id}/methods`);
      for (const method of m.data as any[]) {
        if (!method.enabled) continue;
        const raw = method.settings?.cost?.value;
        const cost =
          method.method_id === "free_shipping" || method.method_id === "local_pickup"
            ? Number(raw || 0)
            : raw && !isNaN(Number(raw))
              ? Number(raw)
              : null;
        const id = `${method.method_id}:${method.instance_id}`;
        if (!all.some((x) => x.title === method.title)) all.push({ id, title: method.title, cost });
      }
    }
    return all;
  });
}

export const getShippingMethods = createServerFn({ method: "GET" }).handler(() => loadShippingMethods());

const biteshipItemSchema = z.object({
  name: z.string().max(150).optional(),
  price: z.number().min(0).optional(),
  quantity: z.number().int().min(1).max(99),
});

export const getBiteshipRates = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        postalCode: z.string().trim().max(20).optional(),
        city: z.string().trim().max(100).optional(),
        items: z.array(biteshipItemSchema).min(1).max(50),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const cacheKey = `biteship:${data.postalCode ?? ""}:${(data.city ?? "").toLowerCase()}:${data.items.reduce((n, i) => n + i.quantity, 0)}`;
    return cached(cacheKey, 2 * MIN, () =>
      fetchBiteshipRates({
        destinationPostalCode: data.postalCode,
        destinationCity: data.city,
        items: data.items,
      }),
    );
  });

const addressSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().max(80).default(""),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(6).max(30),
  address_1: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().max(100).default(""),
  postcode: z.string().trim().max(20).default(""),
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        address: addressSchema,
        note: z.string().max(500).default(""),
        shippingId: z.string().max(100).optional(),
        items: z
          .array(
            z.object({
              productId: z.number().int(),
              variationId: z.number().int().optional(),
              quantity: z.number().int().min(1).max(99),
              name: z.string().max(150).optional(),
              price: z.number().min(0).optional(),
            }),
          )
          .min(1)
          .max(50),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    // Shipping cost is taken from the server-side method list / Biteship API, never from the client.
    let shipping_lines: { method_id: string; method_title: string; total: string }[] = [];
    const extraMeta: { key: string; value: string }[] = [
      { key: "_created_via_headless", value: "yes" },
      {
        key: "_store_origin",
        value: `${siteConfig.origin.address}, ${siteConfig.origin.city} ${siteConfig.origin.state} ${siteConfig.origin.postalCode}`,
      },
    ];

    if (data.shippingId) {
      if (data.shippingId.startsWith("biteship:")) {
        const [, courierCode = "", serviceCode = ""] = data.shippingId.split(":");
        const rateRes = await fetchBiteshipRates({
          destinationPostalCode: data.address.postcode,
          destinationCity: data.address.city,
          items: data.items,
        });
        const matched = rateRes.methods.find((x) => x.id === data.shippingId);
        if (matched) {
          shipping_lines = [
            {
              method_id: "biteship",
              method_title: matched.title,
              total: String(matched.cost ?? 0),
            },
          ];
          extraMeta.push(
            { key: "_biteship_courier_code", value: courierCode },
            { key: "_biteship_service_code", value: serviceCode },
          );
        }
      } else {
        const methods = await loadShippingMethods();
        const m = methods.find((x) => x.id === data.shippingId);
        if (m) {
          shipping_lines = [
            { method_id: m.id.split(":")[0] ?? m.id, method_title: m.title, total: String(m.cost ?? 0) },
          ];
        }
      }
    }
    const a = data.address;
    const r = await gatewayFetch("woocommerce", "/orders", {
      method: "POST",
      body: {
        status: "pending",
        set_paid: false,
        billing: { ...a, country: "ID" },
        shipping: {
          first_name: a.first_name,
          last_name: a.last_name,
          address_1: a.address_1,
          city: a.city,
          state: a.state,
          postcode: a.postcode,
          country: "ID",
        },
        customer_note: data.note,
        line_items: data.items.map((i) => ({
          product_id: i.productId,
          variation_id: i.variationId,
          quantity: i.quantity,
        })),
        shipping_lines,
        meta_data: extraMeta,
      },
    });
    const o = mapOrder(r.data);
    return { number: o.number, paymentUrl: o.paymentUrl };
  });

export const lookupOrders = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ email: z.string().trim().email().max(200), orderNumber: z.string().trim().regex(/^\d{1,12}$/) }).parse(d),
  )
  .handler(async ({ data }) => {
    if (!hasWooCredentials()) {
      return { ok: false as const, orders: [] };
    }
    // Require both order number AND matching billing email before showing anything.
    const one = await gatewayFetch("woocommerce", `/orders/${data.orderNumber}`).catch(() => null);
    const email = data.email.toLowerCase();
    if (!one || String(one.data.billing?.email ?? "").toLowerCase() !== email) {
      return { ok: false as const, orders: [] };
    }
    const query: Record<string, string | number> = { per_page: 20, search: email };
    if (one.data.customer_id) query["customer"] = one.data.customer_id;
    const list = await gatewayFetch("woocommerce", "/orders", { query }).catch(() => ({ data: [one.data] }));
    const orders = (list.data as any[])
      .filter((o) => String(o.billing?.email ?? "").toLowerCase() === email)
      .map(mapOrder);
    return { ok: true as const, orders: orders.length ? orders : [mapOrder(one.data)] };
  });

export const getCoupons = createServerFn({ method: "GET" }).handler(async (): Promise<Coupon[]> => {
  if (!hasWooCredentials()) return [];
  return cached("coupons", 5 * MIN, async () => {
    const r = await gatewayFetch("woocommerce", "/coupons", { query: { per_page: 50 } });
    return (r.data as any[]).filter((c) => isCouponActive(c)).map(mapCoupon);
  });
});
