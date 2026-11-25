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

export type BiteshipRateResult = {
  ok: boolean;
  methods: ShippingMethod[];
  weightKg: number;
  zoneLabel?: string | undefined;
  source?: "biteship-live" | "biteship-estimate" | undefined;
  error?: string | undefined;
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

export function calculateTotalWeightKg(
  items: { quantity: number; weightGrams?: number | undefined }[],
): number {
  const totalGrams = items.reduce(
    (sum, i) => sum + Math.max(1, i.quantity) * (i.weightGrams ?? siteConfig.origin.defaultWeightGrams),
    0,
  );
  return Math.max(1, Math.ceil(totalGrams / 1000));
}

type ZoneTier = {
  zoneLabel: string;
  rates: { code: string; service: string; title: string; duration: string; perKg: number }[];
};

function resolveZoneTier(postalCode?: number, city?: string): ZoneTier {
  const cleanCity = (city ?? "").trim().toLowerCase();
  const prefix = postalCode ? Math.floor(postalCode / 1000) : 0;

  // 1. Semarang & Sekitarnya (50xxx)
  if (prefix === 50 || cleanCity.includes("semarang")) {
    return {
      zoneLabel: "Semarang & Sekitarnya",
      rates: [
        { code: "sicepat", service: "halu", title: "SiCepat HALU", duration: "1 - 2 hari", perKg: 9000 },
        { code: "anteraja", service: "reg", title: "AnterAja Reguler", duration: "1 - 2 hari", perKg: 10000 },
        { code: "jne", service: "reg", title: "JNE Reguler", duration: "1 - 2 hari", perKg: 10000 },
        { code: "jnt", service: "ez", title: "J&T Express EZ", duration: "1 - 2 hari", perKg: 10000 },
        { code: "jne", service: "yes", title: "JNE YES", duration: "1 hari", perKg: 16000 },
      ],
    };
  }

  // 2. Jawa Tengah & DI Yogyakarta (51xxx - 59xxx)
  if (
    (prefix >= 51 && prefix <= 59) ||
    /solo|surakarta|jogja|yogyakarta|sleman|bantul|magelang|kudus|jepara|pekalongan|tegal|purwokerto|banyumas|klaten|salatiga|kendal|demak/.test(
      cleanCity,
    )
  ) {
    return {
      zoneLabel: "Jawa Tengah & DI Yogyakarta",
      rates: [
        { code: "sicepat", service: "halu", title: "SiCepat HALU", duration: "1 - 2 hari", perKg: 12000 },
        { code: "anteraja", service: "reg", title: "AnterAja Reguler", duration: "1 - 2 hari", perKg: 13500 },
        { code: "jne", service: "reg", title: "JNE Reguler", duration: "1 - 2 hari", perKg: 14000 },
        { code: "jnt", service: "ez", title: "J&T Express EZ", duration: "1 - 2 hari", perKg: 14000 },
        { code: "jne", service: "yes", title: "JNE YES", duration: "1 hari", perKg: 22000 },
      ],
    };
  }

  // 3. Jawa Timur (60xxx - 69xxx)
  if (
    (prefix >= 60 && prefix <= 69) ||
    /surabaya|malang|sidoarjo|gresik|mojokerto|kediri|madiun|jember|banyuwangi|blitar|pasuruan/.test(cleanCity)
  ) {
    return {
      zoneLabel: "Jawa Timur",
      rates: [
        { code: "sicepat", service: "halu", title: "SiCepat HALU", duration: "2 - 3 hari", perKg: 16000 },
        { code: "anteraja", service: "reg", title: "AnterAja Reguler", duration: "2 - 3 hari", perKg: 17500 },
        { code: "jne", service: "reg", title: "JNE Reguler", duration: "1 - 3 hari", perKg: 18000 },
        { code: "jnt", service: "ez", title: "J&T Express EZ", duration: "1 - 3 hari", perKg: 18000 },
        { code: "jne", service: "yes", title: "JNE YES", duration: "1 - 2 hari", perKg: 28000 },
      ],
    };
  }

  // 4. DKI Jakarta, Banten & Jawa Barat (10xxx - 19xxx, 40xxx - 49xxx)
  if (
    (prefix >= 10 && prefix <= 19) ||
    (prefix >= 40 && prefix <= 49) ||
    /jakarta|bogor|depok|tangerang|bekasi|bandung|cirebon|karawang|sukabumi|tasikmalaya|serang|cilegon|cimahi/.test(
      cleanCity,
    )
  ) {
    return {
      zoneLabel: "Jabodetabek, Jawa Barat & Banten",
      rates: [
        { code: "sicepat", service: "halu", title: "SiCepat HALU", duration: "2 - 3 hari", perKg: 17000 },
        { code: "anteraja", service: "reg", title: "AnterAja Reguler", duration: "2 - 3 hari", perKg: 18500 },
        { code: "jne", service: "reg", title: "JNE Reguler", duration: "1 - 3 hari", perKg: 19000 },
        { code: "jnt", service: "ez", title: "J&T Express EZ", duration: "1 - 3 hari", perKg: 19000 },
        { code: "jne", service: "yes", title: "JNE YES", duration: "1 - 2 hari", perKg: 30000 },
      ],
    };
  }

  // 5. Sumatera, Bali & NTB (20xxx - 39xxx, 80xxx - 84xxx)
  if (
    (prefix >= 20 && prefix <= 39) ||
    (prefix >= 80 && prefix <= 84) ||
    /medan|palembang|lampung|pekanbaru|batam|padang|jambi|bengkulu|aceh|denpasar|bali|badung|gianyar|mataram|lombok/.test(
      cleanCity,
    )
  ) {
    return {
      zoneLabel: "Sumatera, Bali & NTB",
      rates: [
        { code: "sicepat", service: "reg", title: "SiCepat REG", duration: "2 - 4 hari", perKg: 31000 },
        { code: "anteraja", service: "reg", title: "AnterAja Reguler", duration: "2 - 4 hari", perKg: 31500 },
        { code: "jne", service: "reg", title: "JNE Reguler", duration: "2 - 4 hari", perKg: 32000 },
        { code: "jnt", service: "ez", title: "J&T Express EZ", duration: "2 - 4 hari", perKg: 33000 },
      ],
    };
  }

  // 6. Maluku & Papua (95xxx - 99xxx)
  if ((prefix >= 95 && prefix <= 99) || /ambon|maluku|jayapura|papua|sorong|merauke|timika|manokwari|ternate/.test(cleanCity)) {
    return {
      zoneLabel: "Maluku & Papua",
      rates: [
        { code: "pos", service: "reg", title: "POS Reguler", duration: "5 - 7 hari", perKg: 72000 },
        { code: "jne", service: "reg", title: "JNE Reguler", duration: "4 - 7 hari", perKg: 78000 },
        { code: "jnt", service: "ez", title: "J&T Express EZ", duration: "4 - 7 hari", perKg: 82000 },
      ],
    };
  }

  // 7. Kalimantan, Sulawesi & NTT (70xxx - 79xxx, 85xxx - 94xxx, atau default luar Jawa)
  return {
    zoneLabel: "Kalimantan, Sulawesi & Indonesia Timur",
    rates: [
      { code: "sicepat", service: "reg", title: "SiCepat REG", duration: "3 - 5 hari", perKg: 44000 },
      { code: "jne", service: "reg", title: "JNE Reguler", duration: "3 - 5 hari", perKg: 45000 },
      { code: "jnt", service: "ez", title: "J&T Express EZ", duration: "3 - 5 hari", perKg: 46000 },
    ],
  };
}

export function estimateRatesFromSemarang(
  postalCode: number | undefined,
  city: string | undefined,
  weightKg: number,
): { zoneLabel: string; methods: ShippingMethod[] } {
  const tier = resolveZoneTier(postalCode, city);
  const kg = Math.max(1, weightKg);
  const methods: ShippingMethod[] = tier.rates
    .map((r) => ({
      id: `biteship:${r.code}:${r.service}`,
      title: `${r.title} (${r.duration})`,
      cost: r.perKg * kg,
    }))
    .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));

  return { zoneLabel: tier.zoneLabel, methods };
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
      Authorization: apiKey,
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as { areas?: { id?: string }[] } | null;
  return data?.areas?.[0]?.id ?? null;
}

export async function fetchBiteshipRates(input: BiteshipRateInput): Promise<BiteshipRateResult> {
  const weightKg = calculateTotalWeightKg(input.items);
  const postalMatch = (input.destinationPostalCode ?? "").trim().match(/^\d{5}$/);
  const destinationPostalCode = postalMatch ? Number(postalMatch[0]) : undefined;
  const destinationCity = (input.destinationCity ?? "").trim() || undefined;

  if (!destinationPostalCode && (!destinationCity || destinationCity.length < 3)) {
    return {
      ok: false,
      methods: [],
      weightKg,
      error: "Masukkan kode pos 5 digit atau nama kota tujuan untuk menghitung ongkir.",
    };
  }

  const apiKey = getBiteshipApiKey();
  if (!apiKey) {
    const est = estimateRatesFromSemarang(destinationPostalCode, destinationCity, weightKg);
    return {
      ok: true,
      methods: est.methods,
      weightKg,
      zoneLabel: est.zoneLabel,
      source: "biteship-estimate",
    };
  }

  let destinationAreaId: string | undefined;
  if (!destinationPostalCode && destinationCity) {
    destinationAreaId = (await resolveAreaIdByCity(destinationCity, apiKey)) ?? undefined;
  }

  // If city lookup didn't yield an area ID (e.g. HTTP 402 on maps API), fall back to zone calculation
  if (!destinationPostalCode && !destinationAreaId) {
    const est = estimateRatesFromSemarang(destinationPostalCode, destinationCity, weightKg);
    return {
      ok: true,
      methods: est.methods,
      weightKg,
      zoneLabel: est.zoneLabel,
      source: "biteship-estimate",
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

  try {
    const res = await fetch(`${BITESHIP_BASE_URL}/rates/couriers`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
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
      destination?: { administrative_division_level_2_name?: string; postal_code?: number };
    };

    if (res.ok && payload.success !== false && Array.isArray(payload.pricing) && payload.pricing.length > 0) {
      return {
        ok: true,
        methods: mapBiteshipPricing(payload.pricing),
        weightKg,
        zoneLabel:
          payload.destination?.administrative_division_level_2_name ||
          (destinationPostalCode ? `Kode Pos ${destinationPostalCode}` : destinationCity),
        source: "biteship-live",
      };
    }

    console.error(`[biteship] rates fallback [${res.status}]:`, JSON.stringify(payload).slice(0, 400));
  } catch (e) {
    console.error("[biteship] rates request error, using zone calculation:", e);
  }

  const est = estimateRatesFromSemarang(destinationPostalCode, destinationCity, weightKg);
  return {
    ok: true,
    methods: est.methods,
    weightKg,
    zoneLabel: est.zoneLabel,
    source: "biteship-estimate",
  };
}
