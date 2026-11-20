import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Home, LayoutGrid, Minus, Plus, ShoppingBag, Trash2, User, Package, BookOpen, MessageCircle, Store, TicketPercent, Copy, ClipboardCheck, LogOut, Search } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { categoriesQuery, couponsQuery } from "@/lib/queries";
import { cart, useCart } from "@/lib/cart";
import { cartCount, cartSubtotal } from "@/lib/cart-math";
import { useWishlist, wishlist } from "@/lib/wishlist";
import { auth, timeGreeting, useAuth } from "@/lib/auth";
import { loginCustomer, registerCustomer } from "@/lib/auth.functions";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/config/site.config";

type Panel = "categories" | "voucher" | "wishlist" | "cart" | "account" | null;

export function MobileNav() {
  const [open, setOpen] = useState<Panel>(null);
  const items = useCart();
  const wish = useWishlist();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const close = () => setOpen(null);
  const count = cartCount(items);

  const btn = "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-3";
  const tone = (on: boolean) => (on ? "text-foreground" : "text-muted-foreground");

  return (
    <>
      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-3 bottom-3 z-50 flex rounded-2xl border border-border bg-background/95 shadow-card backdrop-blur md:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <Link to="/" aria-label="Home" className={`${btn} ${tone(path === "/" && !open)}`}>
          <Home className="h-5 w-5" />
        </Link>
        <button className={`${btn} ${tone(open === "categories")}`} aria-label="Kategori" onClick={() => setOpen("categories")}>
          <LayoutGrid className="h-5 w-5" />
        </button>
        <button className={`${btn} ${tone(open === "voucher")}`} aria-label="Voucher" onClick={() => setOpen("voucher")}>
          <TicketPercent className="h-5 w-5" />
        </button>
        <button className={`${btn} ${tone(open === "wishlist")}`} aria-label="Wishlist" onClick={() => setOpen("wishlist")}>
          <Heart className="h-5 w-5" />
          {wish.length > 0 && <Dot n={wish.length} />}
        </button>
        <button className={`${btn} ${tone(open === "cart")}`} aria-label="Keranjang" onClick={() => setOpen("cart")}>
          <ShoppingBag className="h-5 w-5" />
          {count > 0 && <Dot n={count} />}
        </button>
        <button className={`${btn} ${tone(open === "account")}`} aria-label="Akun" onClick={() => setOpen("account")}>
          <User className="h-5 w-5" />
        </button>
      </nav>

      <Sheet open={open === "categories"} onOpenChange={(o) => !o && close()}>
        <SheetContent side="left" className="flex w-[85vw] max-w-sm flex-col">
          <SheetHeader><SheetTitle>Kategori Produk</SheetTitle></SheetHeader>
          <CategoryList onPick={close} />
        </SheetContent>
      </Sheet>

      <Sheet open={open === "voucher"} onOpenChange={(o) => !o && close()}>
        <SheetContent side="left" className="flex w-[85vw] max-w-sm flex-col">
          <SheetHeader><SheetTitle>Voucher Aktif</SheetTitle></SheetHeader>
          <VoucherList />
        </SheetContent>
      </Sheet>

      <Sheet open={open === "wishlist"} onOpenChange={(o) => !o && close()}>
        <SheetContent side="left" className="flex w-[85vw] max-w-sm flex-col">
          <SheetHeader><SheetTitle>Wishlist ({wish.length})</SheetTitle></SheetHeader>
          <div className="-mx-2 flex-1 overflow-y-auto px-2">
            {!wish.length && <Empty text="Belum ada produk favorit. Ketuk ikon hati pada produk." />}
            <ul className="space-y-3">
              {wish.map((w) => (
                <li key={w.id} className="flex items-center gap-3 rounded-xl border border-border p-2">
                  <Thumb src={w.image} alt={w.name} />
                  <Link to="/product/$slug" params={{ slug: w.slug }} onClick={close} className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold">{w.name}</p>
                    <p className="text-sm font-bold">{w.price ? formatPrice(w.price) : "Hubungi kami"}</p>
                  </Link>
                  <button aria-label="Hapus" onClick={() => wishlist.remove(w.id)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={open === "cart"} onOpenChange={(o) => !o && close()}>
        <SheetContent side="right" className="flex w-[85vw] max-w-sm flex-col">
          <SheetHeader><SheetTitle>Keranjang ({count})</SheetTitle></SheetHeader>
          <div className="-mx-2 flex-1 overflow-y-auto px-2">
            {!items.length && <Empty text="Keranjang masih kosong." />}
            <ul className="space-y-3">
              {items.map((i) => (
                <li key={i.key} className="flex gap-3 rounded-xl border border-border p-2">
                  <Thumb src={i.image} alt={i.name} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold">{i.name}</p>
                    {i.variantLabel && <p className="truncate text-xs text-muted-foreground">{i.variantLabel}</p>}
                    <p className="text-sm font-bold">{formatPrice(i.price)}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button aria-label="Kurangi" onClick={() => cart.setQty(i.key, i.quantity - 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border"><Minus className="h-3 w-3" /></button>
                      <span className="w-6 text-center text-sm font-semibold">{i.quantity}</span>
                      <button aria-label="Tambah" onClick={() => cart.setQty(i.key, i.quantity + 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {items.length > 0 && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-bold">{formatPrice(cartSubtotal(items))}</span></div>
              <Link to="/cart" onClick={close} className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                Checkout
              </Link>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={open === "account"} onOpenChange={(o) => !o && close()}>
        <SheetContent side="right" className="flex w-[85vw] max-w-sm flex-col">
          <SheetHeader><SheetTitle>Akun</SheetTitle></SheetHeader>
          <AccountPanel onClose={close} />
          <p className="mt-auto text-xs text-muted-foreground">{siteConfig.name} — {siteConfig.tagline}</p>
        </SheetContent>
      </Sheet>
    </>
  );
}

function CategoryList({ onPick }: { onPick: () => void }) {
  const { data, isLoading } = useQuery(categoriesQuery());
  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  return (
    <ul className="-mx-2 flex-1 space-y-1 overflow-y-auto px-2">
      <li>
        <Link to="/shop" onClick={onPick} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold hover:bg-secondary">
          Semua produk
        </Link>
      </li>
      {(data ?? []).map((c) => (
        <li key={c.id}>
          <Link to="/shop" search={{ category: c.id }} onClick={onPick} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-secondary">
            {c.image ? <img src={c.image} alt="" className="h-8 w-8 shrink-0 rounded-md bg-secondary object-contain" loading="lazy" /> : <span className="h-8 w-8 shrink-0 rounded-md bg-secondary" />}
            <span className="min-w-0 flex-1 truncate">{c.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{c.count}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MenuLink({ to, icon, label, onClick }: { to: "/account" | "/shop" | "/blog" | "/cart"; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <li>
      <Link to={to} onClick={onClick} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary">
        {icon} {label}
      </Link>
    </li>
  );
}

const authField = "h-11 w-full rounded-lg border border-input bg-card px-4 text-sm outline-none focus:border-foreground";

function AccountPanel({ onClose }: { onClose: () => void }) {
  const session = useAuth();
  if (session) return <LoggedInPanel name={session.name} onClose={onClose} />;
  return <AuthForms />;
}

function LoggedInPanel({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="rounded-2xl bg-secondary/60 p-4">
        <p className="text-xs text-muted-foreground">Halo, {timeGreeting()}</p>
        <p className="font-display text-lg font-bold">{name}!</p>
      </div>
      <ul className="mt-3 space-y-1">
        <MenuLink to="/account" icon={<Package className="h-5 w-5" />} label="Orderan Saya" onClick={onClose} />
        <MenuLink to="/cart" icon={<ShoppingBag className="h-5 w-5" />} label="Keranjang Saya" onClick={onClose} />
        <MenuLink to="/shop" icon={<Store className="h-5 w-5" />} label="Daftar Belanja" onClick={onClose} />
        {siteConfig.whatsapp ? (
          <li>
            <a
              href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent("Halo, saya ingin konfirmasi pembayaran pesanan saya.")}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary"
            >
              <ClipboardCheck className="h-5 w-5" /> Konfirmasi Pembayaran
            </a>
          </li>
        ) : (
          <MenuLink to="/account" icon={<ClipboardCheck className="h-5 w-5" />} label="Konfirmasi Pembayaran" onClick={onClose} />
        )}
        <MenuLink to="/account" icon={<Search className="h-5 w-5" />} label="Lacak Pesanan" onClick={onClose} />
        <MenuLink to="/blog" icon={<BookOpen className="h-5 w-5" />} label="Blog & panduan" onClick={onClose} />
        {siteConfig.whatsapp && (
          <li>
            <a href={`https://wa.me/${siteConfig.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary">
              <MessageCircle className="h-5 w-5" /> Hubungi via WhatsApp
            </a>
          </li>
        )}
      </ul>
      <button
        onClick={() => {
          auth.signOut();
          toast.success("Anda telah keluar.");
        }}
        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border text-sm font-bold text-destructive hover:bg-secondary"
      >
        <LogOut className="h-4 w-4" /> Keluar
      </button>
    </div>
  );
}

function AuthForms() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const login = useServerFn(loginCustomer);
  const register = useServerFn(registerCustomer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r =
        tab === "login"
          ? await login({ data: { email: String(f.get("email")), password: String(f.get("password")) } })
          : await register({
              data: {
                firstName: String(f.get("firstName")),
                lastName: String(f.get("lastName") ?? ""),
                email: String(f.get("email")),
                password: String(f.get("password")),
              },
            });
      if (!r.ok) {
        setError(r.message);
      } else {
        auth.signIn({ name: r.name, email: r.email, token: r.token });
        toast.success(tab === "login" ? `Selamat datang kembali, ${r.name}!` : `Akun berhasil dibuat. Halo, ${r.name}!`);
      }
    } catch {
      setError("Data tidak valid. Periksa kembali isian Anda.");
    }
    setBusy(false);
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-2 rounded-full bg-secondary p-1 text-sm font-semibold">
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setError("");
            }}
            className={`h-9 rounded-full transition-colors ${tab === t ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            {t === "login" ? "Masuk" : "Daftar"}
          </button>
        ))}
      </div>
      <form key={tab} onSubmit={submit} className="mt-4 space-y-3">
        {tab === "register" && (
          <div className="grid grid-cols-2 gap-3">
            <input name="firstName" required placeholder="Nama depan" className={authField} autoComplete="given-name" />
            <input name="lastName" placeholder="Nama belakang" className={authField} autoComplete="family-name" />
          </div>
        )}
        <input name="email" type="email" required placeholder="Email" className={authField} autoComplete="email" />
        <input
          name="password"
          type="password"
          required
          minLength={tab === "register" ? 6 : 1}
          placeholder={tab === "register" ? "Kata sandi (min. 6 karakter)" : "Kata sandi"}
          className={authField}
          autoComplete={tab === "login" ? "current-password" : "new-password"}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button disabled={busy} className="h-12 w-full rounded-full bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50">
          {busy ? "Memproses…" : tab === "login" ? "Masuk" : "Buat Akun"}
        </button>
      </form>
      <p className="mt-4 text-xs text-muted-foreground">
        Gunakan email & kata sandi akun {siteConfig.name} Anda. Lupa kata sandi? Atur ulang di{" "}
        <a href={`${siteConfig.storeUrl}/my-account/lost-password/`} target="_blank" rel="noreferrer" className="underline">
          halaman akun toko
        </a>
        .
      </p>
    </div>
  );
}

function Dot({ n }: { n: number }) {
  return (
    <span className="absolute left-1/2 top-1 ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
      {n}
    </span>
  );
}

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
      {src && <img src={src} alt={alt} className="h-full w-full object-contain p-1" loading="lazy" />}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{text}</p>;
}

function VoucherList() {
  const { data, isLoading, isError } = useQuery(couponsQuery());
  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (isError) return <Empty text="Voucher gagal dimuat." />;
  if (!data?.length) return <Empty text="Belum ada voucher aktif saat ini." />;
  const copy = (code: string) => {
    navigator.clipboard?.writeText(code);
    toast.success(`Kode ${code.toUpperCase()} disalin`);
  };
  return (
    <ul className="-mx-2 flex-1 space-y-3 overflow-y-auto px-2">
      {data.map((c) => (
        <li key={c.code} className="rounded-xl border border-dashed border-primary/50 bg-secondary/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-lg font-bold text-primary">
                {c.type === "percent" ? `Diskon ${c.amount}%` : `Potongan ${formatPrice(c.amount)}`}
              </p>
              {c.freeShipping && <p className="text-xs font-semibold">+ Gratis ongkir</p>}
              {c.description && <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                {c.minSpend > 0 && `Min. belanja ${formatPrice(c.minSpend)}`}
                {c.minSpend > 0 && c.expires && " · "}
                {c.expires && `s/d ${new Date(c.expires).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`}
              </p>
            </div>
          </div>
          <button onClick={() => copy(c.code)} className="mt-2 flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold tracking-wider">
            {c.code.toUpperCase()} <Copy className="h-4 w-4 text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  );
}
