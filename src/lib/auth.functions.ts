import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev";

type AuthResult =
  | { ok: true; name: string; email: string; token: string }
  | { ok: false; message: string };

// Auth calls need the provider's error body (wrong password, missing JWT plugin,
// duplicate email), so they use their own fetch instead of gatewayFetch.
async function authFetch(
  service: "woocommerce" | "wordpress",
  path: string,
  body: unknown,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connKey = service === "woocommerce" ? process.env["WOOCOMMERCE_API_KEY"] : process.env["WORDPRESS_API_KEY"];
  if (!lovableKey || !connKey) throw new Error(`Missing credentials for ${service}`);
  const res = await fetch(`${GATEWAY_URL}/${service}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, data };
}

const JWT_MISSING =
  "Login belum aktif. Pasang plugin “JWT Authentication for WP REST API” di WordPress Anda, lalu coba lagi.";

async function requestToken(email: string, password: string): Promise<AuthResult> {
  const r = await authFetch("wordpress", "/wp-json/jwt-auth/v1/token", { username: email, password });
  if (r.status === 404 || String(r.data["code"] ?? "").includes("rest_no_route")) {
    return { ok: false, message: JWT_MISSING };
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
