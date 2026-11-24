import type { Category, Coupon, OrderSummary, Post, Product, Variation } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const num = (v: any) => (v === "" || v == null ? 0 : Number(v));

function minorToMajor(value: any, minorUnit: number): number {
  const raw = num(value);
  if (!raw) return 0;
  return minorUnit > 0 ? raw / 10 ** minorUnit : raw;
}

export function mapProduct(p: any): Product {
  const images: string[] = (p.images ?? []).map((i: any) => i.src);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: num(p.price),
    regularPrice: num(p.regular_price || p.price),
    onSale: !!p.on_sale,
    inStock: p.stock_status !== "outofstock",
    image: images[0] ?? null,
    images,
    shortDescription: p.short_description ?? "",
    description: p.description ?? "",
    categories: (p.categories ?? []).map((c: any) => ({ id: c.id, name: c.name, slug: c.slug })),
    type: p.type,
    attributes: (p.attributes ?? [])
      .filter((a: any) => a.variation)
      .map((a: any) => ({ name: a.name, options: a.options })),
    variations: p.variations ?? [],
  };
}

/** Maps a WooCommerce Store API v1 (/wp-json/wc/store/v1/products) product to DTO. */
export function mapStoreApiProduct(p: any): Product {
  const images: string[] = (p.images ?? []).map((i: any) => i.src).filter(Boolean);
  const minor = Number(p.prices?.currency_minor_unit ?? 0);
  const price = minorToMajor(p.prices?.price, minor);
  const regularPrice = minorToMajor(p.prices?.regular_price || p.prices?.price, minor);

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price,
    regularPrice: regularPrice || price,
    onSale: !!p.on_sale,
    inStock: p.is_in_stock !== false,
    image: images[0] ?? null,
    images,
    shortDescription: p.short_description ?? "",
    description: p.description ?? "",
    categories: (p.categories ?? []).map((c: any) => ({ id: c.id, name: c.name, slug: c.slug })),
    type: p.type ?? "simple",
    attributes: (p.attributes ?? [])
      .filter((a: any) => a.has_variations)
      .map((a: any) => ({
        name: a.name,
        options: (a.terms ?? []).map((t: any) => t.name).filter(Boolean),
      })),
    variations: (p.variations ?? [])
      .map((v: any) => (typeof v === "number" ? v : v.id))
      .filter((id: any) => typeof id === "number"),
  };
}

export function mapVariation(v: any): Variation {
  return {
    id: v.id,
    price: num(v.price),
    inStock: v.stock_status !== "outofstock",
    image: v.image?.src ?? null,
    attributes: (v.attributes ?? []).map((a: any) => ({ name: a.name, option: a.option })),
  };
}

/** Maps a WooCommerce Store API v1 variation product payload to DTO. */
export function mapStoreApiVariation(v: any, fallbackAttrs: { name: string; value?: string }[] = []): Variation {
  const minor = Number(v.prices?.currency_minor_unit ?? 0);
  const attrs =
    Array.isArray(v.attributes) && v.attributes.length
      ? v.attributes.map((a: any) => ({
          name: a.name,
          option: a.option ?? a.value ?? a.terms?.[0]?.name ?? "",
        }))
      : fallbackAttrs.map((a) => ({ name: a.name, option: a.value ?? "" }));

  return {
    id: v.id,
    price: minorToMajor(v.prices?.price, minor),
    inStock: v.is_in_stock !== false,
    image: v.images?.[0]?.src ?? v.image?.src ?? null,
    attributes: attrs,
  };
}

export function mapCategory(c: any): Category {
  return { id: c.id, name: c.name.replace(/^[:\s]+/, ""), slug: c.slug, count: c.count, image: c.image?.src ?? null };
}

export function mapPost(p: any): Post {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title?.rendered ?? "",
    excerpt: p.excerpt?.rendered ?? "",
    content: p.content?.rendered ?? "",
    date: p.date,
    image: p._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null,
  };
}

export function mapOrder(o: any): OrderSummary {
  return {
    id: o.id,
    number: String(o.number ?? o.id),
    status: o.status,
    total: num(o.total),
    date: o.date_created,
    paymentUrl: o.payment_url || null,
    items: (o.line_items ?? []).map((l: any) => ({ name: l.name, quantity: l.quantity, total: num(l.total) })),
    shippingLines: (o.shipping_lines ?? []).map((s: any) => s.method_title),
  };
}

export function mapCoupon(c: any): Coupon {
  return {
    code: c.code,
    type: c.discount_type,
    amount: num(c.amount),
    description: c.description ?? "",
    expires: c.date_expires || null,
    minSpend: num(c.minimum_amount),
    freeShipping: !!c.free_shipping,
  };
}

/** Active = not expired and usage limit not reached. */
export function isCouponActive(c: any, now = Date.now()) {
  if (c.status && c.status !== "publish") return false;
  if (c.date_expires_gmt && new Date(c.date_expires_gmt + "Z").getTime() < now) return false;
  if (c.usage_limit && c.usage_count >= c.usage_limit) return false;
  return true;
}
