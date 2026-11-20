import type { Post } from "@/lib/types";
import { formatDate, stripHtml } from "@/lib/format";
import { siteConfig } from "@/config/site.config";

export function wpHead(post: Post | undefined, type: "article" | "website") {
  if (!post) return { meta: [{ title: `Tidak tersedia — ${siteConfig.name}` }, { name: "robots", content: "noindex" }] };
  const title = stripHtml(post.title);
  const desc = stripHtml(post.excerpt || post.content).slice(0, 155);
  return {
    meta: [
      { title: `${title} — ${siteConfig.name}` },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: type },
      ...(post.image ? [{ property: "og:image", content: post.image }, { name: "twitter:image", content: post.image }] : []),
    ],
  };
}

export function WpArticle({ post, showDate }: { post: Post; showDate?: boolean }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      {showDate && <p className="text-sm text-muted-foreground">{formatDate(post.date)}</p>}
      <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl" dangerouslySetInnerHTML={{ __html: post.title }} />
      {post.image && <img src={post.image} alt="" className="mt-8 w-full rounded-2xl" fetchPriority="high" />}
      <div className="prose-wp mt-8" dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
