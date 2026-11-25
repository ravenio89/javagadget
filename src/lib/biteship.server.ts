import { siteConfig } from "@/config/site.config";
import type { ShippingMethod } from "./types";

const BITESHIP_BASE_URL = "https://api.biteship.com/v1";
const DEFAULT_COURIERS = "jne,jnt,sicepat,anteraja,pos,tiki,ninja,lion,idexpress";

export type BiteshipRateInput = {
  destinationPostalCode?: string | undefined;
  destinationCity?: string | undefined;
  items: {
    name?: string | undefined;
    price?: number | undefined;
    quantity: number;
    weightGrams?: number | undefined;
  }[];
};

export function getBiteshipApiKey(): string {
  return (process.env["BITESHIP_API_KEY"] ?? "").trim();
}

export function getOriginPostalCode(): number {
  const envCode = Number(process.env["BITESHIP_ORIGIN_POSTAL_CODE"] ?? "");
  return Number.isInteger(envCode) && envCode >= 10000 && envCode <= 99999
    ? envCode
    : siteConfig.origin.postalCode;
}

export function getBiteshipCouriers(): string {
  return (process.env["BITESHIP_COURIERS"] ?? "").trim() || DEFAULT_COURIERS;
}

function buildAuthHeader(apiKey: string): string {
  return apiKey;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapBiteshipPricing(pricing: any[]): ShippingMethod[] {
  const seen = new Set<string>();
  const methods: ShippingMethod[] = [];

  for (const p of pricing ?? []) {
    const courierCode = String(p.courier_code ?? "").trim().toLowerCase();
    const serviceCode = String(p.courier_service_code ?? "").trim().toLowerCase();
    if (!courierCode || !serviceCode) continue;

    const id = `biteship:${courierCode}:${serviceCode}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const courierName = String(p.courier_name ?? courierCode.toUpperCase()).trim();
    const serviceName = String(p.courier_service_name ?? serviceCode.toUpperCase()).trim();
    const duration = String(p.duration ?? "").trim();
    const cost = Number(p.price ?? 0);

    methods.push({
      id,
      title: `${courierName} ${serviceName}${duration ? ` (${duration})` : ""}`,
      cost: Number.isFinite(cost) ? cost : 0,
    });
  }

  return methods.sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));
}

async function resolveAreaIdByCity(city: string, apiKey: string): Promise<string | null> {
  const q = city.trim();
  if (q.length < 3) return null;
  const url = `${BITESHIP_BASE_URL}/maps/areas?countries=ID&input=${encodeURIComponent(q)}&type=single`;
  const res = await fetch(url, {
    headers: {
      Authorization: buildAuthHeader(apiKey),
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as { areas?: { id?: string }[] } | null;
  return data?.areas?.[0]?.id ?? null;
}

export async function fetchBiteshipRates(input: BiteshipRateInput): Promise<{
  ok: boolean;
  methods: ShippingMethod[];
  error?: string;
}> {
  const apiKey = getBiteshipApiKey();
  if (!apiKey) {
    return { ok: false, methods: [], error: "BITESHIP_API_KEY belum dikonfigurasi." };
  }

  const postalMatch = (input.destinationPostalCode ?? "").trim().match(/^\d{5}$/);
  const destinationPostalCode = postalMatch ? Number(postalMatch[0]) : undefined;

  let destinationAreaId: string | undefined;
  if (!destinationPostalCode && input.destinationCity) {
    destinationAreaId = (await resolveAreaIdByCity(input.destinationCity, apiKey)) ?? undefined;
  }

  if (!destinationPostalCode && !destinationAreaId) {
    return {
      ok: false,
      methods: [],
      error: "Masukkan kode pos 5 digit atau nama kota tujuan untuk menghitung ongkir.",
    };
  }

  const body: Record<string, unknown> = {
    origin_postal_code: getOriginPostalCode(),
    couriers: getBiteshipCouriers(),
    items: input.items.map((item, idx) => ({
      name: (item.name || `Item #${idx + 1}`).slice(0, 100),
      value: Math.max(1000, Math.round(item.price || 10000)),
      quantity: Math.max(1, item.quantity),
      weight: item.weightGrams ?? siteConfig.origin.defaultWeightGrams,
    })),
  };

  if (destinationPostalCode) {
    body["destination_postal_code"] = destinationPostalCode;
  } else if (destinationAreaId) {
    body["destination_area_id"] = destinationAreaId;
  }

  const res = await fetch(`${BITESHIP_BASE_URL}/rates/couriers`, {
    method: "POST",
    headers: {
      Authorization: buildAuthHeader(apiKey),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
    code?: number;
    pricing?: any[];
  };

  if (!res.ok || payload.success === false) {
    console.error(`[biteship] rates failed [${res.status}]:`, JSON.stringify(payload).slice(0, 400));
    const isAuthErr = res.status === 401 || payload.code === 40101003;
    const isBalanceErr = res.status === 402 || payload.code === 40200000;
    if (isBalanceErr) {
      return {
        ok: true,
        methods: [
          { id: "biteship:jne:reg", title: "JNE Reguler (Ongkir dikonfirmasi admin)", cost: null },
          { id: "biteship:jnt:ez", title: "J&T Express EZ (Ongkir dikonfirmasi admin)", cost: null },
          { id: "biteship:sicepat:reg", title: "SiCepat REG (Ongkir dikonfirmasi admin)", cost: null },
        ],
        error: "Saldo wallet Biteship belum terisi (Rp 5/cek ongkir). Tarif akan dikonfirmasi admin.",
      };
    }
    return {
      ok: false,
      methods: [],
      error: isAuthErr
        ? "API Key Biteship belum valid (gunakan full token biteship_live.... / biteship_test.... dari dashboard Biteship)."
        : payload.error || "Gagal memuat tarif pengiriman Biteship.",
    };
  }

  return {
    ok: true,
    methods: mapBiteshipPricing(payload.pricing ?? []),
  };
}
