import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { z } from "zod";
import { siteConfig } from "@/config/site.config";
import { postCategoriesQuery, postsQuery } from "@/lib/queries";
import { PostCard, StatusBlock } from "@/components/store/PostCard";

const searchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  category: z.number().int().optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
});

function toQuery(s: z.infer<typeof searchSchema>) {
  return { page: s.page ?? 1, perPage: siteConfig.postsPerPage, category: s.category, search: s.q };
}

export const Route = createFileRoute("/blog/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) =>
    Promise.all([queryClient.ensureQueryData(postsQuery(toQuery(deps))), queryClient.ensureQueryData(postCategoriesQuery())]),
  head: () => ({
    meta: [
      { title: `Blog & tips teknologi — ${siteConfig.name}` },
      { name: "description", content: `Artikel, rekomendasi, dan tips dari ${siteConfig.name}.` },
      { property: "og:title", content: `Blog — ${siteConfig.name}` },
      { property: "og:description", content: `Artikel dan rekomendasi dari ${siteConfig.name}.` },
    ],
  }),
  component: Blog,
  errorComponent: () => <StatusBlock title="Artikel tidak dapat dimuat" />,
});

function Blog() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/blog/" });
  const { data } = useSuspenseQuery(postsQuery(toQuery(search)));
  const { data: cats } = useSuspenseQuery(postCategoriesQuery());
  const page = search.page ?? 1;
  const active = cats.find((c) => c.id === search.category);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold md:text-4xl">{active?.name ?? "Insights"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{data.total} artikel</p>

      <form
        className="relative mt-6 max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
          navigate({ search: (p) => ({ ...p, q: q || undefined, page: undefined }) });
        }}
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={search.q}
          placeholder="Cari artikel…"
          className="h-11 w-full rounded-full border border-input bg-card pl-11 pr-5 text-sm outline-none focus:border-foreground"
        />
      </form>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        <Link
          to="/blog"
          search={(p) => ({ ...p, category: undefined, page: undefined })}
          className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${!search.category ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}
        >
          Semua
        </Link>
        {cats.map((c) => (
          <Link
            key={c.id}
            to="/blog"
            search={(p) => ({ ...p, category: c.id, page: undefined })}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${search.category === c.id ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {!data.items.length ? (
        <StatusBlock title="Tidak ada artikel yang cocok">
          Coba kata kunci atau kategori lain.
        </StatusBlock>
      ) : (
        <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}

      {data.totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link to="/blog" search={(p) => ({ ...p, page: page - 1 })} className="rounded-full border border-border px-4 py-2">← Sebelumnya</Link>}
          <span className="text-muted-foreground">Halaman {page} / {data.totalPages}</span>
          {page < data.totalPages && <Link to="/blog" search={(p) => ({ ...p, page: page + 1 })} className="rounded-full border border-border px-4 py-2">Berikutnya →</Link>}
        </div>
      )}
    </div>
  );
}
