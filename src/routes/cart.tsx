import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, PackageCheck, RefreshCw, Trash2, Truck } from "lucide-react";
import { siteConfig } from "@/config/site.config";
import { cart, useCart } from "@/lib/cart";
import { cartCount, cartSubtotal, cartTotal } from "@/lib/cart-math";
import { formatPrice } from "@/lib/format";
import { shippingQuery } from "@/lib/queries";
import { createOrder, getBiteshipRates } from "@/lib/store.functions";
import type { ShippingMethod } from "@/lib/types";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: `Keranjang & checkout — ${siteConfig.name}` },
      { name: "description", content: "Periksa keranjang, hitung ongkos kirim, dan lanjutkan ke pembayaran." },
      { property: "og:title", content: `Keranjang — ${siteConfig.name}` },
      { property: "og:description", content: "Keranjang belanja dan checkout." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

const field = "h-11 w-full rounded-lg border border-input bg-card px-4 text-sm outline-none focus:border-foreground";

function CartPage() {
  const items = useCart();
  const navigate = useNavigate();
  const { data: fallbackMethods = [], isLoading: loadingFallback } = useQuery(shippingQuery());
  const fetchRates = useServerFn(getBiteshipRates);
  const submit = useServerFn(createOrder);

  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [postcode, setPostcode] = useState("");
  const [biteshipMethods, setBiteshipMethods] = useState<ShippingMethod[]>([]);
  const [zoneLabel, setZoneLabel] = useState<string>("");
  const [weightKg, setWeightKg] = useState<number>(() => Math.max(1, cartCount(items)));
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesNote, setRatesNote] = useState("");
  const [shippingId, setShippingId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const totalQty = cartCount(items);
  const estimatedWeightKg = Math.max(
    1,
    Math.ceil((totalQty * siteConfig.origin.defaultWeightGrams) / 1000),
  );

  const checkRates = useCallback(
    async (nextPostcode: string, nextCity: string) => {
      if (!items.length) return;
      const cleanPost = nextPostcode.trim();
      const cleanCity = nextCity.trim();
      if (!/^\d{5}$/.test(cleanPost) && cleanCity.length < 3) return;

      setLoadingRates(true);
      setRatesNote("");
      try {
        const res = await fetchRates({
          data: {
            postalCode: cleanPost || undefined,
            city: cleanCity || undefined,
            items: items.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity })),
          },
        });
        setWeightKg(res.weightKg || estimatedWeightKg);
        setZoneLabel(res.zoneLabel ?? "");
        if (res.ok && res.methods.length > 0) {
          setBiteshipMethods(res.methods);
          setShippingId((prev) => (res.methods.some((m) => m.id === prev) ? prev : (res.methods[0]?.id ?? "")));
        } else {
          setBiteshipMethods([]);
          if (res.error) setRatesNote(res.error);
        }
      } catch {
        setRatesNote("Gagal menghitung ongkos kirim.");
      }
      setLoadingRates(false);
    },
    [fetchRates, items, estimatedWeightKg],
  );

  useEffect(() => {
    const cleanPost = postcode.trim();
    const cleanCity = city.trim();
    if (/^\d{5}$/.test(cleanPost)) {
      void checkRates(cleanPost, cleanCity);
      return;
    }
    if (cleanCity.length >= 3) {
      const timer = setTimeout(() => {
        void checkRates(cleanPost, cleanCity);
      }, 450);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [postcode, city, checkRates]);

  const methods = biteshipMethods.length > 0 ? biteshipMethods : fallbackMethods;
  const method = methods.find((m) => m.id === shippingId);
  const subtotal = cartSubtotal(items);
  const total = cartTotal(items, method?.cost ?? null);

  if (!items.length) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Keranjang masih kosong</h1>
        <Link
          to="/shop"
          className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          Mulai belanja
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!shippingId) {
      toast.error("Pilih kurir pengiriman terlebih dahulu");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? "").trim();
    setBusy(true);
    try {
      const res = await submit({
        data: {
          address: {
            first_name: g("first_name"),
            last_name: g("last_name"),
            email: g("email"),
            phone: g("phone"),
            address_1: g("address_1"),
            city: g("city"),
            state: g("state"),
            postcode: g("postcode"),
          },
          note: g("note"),
          shippingId,
          items: items.map((i) => ({
            productId: i.productId,
            variationId: i.variationId,
            quantity: i.quantity,
            name: i.name,
            price: i.price,
          })),
        },
      });
      cart.clear();
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        toast.success(`Pesanan #${res.number} dibuat`);
        navigate({ to: "/account" });
      }
    } catch {
      toast.error("Pesanan gagal dibuat. Periksa data Anda lalu coba lagi.");
      setBusy(false);
    }
  }

  const activeWeightKg = biteshipMethods.length > 0 ? weightKg : estimatedWeightKg;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold">Keranjang &amp; Checkout</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_420px]">
        <div className="space-y-8">
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {items.map((i) => (
              <li key={i.key} className="flex gap-4 p-4">
                <div className="h-20 w-20 shrink-0 rounded-lg bg-secondary">
                  {i.image && <img src={i.image} alt="" className="h-full w-full object-contain p-1" />}
                </div>
                <div className="flex flex-1 flex-col">
                  <Link to="/product/$slug" params={{ slug: i.slug }} className="line-clamp-2 text-sm font-semibold">
                    {i.name}
                  </Link>
                  {i.variantLabel && <p className="text-xs text-muted-foreground">{i.variantLabel}</p>}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center rounded-full border border-border text-sm">
                      <button type="button" className="px-3 py-1" onClick={() => cart.setQty(i.key, i.quantity - 1)}>
                        −
                      </button>
                      <span className="w-6 text-center">{i.quantity}</span>
                      <button type="button" className="px-3 py-1" onClick={() => cart.setQty(i.key, i.quantity + 1)}>
                        +
                      </button>
                    </div>
                    <span className="font-display text-sm font-bold">{formatPrice(i.price * i.quantity)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Hapus"
                  onClick={() => cart.setQty(i.key, 0)}
                  className="self-start text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          <form id="checkout" onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-6">
            <div>
              <h2 className="text-lg font-bold">1. Data Pengiriman</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Isi alamat lengkap serta kota atau kode pos tujuan untuk menghitung ongkos kirim otomatis.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input name="first_name" required placeholder="Nama depan" className={field} />
              <input name="last_name" placeholder="Nama belakang" className={field} />
              <input name="email" type="email" required placeholder="Email" className={field} />
              <input name="phone" required placeholder="No. WhatsApp" className={field} />
            </div>
            <input name="address_1" required placeholder="Alamat lengkap (Jalan, No. Rumah, RT/RW, Kelurahan)" className={field} />
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                name="city"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Kota / Kabupaten"
                className={field}
              />
              <input
                name="state"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder="Provinsi"
                className={field}
              />
              <input
                name="postcode"
                required
                inputMode="numeric"
                maxLength={5}
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="Kode pos (5 digit)"
                className={field}
              />
            </div>

            {/* Embedded Shipping Cost Calculator inside Checkout Form */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-bold">2. Perhitungan Ongkos Kirim (Biteship)</h3>
                </div>
                <button
                  type="button"
                  disabled={loadingRates || (!/^\d{5}$/.test(postcode.trim()) && city.trim().length < 3)}
                  onClick={() => void checkRates(postcode, city)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-40"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingRates ? "animate-spin" : ""}`} />
                  Hitung Ongkir
                </button>
              </div>

              <div className="grid gap-2 rounded-lg border border-border bg-card p-3 text-xs sm:grid-cols-3">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-foreground">Asal Pengiriman</p>
                    <p className="text-muted-foreground">
                      {siteConfig.origin.address}, {siteConfig.origin.city} {siteConfig.origin.postalCode}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Tujuan Pengiriman</p>
                    <p className="text-muted-foreground">
                      {city || postcode
                        ? `${city || "—"}${stateName ? `, ${stateName}` : ""}${postcode ? ` (${postcode})` : ""}`
                        : "Isi kota / kode pos di atas"}
                      {zoneLabel ? ` · ${zoneLabel}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-foreground">Estimasi Berat Paket</p>
                    <p className="text-muted-foreground">
                      {activeWeightKg} kg ({totalQty} item)
                    </p>
                  </div>
                </div>
              </div>

              {(loadingRates || loadingFallback) && (
                <p className="py-2 text-sm text-muted-foreground">Menghitung tarif kurir pengiriman…</p>
              )}

              {!loadingRates && !loadingFallback && methods.length === 0 && (
                <p className="py-2 text-sm text-muted-foreground">
                  {ratesNote ||
                    "Masukkan Kota / Kabupaten (min. 3 huruf) atau Kode Pos 5 digit di atas untuk melihat daftar tarif kurir."}
                </p>
              )}

              {methods.length > 0 && (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {methods.map((m) => {
                    const selected = shippingId === m.id;
                    const perKg = m.cost !== null && activeWeightKg > 1 ? Math.round(m.cost / activeWeightKg) : null;
                    return (
                      <label
                        key={m.id}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 text-sm transition-colors ${
                          selected ? "border-foreground bg-card shadow-sm" : "border-border bg-card/70 hover:bg-card"
                        }`}
                      >
                        <span className="flex items-start gap-2.5">
                          <input
                            type="radio"
                            name="ship_form"
                            checked={selected}
                            onChange={() => setShippingId(m.id)}
                            className="mt-1"
                          />
                          <span>
                            <span className="block font-semibold text-foreground">{m.title}</span>
                            {perKg !== null && (
                              <span className="block text-xs text-muted-foreground">
                                {formatPrice(perKg)}/kg × {activeWeightKg} kg
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="shrink-0 font-display text-sm font-bold text-foreground">
                          {m.cost === null ? "Dikonfirmasi" : m.cost === 0 ? "Gratis" : formatPrice(m.cost)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {method && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card px-3.5 py-2.5 text-xs">
                  <span className="text-muted-foreground">
                    Kurir dipilih: <strong className="text-foreground">{method.title}</strong> ({activeWeightKg} kg)
                  </span>
                  <span className="font-display text-sm font-bold text-foreground">
                    Ongkir: {method.cost === null ? "Dikonfirmasi admin" : formatPrice(method.cost)}
                  </span>
                </div>
              )}
            </div>

            <textarea name="note" maxLength={500} placeholder="Catatan untuk penjual / kurir (opsional)" className={`${field} h-20 py-3`} />
          </form>
        </div>

        <aside className="h-fit space-y-5 rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Ringkasan Pembayaran</h2>
          <div className="rounded-xl bg-secondary/40 p-3.5 text-xs space-y-1">
            <p className="font-semibold text-foreground">Asal Pengiriman</p>
            <p className="text-muted-foreground">
              {siteConfig.origin.address}, {siteConfig.origin.city}, {siteConfig.origin.state}{" "}
              {siteConfig.origin.postalCode}
            </p>
            {method && (
              <p className="pt-1 text-foreground">
                Kurir: <strong>{method.title}</strong> ({activeWeightKg} kg)
              </p>
            )}
          </div>

          <div className="space-y-2.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal ({totalQty} item)</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ongkos Kirim ({activeWeightKg} kg)</span>
              <span className="font-medium">
                {method ? (method.cost === null ? "Dikonfirmasi admin" : formatPrice(method.cost)) : "Pilih kurir"}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-3 font-display text-lg font-bold">
              <span>Total Tagihan</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <button
            form="checkout"
            disabled={busy}
            className="h-12 w-full rounded-full bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Memproses…" : "Lanjut ke pembayaran"}
          </button>
          <p className="text-xs text-muted-foreground">
            Anda akan diarahkan ke halaman pembayaran aman {siteConfig.name}.
          </p>
        </aside>
      </div>
    </div>
  );
}
