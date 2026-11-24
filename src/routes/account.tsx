import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { LogOut, RefreshCw, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { siteConfig } from "@/config/site.config";
import { AuthForms } from "@/components/store/AuthForms";
import { auth, timeGreeting, useAuth } from "@/lib/auth";
import { getMyOrders } from "@/lib/auth.functions";
import { lookupOrders } from "@/lib/store.functions";
import { formatDate, formatPrice } from "@/lib/format";
import type { OrderSummary } from "@/lib/types";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: `Akun & pesanan saya — ${siteConfig.name}` },
      { name: "description", content: "Masuk ke akun Anda untuk melihat riwayat pesanan atau lacak pesanan." },
      { property: "og:title", content: `Akun & pesanan saya — ${siteConfig.name}` },
      { property: "og:description", content: "Masuk ke akun dan cek status pesanan Anda." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Account,
});

const STATUS: Record<string, string> = {
  pending: "Menunggu pembayaran",
  processing: "Diproses",
  "on-hold": "Ditahan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  refunded: "Dikembalikan",
  failed: "Gagal",
};

const field =
  "h-11 w-full rounded-lg border border-input bg-card px-4 text-sm outline-none focus:border-foreground";

function OrderList({ orders }: { orders: OrderSummary[] }) {
  return (
    <ul className="space-y-4">
      {orders.map((o) => (
        <li key={o.id} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display font-bold">#{o.number}</p>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
              {STATUS[o.status] ?? o.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDate(o.date)}
            {o.shippingLines.length ? ` · ${o.shippingLines.join(", ")}` : ""}
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {o.items.map((i, idx) => (
              <li key={idx} className="flex justify-between gap-4">
                <span className="line-clamp-1">
                  {i.quantity}× {i.name}
                </span>
                <span>{formatPrice(i.total)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="font-display font-bold">{formatPrice(o.total)}</span>
            {o.status === "pending" && o.paymentUrl && (
              <a
                href={o.paymentUrl}
                className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-foreground"
              >
                Bayar sekarang
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function GuestOrderLookup() {
  const lookup = useServerFn(lookupOrders);
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r = await lookup({
        data: { email: String(f.get("email")), orderNumber: String(f.get("order")).replace("#", "") },
      });
      if (!r.ok) {
        setOrders(null);
        setError("Pesanan tidak ditemukan. Periksa email dan nomor pesanan.");
      } else {
        setOrders(r.orders);
      }
    } catch {
      setError("Data tidak valid.");
    }
    setBusy(false);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-bold">Lacak pesanan tanpa akun</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Masukkan email dan nomor salah satu pesanan untuk melihat riwayat pesanan Anda.
      </p>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
        <input name="email" type="email" required placeholder="Email" className={field} />
        <input name="order" required placeholder="No. pesanan" className={field} />
        <button
          disabled={busy}
          className="h-11 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Mencari…" : "Cek"}
        </button>
      </form>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {orders && (
        <div className="mt-6">
          <OrderList orders={orders} />
        </div>
      )}
    </section>
  );
}

function Account() {
  const session = useAuth();
  const fetchMyOrders = useServerFn(getMyOrders);
  const [myOrders, setMyOrders] = useState<OrderSummary[] | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  const loadOrders = useCallback(
    async (token: string) => {
      setLoadingOrders(true);
      setOrdersError("");
      try {
        const r = await fetchMyOrders({ data: { token } });
        if (!r.ok) {
          if (r.reason === "unauthorized") {
            auth.signOut();
            toast.error("Sesi login Anda telah berakhir. Silakan masuk kembali.");
          } else {
            setOrdersError("Riwayat pesanan tidak dapat dimuat saat ini.");
          }
          setMyOrders(null);
        } else {
          setMyOrders(r.orders);
        }
      } catch {
        setOrdersError("Gagal memuat riwayat pesanan.");
      }
      setLoadingOrders(false);
    },
    [fetchMyOrders],
  );

  useEffect(() => {
    if (session?.token) {
      void loadOrders(session.token);
    } else {
      setMyOrders(null);
      setOrdersError("");
    }
  }, [session?.token, loadOrders]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Akun &amp; pesanan saya</h1>

      {session ? (
        <div className="mt-6 space-y-8">
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Halo, {timeGreeting()}</p>
              <p className="font-display text-xl font-bold">{session.name}</p>
              <p className="text-sm text-muted-foreground">{session.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loadingOrders}
                onClick={() => void loadOrders(session.token)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loadingOrders ? "animate-spin" : ""}`} /> Muat ulang
              </button>
              <button
                type="button"
                onClick={() => {
                  auth.signOut();
                  toast.success("Anda telah keluar.");
                }}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-destructive hover:bg-secondary"
              >
                <LogOut className="h-4 w-4" /> Keluar
              </button>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold">Riwayat pesanan</h2>
            {loadingOrders && myOrders === null && (
              <p className="text-sm text-muted-foreground">Memuat riwayat pesanan…</p>
            )}
            {ordersError && <p className="text-sm text-destructive">{ordersError}</p>}
            {!loadingOrders && !ordersError && myOrders && myOrders.length === 0 && (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Belum ada pesanan pada akun ini.</p>
                <Link
                  to="/shop"
                  className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
                >
                  Mulai belanja
                </Link>
              </div>
            )}
            {myOrders && myOrders.length > 0 && <OrderList orders={myOrders} />}
          </section>

          <GuestOrderLookup />
        </div>
      ) : (
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-bold">Masuk atau daftar</h2>
            <AuthForms />
          </section>
          <GuestOrderLookup />
        </div>
      )}

      <p className="mt-10 text-xs text-muted-foreground">
        Kelola profil &amp; alamat lengkap di{" "}
        <a href={`${siteConfig.storeUrl}/my-account/`} target="_blank" rel="noreferrer" className="underline">
          akun toko {siteConfig.name}
        </a>
        .
      </p>
    </div>
  );
}
