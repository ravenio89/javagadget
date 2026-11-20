import { siteConfig } from "@/config/site.config";

export function formatPrice(value: number) {
  return new Intl.NumberFormat(siteConfig.locale, {
    style: "currency",
    currency: siteConfig.currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "’")
    .replace(/&[a-z0-9#]+;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(siteConfig.locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
