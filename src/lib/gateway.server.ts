const GATEWAY_URL = "https://connector-gateway.lovable.dev";

type Service = "woocommerce" | "wordpress";

export async function gatewayFetch(
  service: Service,
  path: string,
  init: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> } = {},
) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connKey = service === "woocommerce" ? process.env["WOOCOMMERCE_API_KEY"] : process.env["WORDPRESS_API_KEY"];
  if (!lovableKey || !connKey) throw new Error(`Missing credentials for ${service}`);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(init.query ?? {})) if (v !== undefined && v !== "") qs.set(k, String(v));
  const url = `${GATEWAY_URL}/${service}${path}${qs.size ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connKey,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : null,
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[${service}] ${path} failed [${res.status}]: ${text.slice(0, 500)}`);
    throw new Error(`Store request failed (${res.status})`);
  }
  const data = await res.json();
  return {
    data,
    total: Number(res.headers.get("x-wp-total") ?? 0),
    totalPages: Number(res.headers.get("x-wp-totalpages") ?? 1),
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
