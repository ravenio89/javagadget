import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { pageQuery } from "@/lib/queries";
import { WpArticle, wpHead } from "@/components/store/WpArticle";
import { StatusBlock } from "@/components/store/PostCard";

// Any WordPress page by slug, e.g. /tentang-kami, /kebijakan-privasi
export const Route = createFileRoute("/$slug")({
  loader: ({ context: { queryClient }, params }) => queryClient.ensureQueryData(pageQuery(params.slug)),
  head: ({ loaderData }) => wpHead(loaderData, "website"),
  component: WpPage,
  notFoundComponent: () => <StatusBlock title="Halaman tidak ditemukan"><Link to="/" className="underline">Ke beranda</Link></StatusBlock>,
  errorComponent: () => <StatusBlock title="Halaman tidak dapat dimuat" />,
});

function WpPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(pageQuery(slug));
  return <WpArticle post={data} />;
}
