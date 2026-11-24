import { afterEach, describe, expect, it, vi } from "vitest";
import { getStoreBaseUrl, hasWooCredentials, rawStoreFetch } from "./gateway.server";
import {
  isCouponActive,
  mapCategory,
  mapPost,
  mapProduct,
  mapStoreApiProduct,
  mapStoreApiVariation,
} from "./store.server";

describe("gateway.server config", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("defaults store base URL to https://store.javagadget.com", () => {
    delete process.env["WP_SITE_URL"];
    delete process.env["WOOCOMMERCE_URL"];
    expect(getStoreBaseUrl()).toBe("https://store.javagadget.com");
  });

  it("strips trailing slashes from WP_SITE_URL", () => {
    process.env["WP_SITE_URL"] = "https://store.javagadget.com///";
    expect(getStoreBaseUrl()).toBe("https://store.javagadget.com");
  });

  it("detects WooCommerce credentials only when both key and secret exist", () => {
    delete process.env["WC_CONSUMER_KEY"];
    delete process.env["WC_CONSUMER_SECRET"];
    delete process.env["WOOCOMMERCE_CONSUMER_KEY"];
    delete process.env["WOOCOMMERCE_CONSUMER_SECRET"];
    expect(hasWooCredentials()).toBe(false);

    process.env["WC_CONSUMER_KEY"] = "ck_test";
    expect(hasWooCredentials()).toBe(false);

    process.env["WC_CONSUMER_SECRET"] = "cs_test";
    expect(hasWooCredentials()).toBe(true);
  });

  it("forwards custom Authorization Bearer header to WordPress JWT endpoints", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: "jwt_auth_valid_token" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);
    try {
      const res = await rawStoreFetch("wordpress", "/wp-json/jwt-auth/v1/token/validate", {
        method: "POST",
        headers: { Authorization: "Bearer test-jwt-token" },
      });
      expect(res.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://store.javagadget.com/wp-json/jwt-auth/v1/token/validate",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ Authorization: "Bearer test-jwt-token" }),
        }),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("store.server mappers", () => {
  it("maps WooCommerce v3 product", () => {
    const product = mapProduct({
      id: 101,
      name: "iPhone 16 Pro",
      slug: "iphone-16-pro",
      price: "19999000",
      regular_price: "21999000",
      on_sale: true,
      stock_status: "instock",
      images: [{ src: "https://store.javagadget.com/wp-content/uploads/iphone.jpg" }],
      short_description: "<p>Flagship</p>",
      description: "<p>Full specs</p>",
      categories: [{ id: 10, name: "Smartphone", slug: "smartphone" }],
      type: "simple",
      attributes: [],
      variations: [],
    });

    expect(product.id).toBe(101);
    expect(product.price).toBe(19999000);
    expect(product.regularPrice).toBe(21999000);
    expect(product.onSale).toBe(true);
    expect(product.inStock).toBe(true);
    expect(product.image).toBe("https://store.javagadget.com/wp-content/uploads/iphone.jpg");
  });

  it("maps WooCommerce Store API v1 product with IDR minor unit 0", () => {
    const product = mapStoreApiProduct({
      id: 202,
      name: "MacBook Air M3",
      slug: "macbook-air-m3",
      type: "variable",
      on_sale: true,
      is_in_stock: true,
      prices: {
        price: "17500000",
        regular_price: "18999000",
        currency_minor_unit: 0,
      },
      images: [{ src: "https://store.javagadget.com/wp-content/uploads/mba.jpg" }],
      categories: [{ id: 12, name: "Laptop", slug: "laptop" }],
      attributes: [
        {
          name: "Storage",
          has_variations: true,
          terms: [{ name: "256GB" }, { name: "512GB" }],
        },
      ],
      variations: [{ id: 301 }, { id: 302 }],
    });

    expect(product.price).toBe(17500000);
    expect(product.regularPrice).toBe(18999000);
    expect(product.attributes).toEqual([{ name: "Storage", options: ["256GB", "512GB"] }]);
    expect(product.variations).toEqual([301, 302]);
  });

  it("maps WooCommerce Store API v1 product with minor unit 2", () => {
    const product = mapStoreApiProduct({
      id: 203,
      name: "USB-C Cable",
      slug: "usb-c-cable",
      type: "simple",
      on_sale: false,
      is_in_stock: false,
      prices: {
        price: "15000000",
        regular_price: "15000000",
        currency_minor_unit: 2,
      },
      images: [],
      categories: [],
    });

    expect(product.price).toBe(150000);
    expect(product.inStock).toBe(false);
    expect(product.image).toBeNull();
  });

  it("maps Store API v1 variation with fallback attributes", () => {
    const variation = mapStoreApiVariation(
      {
        id: 301,
        is_in_stock: true,
        prices: { price: "17500000", currency_minor_unit: 0 },
        images: [{ src: "https://store.javagadget.com/wp-content/uploads/mba-256.jpg" }],
      },
      [{ name: "Storage", value: "256GB" }],
    );

    expect(variation).toEqual({
      id: 301,
      price: 17500000,
      inStock: true,
      image: "https://store.javagadget.com/wp-content/uploads/mba-256.jpg",
      attributes: [{ name: "Storage", option: "256GB" }],
    });
  });

  it("maps WordPress post and category cleanly", () => {
    const cat = mapCategory({ id: 5, name: ": Aksesoris", slug: "aksesoris", count: 7, image: null });
    expect(cat.name).toBe("Aksesoris");

    const post = mapPost({
      id: 1,
      slug: "hello-world",
      title: { rendered: "Hello world!" },
      excerpt: { rendered: "<p>Excerpt</p>" },
      content: { rendered: "<p>Body</p>" },
      date: "2026-11-20T02:34:14",
      _embedded: { "wp:featuredmedia": [{ source_url: "https://store.javagadget.com/img.jpg" }] },
    });
    expect(post.image).toBe("https://store.javagadget.com/img.jpg");
  });

  it("evaluates coupon expiry and usage limit", () => {
    const now = Date.parse("2026-11-24T00:00:00Z");
    expect(isCouponActive({ status: "publish", date_expires_gmt: "2026-12-01T00:00:00" }, now)).toBe(true);
    expect(isCouponActive({ status: "publish", date_expires_gmt: "2026-11-01T00:00:00" }, now)).toBe(false);
    expect(isCouponActive({ status: "publish", usage_limit: 10, usage_count: 10 }, now)).toBe(false);
  });
});
