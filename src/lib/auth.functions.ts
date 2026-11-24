/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { gatewayFetch, hasWooCredentials, rawStoreFetch } from "./gateway.server";
import { mapOrder } from "./store.server";
import type { OrderSummary } from "./types";

type AuthResult =
  | { ok: true; name: string; email: string; token: string }
  | { ok: false; message: string };

type MyOrdersResult =
  | { ok: true; user: { id: number; name: string; email: string }; orders: OrderSummary[] }
  | { ok: false; reason: "unauthorized" | "unavailable"; orders: OrderSummary[] };

// Auth calls need the provider's error body (wrong password, missing JWT plugin,
// duplicate email), so they use rawStoreFetch instead of gatewayFetch.
async function authFetch(
  service: "woocommerce" | "wordpress",
  path: string,
  body: unknown,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await rawStoreFetch(service, path, { method: "POST", body });
  const data =
    res.data && typeof res.data === "object"
      ? (res.data as Record<string, unknown>)
      : {};
  return { status: res.status, data };
}

const JWT_MISSING =
  "Login belum aktif. Pasang plugin “JWT Authentication for WP REST API” di WordPress Anda, lalu coba lagi.";
const JWT_BAD_CONFIG =
  "Konfigurasi JWT di WordPress belum lengkap (JWT_AUTH_SECRET_KEY). Hubungi admin.";

async function requestToken(email: string, password: string): Promise<AuthResult> {
  const r = await authFetch("wordpress", "/wp-json/jwt-auth/v1/token", { username: email, password });
  const code = String(r.data["code"] ?? "");
  if (r.status === 404 || code.includes("rest_no_route")) {
    return { ok: false, message: JWT_MISSING };
  }
  if (code.includes("jwt_auth_bad_config")) {
    return { ok: false, message: JWT_BAD_CONFIG };
  }
  const token = typeof r.data["token"] === "string" ? r.data["token"] : "";
  if (!token) {
    return { ok: false, message: "Email atau kata sandi salah." };
  }
  const name = String(r.data["user_display_name"] || r.data["user_nicename"] || email.split("@")[0]);
  return { ok: true, name, email: String(r.data["user_email"] || email), token };
}

export const loginCustomer = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ email: z.string().trim().email().max(200), password: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }): Promise<AuthResult> => {
    try {
      return await requestToken(data.email, data.password);
    } catch (e) {
      console.error("login failed:", e);
      return { ok: false, message: "Login gagal. Coba lagi nanti." };
    }
  });

export const registerCustomer = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        firstName: z.string().trim().min(1).max(80),
        lastName: z.string().trim().max(80).default(""),
        email: z.string().trim().email().max(200),
        password: z.string().min(6).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<AuthResult> => {
    if (!hasWooCredentials()) {
      return {
        ok: false,
        message: "Pendaftaran belum aktif. Konfigurasikan WC_CONSUMER_KEY & WC_CONSUMER_SECRET terlebih dahulu.",
      };
    }
    try {
      const r = await authFetch("woocommerce", "/customers", {
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        password: data.password,
        billing: { first_name: data.firstName, last_name: data.lastName, email: data.email },
      });
      const code = String(r.data["code"] ?? "");
      if (code === "registration-error-email-exists" || code === "customer_exists") {
        return { ok: false, message: "Email sudah terdaftar. Silakan masuk." };
      }
      if (r.status >= 400 || !r.data["id"]) {
        console.error(`register failed [${r.status}]:`, JSON.stringify(r.data).slice(0, 500));
        return { ok: false, message: "Pendaftaran gagal. Periksa kembali data Anda." };
      }
      // Auto-login right after a successful registration.
      return await requestToken(data.email, data.password);
    } catch (e) {
      console.error("register failed:", e);
      return { ok: false, message: "Pendaftaran gagal. Coba lagi nanti." };
    }
  });

export const validateSession = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(10).max(4000) }).parse(d))
  .handler(async ({ data }): Promise<{ valid: boolean }> => {
    try {
      const res = await rawStoreFetch("wordpress", "/wp-json/jwt-auth/v1/token/validate", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.token}` },
      });
      return { valid: res.ok };
    } catch {
      return { valid: false };
    }
  });

export const getMyOrders = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(10).max(4000) }).parse(d))
  .handler(async ({ data }): Promise<MyOrdersResult> => {
    // 1. Verify the JWT token directly against WordPress and read the verified user identity.
    const me = await rawStoreFetch("wordpress", "/users/me", {
      query: { context: "edit" },
      headers: { Authorization: `Bearer ${data.token}` },
    }).catch(() => null);

    if (!me || me.status === 401 || me.status === 403) {
      return { ok: false, reason: "unauthorized", orders: [] };
    }
    if (!me.ok || !me.data || typeof me.data !== "object") {
      return { ok: false, reason: "unavailable", orders: [] };
    }

    const userData = me.data as Record<string, unknown>;
    const userId = Number(userData["id"] ?? 0);
    const userName = String(userData["name"] ?? userData["username"] ?? "");
    const userEmail = String(userData["email"] ?? "").toLowerCase();

    if (!userId) {
      return { ok: false, reason: "unauthorized", orders: [] };
    }

    if (!hasWooCredentials()) {
      return { ok: true, user: { id: userId, name: userName, email: userEmail }, orders: [] };
    }

    // 2. Fetch orders associated with the verified WooCommerce customer ID (and matching billing email).
    const byId = await gatewayFetch("woocommerce", "/orders", {
      query: { customer: userId, per_page: 20, orderby: "date", order: "desc" },
    }).catch(() => ({ data: [] }));

    const merged = new Map<number, any>();
    for (const o of (byId.data as any[]) ?? []) merged.set(o.id, o);

    if (userEmail) {
      const byEmail = await gatewayFetch("woocommerce", "/orders", {
        query: { search: userEmail, per_page: 20, orderby: "date", order: "desc" },
      }).catch(() => ({ data: [] }));
      for (const o of (byEmail.data as any[]) ?? []) {
        if (String(o.billing?.email ?? "").toLowerCase() === userEmail) {
          merged.set(o.id, o);
        }
      }
    }

    const orders = Array.from(merged.values())
      .sort((a, b) => Date.parse(b.date_created ?? "") - Date.parse(a.date_created ?? ""))
      .map(mapOrder);

    return { ok: true, user: { id: userId, name: userName, email: userEmail }, orders };
  });
