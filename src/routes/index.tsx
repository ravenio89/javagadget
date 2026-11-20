import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site.config";
import { categoriesQuery, postsQuery, productsQuery } from "@/lib/queries";
import { ProductGrid } from "@/components/store/ProductCard";
import { PostCard, StatusBlock } from "@/components/store/PostCard";

const latest = productsQuery({ page: 1, perPage: 8 });
const posts = postsQuery({ page: 1, perPage: 3 });

export const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) =>
    Promise.all([queryClient.ensureQueryData(latest), queryClient.ensureQueryData(categoriesQuery()), queryClient.ensureQueryData(posts)]),
  head: () => ({
    meta: [
      { title: `${siteConfig.name} — ${siteConfig.tagline}` },
      { name: "description", content: siteConfig.description },
      { property: "og:title", content: `${siteConfig.name} — ${siteConfig.tagline}` },
      { property: "og:description", content: siteConfig.description },
    ],
  }),
  component: Home,
  errorComponent: () => <StatusBlock title="Toko sedang tidak dapat dimuat">Silakan coba lagi sebentar.</StatusBlock>,
});

function Home() {
  const { data: products } = useSuspenseQuery(latest);
  const { data: cats } = useSuspenseQuery(categoriesQuery());
  const { data: blog } = useSuspenseQuery(posts);

  return (
    <>
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">{siteConfig.name}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.05] md:text-6xl">{siteConfig.tagline}</h1>
          <p className="mt-5 max-w-xl text-base opacity-80 md:text-lg">{siteConfig.description}</p>
          <Link to="/shop" className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-foreground transition-transform hover:scale-105">
            Mulai belanja <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-12">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {cats.slice(0, 14).map((c) => (
            <Link key={c.id} to="/shop" search={{ category: c.id }} className="whitespace-nowrap rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-foreground">
              {c.name} <span className="text-muted-foreground">{c.count}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold md:text-3xl">Produk terbaru</h2>
          <Link to="/shop" className="text-sm font-semibold underline underline-offset-4">Lihat semua</Link>
        </div>
        <ProductGrid products={products.items} />
      </section>

      {blog.items.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-20">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-bold md:text-3xl">Dari blog</h2>
            <Link to="/blog" className="text-sm font-semibold underline underline-offset-4">Semua artikel</Link>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {blog.items.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        </section>
      )}
    </>
  );
}
