import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, RefreshCw, Trash2 } from "lucide-react";
import { siteConfig } from "@/config/site.config";
import { cart, useCart } from "@/lib/cart";
import { cartSubtotal, cartTotal } from "@/lib/cart-math";
import { formatPrice } from "@/lib/format";
import { shippingQuery } from "@/lib/queries";
import { createOrder, getBiteshipRates } from "@/lib/store.functions";
import type { ShippingMethod } from "@/lib/types";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: `Keranjang & checkout — ${siteConfig.name}` },
      { name: "description", content: "Periksa keranjang, pilih pengiriman, dan lanjutkan ke pembayaran." },
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
  const [postcode, setPostcode] = useState("");
  const [biteshipMethods, setBiteshipMethods] = useState<ShippingMethod[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesNote, setRatesNote] = useState("");
  const [shippingId, setShippingId] = useState<string>("");
  const [busy, setBusy] = useState(false);

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
        if (res.ok && res.methods.length > 0) {
          setBiteshipMethods(res.methods);
          setShippingId((prev) => (res.methods.some((m) => m.id === prev) ? prev : (res.methods[0]?.id ?? "")));
        } else {
          setBiteshipMethods([]);
          if (res.error) setRatesNote(res.error);
        }
      } catch {
        setRatesNote("Gagal mengecek ongkir Biteship.");
      }
      setLoadingRates(false);
    },
    [fetchRates, items],
  );

  useEffect(() => {
    if (/^\d{5}$/.test(postcode.trim())) {
      void checkRates(postcode, city);
    }
  }, [postcode, city, checkRates]);

  const methods = biteshipMethods.length > 0 ? biteshipMethods : fallbackMethods;
  const method = methods.find((m) => m.id === shippingId);
  const total = cartTotal(items, method?.cost ?? null);

  if (!items.length) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Keranjang masih kosong</h1>
        <Link to="/shop" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">
          Mulai belanja
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!shippingId) {
      toast.error("Pilih metode pengiriman");
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold">Keranjang</h1>
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

          <form id="checkout" onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Data pengiriman</h2>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                Dikirim dari: {siteConfig.origin.city}, {siteConfig.origin.state} {siteConfig.origin.postalCode}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="first_name" required placeholder="Nama depan" className={field} />
              <input name="last_name" placeholder="Nama belakang" className={field} />
              <input name="email" type="email" required placeholder="Email" className={field} />
              <input name="phone" required placeholder="No. WhatsApp" className={field} />
            </div>
            <input name="address_1" required placeholder="Alamat lengkap" className={field} />
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                name="city"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onBlur={() => {
                  if (!/^\d{5}$/.test(postcode.trim()) && city.trim().length >= 3) {
                    void checkRates(postcode, city);
                  }
                }}
                placeholder="Kota / Kecamatan"
                className={field}
              />
              <input name="state" placeholder="Provinsi" className={field} />
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
            <textarea name="note" maxLength={500} placeholder="Catatan (opsional)" className={`${field} h-20 py-3`} />
          </form>
        </div>

        <aside className="h-fit space-y-5 rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Pengiriman</h2>
            <button
              type="button"
              disabled={loadingRates || (!/^\d{5}$/.test(postcode.trim()) && city.trim().length < 3)}
              onClick={() => void checkRates(postcode, city)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingRates ? "animate-spin" : ""}`} />
              Cek ongkir
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Asal pengiriman: {siteConfig.origin.address}, {siteConfig.origin.city} {siteConfig.origin.state}{" "}
            {siteConfig.origin.postalCode}
          </p>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {(loadingRates || loadingFallback) && (
              <p className="text-sm text-muted-foreground">Menghitung tarif pengiriman…</p>
            )}
            {!loadingRates && !loadingFallback && methods.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {ratesNote ||
                  "Masukkan kode pos 5 digit (atau nama kota lalu klik Cek ongkir) untuk menampilkan kurir Biteship."}
              </p>
            )}
            {methods.map((m) => (
              <label
                key={m.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-sm ${shippingId === m.id ? "border-foreground bg-secondary/40" : "border-border"}`}
              >
                <span className="flex items-center gap-2">
                  <input type="radio" name="ship" checked={shippingId === m.id} onChange={() => setShippingId(m.id)} />
                  <span className="font-medium">{m.title}</span>
                </span>
                <span className="shrink-0 font-semibold text-muted-foreground">
                  {m.cost === null ? "Dikonfirmasi admin" : m.cost === 0 ? "Gratis" : formatPrice(m.cost)}
                </span>
              </label>
            ))}
          </div>
          <div className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(cartSubtotal(items))}</span>
            </div>
            <div className="flex justify-between">
              <span>Ongkir</span>
              <span>{method ? (method.cost === null ? "—" : formatPrice(method.cost)) : "—"}</span>
            </div>
            <div className="flex justify-between pt-2 font-display text-lg font-bold">
              <span>Total</span>
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
