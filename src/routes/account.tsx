import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { siteConfig } from "@/config/site.config";
import { lookupOrders } from "@/lib/store.functions";
import { formatDate, formatPrice } from "@/lib/format";
import type { OrderSummary } from "@/lib/types";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: `Pesanan saya — ${siteConfig.name}` },
      { name: "description", content: "Cek status dan riwayat pesanan Anda." },
      { property: "og:title", content: `Pesanan saya — ${siteConfig.name}` },
      { property: "og:description", content: "Cek status dan riwayat pesanan." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Account,
});

const STATUS: Record<string, string> = {
  pending: "Menunggu pembayaran", processing: "Diproses", "on-hold": "Ditahan", completed: "Selesai",
  cancelled: "Dibatalkan", refunded: "Dikembalikan", failed: "Gagal",
};
const field = "h-11 w-full rounded-lg border border-input bg-card px-4 text-sm outline-none focus:border-foreground";

function Account() {
  const lookup = useServerFn(lookupOrders);
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError("");
    try {
      const r = await lookup({ data: { email: String(f.get("email")), orderNumber: String(f.get("order")).replace("#", "") } });
      if (!r.ok) { setOrders(null); setError("Pesanan tidak ditemukan. Periksa email dan nomor pesanan."); }
      else setOrders(r.orders);
    } catch { setError("Data tidak valid."); }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Pesanan saya</h1>
      <p className="mt-2 text-sm text-muted-foreground">Masukkan email dan nomor salah satu pesanan untuk melihat semua riwayat pesanan Anda.</p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
        <input name="email" type="email" required placeholder="Email" className={field} />
        <input name="order" required placeholder="No. pesanan" className={field} />
        <button disabled={busy} className="h-11 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy ? "Mencari…" : "Cek"}</button>
      </form>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {orders && (
        <ul className="mt-8 space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display font-bold">#{o.number}</p>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{STATUS[o.status] ?? o.status}</span>
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(o.date)}{o.shippingLines.length ? ` · ${o.shippingLines.join(", ")}` : ""}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {o.items.map((i, idx) => <li key={idx} className="flex justify-between gap-4"><span className="line-clamp-1">{i.quantity}× {i.name}</span><span>{formatPrice(i.total)}</span></li>)}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="font-display font-bold">{formatPrice(o.total)}</span>
                {o.status === "pending" && o.paymentUrl && <a href={o.paymentUrl} className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-foreground">Bayar sekarang</a>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-10 text-xs text-muted-foreground">
        Punya akun? Kelola profil & alamat di <a href={`${siteConfig.storeUrl}/my-account/`} className="underline">akun toko</a>.
      </p>
    </div>
  );
}
