import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { discountPercent, useWishlist, wishlist } from "@/lib/wishlist";

export function Price({ price, regular, onSale }: { price: number; regular?: number; onSale?: boolean }) {
  if (!price) return <span className="text-sm text-muted-foreground">Hubungi kami</span>;
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="font-display text-sm font-bold sm:text-base">{formatPrice(price)}</span>
      {onSale && regular && regular > price && (
        <span className="text-[11px] text-muted-foreground line-through sm:text-xs">{formatPrice(regular)}</span>
      )}
    </span>
  );
}

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const wish = useWishlist();
  const liked = wish.some((w) => w.id === product.id);
  const pct = product.onSale ? discountPercent(product.price, product.regularPrice) : 0;
  const category = product.categories[0]?.name;
  const attr = product.attributes[0];

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-transform hover:-translate-y-0.5"
    >
      <div className="relative aspect-square bg-secondary">
        {product.image && (
          <img
            src={product.image}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            width={400}
            height={400}
            className={`h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105 sm:p-4 ${!product.inStock ? "opacity-50" : ""}`}
          />
        )}
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1 sm:left-3 sm:top-3">
          {pct > 0 && (
            <span className="rounded-full bg-sale px-2 py-0.5 text-[10px] font-bold text-primary-foreground sm:text-[11px]">
              -{pct}%
            </span>
          )}
          {product.onSale && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground sm:text-[11px]">
              PROMO
            </span>
          )}
          {!product.inStock && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground sm:text-[11px]">
              Habis
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label={liked ? "Hapus dari wishlist" : "Tambah ke wishlist"}
          aria-pressed={liked}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            wishlist.toggle({ id: product.id, name: product.name, slug: product.slug, price: product.price, image: product.image });
          }}
          className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 shadow-card backdrop-blur sm:right-3 sm:top-3"
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-sale text-sale" : "text-foreground"}`} />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        {category && (
          <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
            {category}
          </span>
        )}
        <h3 className="line-clamp-2 font-sans text-[13px] font-semibold leading-snug sm:text-sm">{product.name}</h3>
        {attr && attr.options.length > 0 && (
          <p className="truncate text-[11px] text-muted-foreground">
            {attr.name}: {attr.options.slice(0, 3).join(", ")}
            {attr.options.length > 3 ? ` +${attr.options.length - 3}` : ""}
          </p>
        )}
        <div className="mt-auto pt-1">
          <Price price={product.price} regular={product.regularPrice} onSale={product.onSale} />
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) return <p className="py-16 text-center text-muted-foreground">Produk tidak ditemukan.</p>;
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
