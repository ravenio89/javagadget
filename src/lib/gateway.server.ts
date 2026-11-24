import { siteConfig } from "@/config/site.config";

export type Service = "woocommerce" | "woocommerce-store" | "wordpress";

export function getStoreBaseUrl(): string {
  const raw =
    process.env["WP_SITE_URL"] ||
    process.env["WOOCOMMERCE_URL"] ||
    siteConfig.storeUrl;
  return raw.replace(/\/+$/, "");
}

function getWooCredentials(): { key: string; secret: string } | null {
  const key = (
    process.env["WC_CONSUMER_KEY"] ||
    process.env["WOOCOMMERCE_CONSUMER_KEY"] ||
    ""
  ).trim();
  const secret = (
    process.env["WC_CONSUMER_SECRET"] ||
    process.env["WOOCOMMERCE_CONSUMER_SECRET"] ||
    ""
  ).trim();
  return key && secret ? { key, secret } : null;
}

export function hasWooCredentials(): boolean {
  return getWooCredentials() !== null;
}

function basicAuth(user: string, pass: string): string {
  return `Basic ${btoa(`${user}:${pass}`)}`;
}

function buildUrl(
  service: Service,
  path: string,
  query?: Record<string, string | number | undefined>,
): string {
  const base = getStoreBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  let endpoint: string;
  if (normalizedPath.startsWith("/wp-json/")) {
    endpoint = `${base}${normalizedPath}`;
  } else if (service === "woocommerce") {
    endpoint = `${base}/wp-json/wc/v3${normalizedPath}`;
  } else if (service === "woocommerce-store") {
    endpoint = `${base}/wp-json/wc/store/v1${normalizedPath}`;
  } else {
    endpoint = `${base}/wp-json/wp/v2${normalizedPath}`;
  }

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  return qs.size ? `${endpoint}?${qs}` : endpoint;
}

function buildHeaders(
  service: Service,
  hasBody: boolean,
  extraHeaders?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
  };

  if (service === "woocommerce") {
    const creds = getWooCredentials();
    if (!creds) {
      throw new Error(
        "Missing WooCommerce REST API credentials (WC_CONSUMER_KEY / WC_CONSUMER_SECRET)",
      );
    }
    headers["Authorization"] = basicAuth(creds.key, creds.secret);
  } else if (service === "wordpress") {
    const wpUser = process.env["WP_USERNAME"]?.trim();
    const wpPass = process.env["WP_APP_PASSWORD"]?.trim();
    if (wpUser && wpPass) {
      headers["Authorization"] = basicAuth(wpUser, wpPass);
    }
  }

  if (extraHeaders) {
    Object.assign(headers, extraHeaders);
  }

  return headers;
}

export type FetchInit = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
};

export async function rawStoreFetch(
  service: Service,
  path: string,
  init: FetchInit = {},
) {
  const url = buildUrl(service, path, init.query);
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: buildHeaders(service, init.body !== undefined, init.headers),
    body: init.body !== undefined ? JSON.stringify(init.body) : null,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
    rawText: text,
    total: Number(res.headers.get("x-wp-total") ?? 0),
    totalPages: Number(res.headers.get("x-wp-totalpages") ?? 1),
  };
}

export async function gatewayFetch(
  service: Service,
  path: string,
  init: FetchInit = {},
) {
  const res = await rawStoreFetch(service, path, init);
  if (!res.ok) {
    console.error(
      `[${service}] ${path} failed [${res.status}]: ${res.rawText.slice(0, 500)}`,
    );
    throw new Error(`Store request failed (${res.status})`);
  }
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: res.data as any,
    total: res.total,
    totalPages: res.totalPages,
  };
}

// Simple in-memory cache per worker isolate to keep repeat requests instant.
const memo = new Map<string, { at: number; value: unknown }>();
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await fn();
  memo.set(key, { at: Date.now(), value });
  if (memo.size > 500) memo.delete(memo.keys().next().value!);
  return value;
}
