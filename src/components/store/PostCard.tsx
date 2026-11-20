import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { Post } from "@/lib/types";
import { formatDate, stripHtml } from "@/lib/format";

export function PostCard({ post }: { post: Post }) {
  return (
    <Link to="/blog/$slug" params={{ slug: post.slug }} className="group flex flex-col gap-3">
      <div className="aspect-[16/10] overflow-hidden rounded-xl bg-secondary">
        {post.image && (
          <img src={post.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">{formatDate(post.date)}</p>
      <h3 className="line-clamp-2 text-base font-semibold leading-snug" dangerouslySetInnerHTML={{ __html: post.title }} />
      <p className="line-clamp-2 text-sm text-muted-foreground">{stripHtml(post.excerpt)}</p>
    </Link>
  );
}

export function StatusBlock({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children && <div className="mt-3 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
