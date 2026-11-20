import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { siteConfig } from "@/config/site.config";
import { productQuery } from "@/lib/queries";
import { cart } from "@/lib/cart";
import { stripHtml } from "@/lib/format";
import { Price } from "@/components/store/ProductCard";
import { StatusBlock } from "@/components/store/PostCard";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ context: { queryClient }, params }) => queryClient.ensureQueryData(productQuery(params.slug)),
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: `Produk — ${siteConfig.name}` }, { name: "robots", content: "noindex" }] };
    const p = loaderData.product;
    const desc = stripHtml(p.shortDescription || p.description).slice(0, 155);
    return {
      meta: [
        { title: `${p.name} — ${siteConfig.name}` },
        { name: "description", content: desc },
        { property: "og:title", content: p.name },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        ...(p.image ? [{ property: "og:image", content: p.image }, { name: "twitter:image", content: p.image }] : []),
      ],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org", "@type": "Product", name: p.name, image: p.images, description: desc,
          offers: { "@type": "Offer", price: p.price, priceCurrency: siteConfig.currency, availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
        }),
      }],
    };
  },
  component: ProductPage,
  notFoundComponent: () => <StatusBlock title="Produk tidak ditemukan"><Link to="/shop" className="underline">Kembali ke katalog</Link></StatusBlock>,
  errorComponent: () => <StatusBlock title="Produk tidak dapat dimuat">Silakan coba lagi.</StatusBlock>,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: { product, variations } } = useSuspenseQuery(productQuery(slug));
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [picked, setPicked] = useState<Record<string, string>>({});

  const variation = useMemo(() => {
    if (!product.attributes.length) return null;
    if (product.attributes.some((a) => !picked[a.name])) return null;
    return variations.find((v) => v.attributes.every((a) => !a.option || picked[a.name] === a.option)) ?? null;
  }, [picked, product.attributes, variations]);

  const needsVariant = product.type === "variable" && product.attributes.length > 0;
  const price = variation?.price ?? product.price;
  const inStock = variation ? variation.inStock : product.inStock;
  const images = variation?.image ? [variation.image, ...product.images] : product.images;
  const canBuy = inStock && price > 0 && (!needsVariant || !!variation);

  function add() {
    cart.add({
      key: variation ? `${product.id}:${variation.id}` : String(product.id),
      productId: product.id,
      variationId: variation?.id,
      name: product.name,
      slug: product.slug,
      price,
      image: images[0] ?? null,
      quantity: qty,
      variantLabel: variation ? Object.values(picked).join(" / ") : undefined,
    });
    toast.success("Ditambahkan ke keranjang", { action: { label: "Lihat", onClick: () => (window.location.href = "/cart") } });
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-2">
      <div>
        <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-card">
          {images[imgIdx] && <img src={images[imgIdx]} alt={product.name} className="h-full w-full object-contain p-6" fetchPriority="high" />}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.slice(0, 8).map((src, i) => (
              <button key={src + i} onClick={() => setImgIdx(i)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-card ${i === imgIdx ? "border-foreground" : "border-border"}`}>
                <img src={src} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-wrap gap-2 text-xs">
          {product.categories.map((c) => (
            <Link key={c.id} to="/shop" search={{ category: c.id }} className="rounded-full bg-secondary px-3 py-1 font-medium">{c.name.replace(/^[:\s]+/, "")}</Link>
          ))}
        </div>
        <h1 className="mt-3 text-2xl font-bold leading-tight md:text-3xl">{product.name}</h1>
        <div className="mt-4 text-2xl"><Price price={price} regular={product.regularPrice} onSale={product.onSale} /></div>
        <p className={`mt-2 text-sm font-medium ${inStock ? "text-success" : "text-destructive"}`}>{inStock ? "Tersedia" : "Stok habis"}</p>

        {product.attributes.map((a) => (
          <div key={a.name} className="mt-6">
            <p className="mb-2 text-sm font-semibold">{a.name}</p>
            <div className="flex flex-wrap gap-2">
              {a.options.map((o) => (
                <button key={o} onClick={() => setPicked((p) => ({ ...p, [a.name]: o }))} className={`rounded-full border px-4 py-1.5 text-sm ${picked[a.name] === o ? "border-foreground bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                  {o}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-8 flex gap-3">
          <div className="flex h-12 items-center rounded-full border border-border bg-card">
            <button className="h-full px-4" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Kurangi">−</button>
            <span className="w-6 text-center text-sm font-semibold">{qty}</span>
            <button className="h-full px-4" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="Tambah">+</button>
          </div>
          <button disabled={!canBuy} onClick={add} className="h-12 flex-1 rounded-full bg-primary text-sm font-bold text-primary-foreground transition-opacity disabled:opacity-40">
            {needsVariant && !variation ? "Pilih varian" : "Tambah ke keranjang"}
          </button>
        </div>

        {product.shortDescription && <div className="prose-wp mt-8 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: product.shortDescription }} />}
        {product.description && (
          <div className="mt-8 border-t border-border pt-8">
            <h2 className="mb-4 text-lg font-bold">Deskripsi</h2>
            <div className="prose-wp text-sm" dangerouslySetInnerHTML={{ __html: product.description }} />
          </div>
        )}
      </div>
    </div>
  );
}
