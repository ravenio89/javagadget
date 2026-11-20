import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { postQuery } from "@/lib/queries";
import { WpArticle, wpHead } from "@/components/store/WpArticle";
import { StatusBlock } from "@/components/store/PostCard";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ context: { queryClient }, params }) => queryClient.ensureQueryData(postQuery(params.slug)),
  head: ({ loaderData }) => wpHead(loaderData, "article"),
  component: PostPage,
  notFoundComponent: () => <StatusBlock title="Artikel tidak ditemukan"><Link to="/blog" className="underline">Kembali ke blog</Link></StatusBlock>,
  errorComponent: () => <StatusBlock title="Artikel tidak dapat dimuat" />,
});

function PostPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(postQuery(slug));
  return <WpArticle post={data} showDate />;
}
