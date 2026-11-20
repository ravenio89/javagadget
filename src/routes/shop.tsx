import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { siteConfig } from "@/config/site.config";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { ProductGrid } from "@/components/store/ProductCard";
import { StatusBlock } from "@/components/store/PostCard";

const searchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  category: z.number().int().optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
  sort: z.enum(["new", "price-asc", "price-desc", "popular"]).optional().catch(undefined),
});

function toQuery(s: z.infer<typeof searchSchema>) {
  const sort = s.sort ?? "new";
  return {
    page: s.page ?? 1,
    perPage: siteConfig.productsPerPage,
    category: s.category,
    search: s.q,
    orderby: sort === "popular" ? ("popularity" as const) : sort.startsWith("price") ? ("price" as const) : ("date" as const),
    order: sort === "price-asc" ? ("asc" as const) : ("desc" as const),
  };
}

export const Route = createFileRoute("/shop")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) =>
    Promise.all([queryClient.ensureQueryData(productsQuery(toQuery(deps))), queryClient.ensureQueryData(categoriesQuery())]),
  head: () => ({
    meta: [
      { title: `Belanja semua produk — ${siteConfig.name}` },
      { name: "description", content: `Katalog lengkap ${siteConfig.name}: ${siteConfig.tagline}.` },
      { property: "og:title", content: `Belanja — ${siteConfig.name}` },
      { property: "og:description", content: `Katalog lengkap ${siteConfig.name}.` },
    ],
  }),
  component: Shop,
  errorComponent: () => <StatusBlock title="Katalog tidak dapat dimuat">Silakan muat ulang halaman.</StatusBlock>,
});

function Shop() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const { data } = useSuspenseQuery(productsQuery(toQuery(search)));
  const { data: cats } = useSuspenseQuery(categoriesQuery());
  const page = search.page ?? 1;
  const active = cats.find((c) => c.id === search.category);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold md:text-4xl">{active?.name ?? "All Items"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{data.total} produk</p>

      <div className="mt-6 flex flex-col gap-3 md:flex-row">
        <form
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
            navigate({ search: (p) => ({ ...p, q: q || undefined, page: undefined }) });
          }}
        >
          <input name="q" defaultValue={search.q} placeholder="Cari produk…" className="h-11 w-full rounded-full border border-input bg-card px-5 text-sm outline-none focus:border-foreground" />
        </form>
        <select
          value={search.sort ?? "new"}
          onChange={(e) => navigate({ search: (p) => ({ ...p, sort: e.target.value as never, page: undefined }) })}
          className="h-11 rounded-full border border-input bg-card px-4 text-sm"
          aria-label="Urutkan"
        >
          <option value="new">Terbaru</option>
          <option value="popular">Terlaris</option>
          <option value="price-asc">Harga terendah</option>
          <option value="price-desc">Harga tertinggi</option>
        </select>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        <Link to="/shop" search={(p) => ({ ...p, category: undefined, page: undefined })} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${!search.category ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}>
          Semua
        </Link>
        {cats.map((c) => (
          <Link key={c.id} to="/shop" search={(p) => ({ ...p, category: c.id, page: undefined })} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${search.category === c.id ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}>
            {c.name}
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <ProductGrid products={data.items} />
      </div>

      {data.totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link to="/shop" search={(p) => ({ ...p, page: page - 1 })} className="rounded-full border border-border px-4 py-2">← Sebelumnya</Link>}
          <span className="text-muted-foreground">Halaman {page} / {data.totalPages}</span>
          {page < data.totalPages && <Link to="/shop" search={(p) => ({ ...p, page: page + 1 })} className="rounded-full border border-border px-4 py-2">Berikutnya →</Link>}
        </div>
      )}
    </div>
  );
}
