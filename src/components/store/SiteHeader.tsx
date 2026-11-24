import { Link } from "@tanstack/react-router";
import { ShoppingBag, User } from "lucide-react";
import { siteConfig } from "@/config/site.config";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { cartCount } from "@/lib/cart-math";

export function SiteHeader() {
  const items = useCart();
  const session = useAuth();
  const count = cartCount(items);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link to="/" className="font-display text-xl font-bold tracking-tight">
          {siteConfig.name}
          <span className="ml-0.5 inline-block h-2 w-2 rounded-full bg-accent" />
        </Link>
        <nav className="hidden gap-6 text-sm font-medium md:flex">
          {siteConfig.nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link
            to="/account"
            aria-label={session ? `Akun ${session.name}` : "Masuk atau Daftar"}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm font-medium transition-colors hover:border-foreground"
          >
            <User className="h-4 w-4" />
            <span className="max-w-28 truncate">{session ? session.name.split(" ")[0] : "Masuk"}</span>
            {session && <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />}
          </Link>
          <Link
            to="/cart"
            aria-label="Keranjang"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <ShoppingBag className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
      <nav className="flex gap-5 overflow-x-auto px-4 pb-2 text-sm font-medium md:hidden">
        {siteConfig.nav.map((n) => (
          <Link key={n.to} to={n.to} className="whitespace-nowrap text-muted-foreground" activeProps={{ className: "text-foreground" }}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm text-muted-foreground md:flex-row md:justify-between">
        <div>
          <p className="font-display text-base font-bold text-foreground">{siteConfig.name}</p>
          <p className="mt-1">{siteConfig.tagline}</p>
        </div>
        <div className="flex gap-6">
          {siteConfig.nav.map((n) => (
            <Link key={n.to} to={n.to} className="hover:text-foreground">
              {n.label}
            </Link>
          ))}
        </div>
        <p>© {new Date().getFullYear()} {siteConfig.name}</p>
      </div>
    </footer>
  );
}
