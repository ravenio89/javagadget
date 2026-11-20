/**
 * White-label config. To launch for a new client: edit this file
 * (and theme tokens in src/styles.css), then link that client's
 * WordPress + WooCommerce connections. No other code changes needed.
 */
export const siteConfig = {
  name: "ORBIT GLOBAL TECHNOLOGY",
  tagline: "Laptop, PC & aksesori teknologi pilihan",
  description:
    "Belanja laptop gaming, PC, dan aksesori original dengan harga terbaik dan pengiriman ke seluruh Indonesia.",
  storeUrl: "https://orbit.co.id",
  locale: "id-ID",
  currency: "IDR",
  country: "ID",
  whatsapp: "",
  nav: [
    { label: "Shop", to: "/shop" },
    { label: "Insights", to: "/blog" },
    { label: "My Order", to: "/account" },
  ],
  productsPerPage: 12,
  postsPerPage: 9,
} as const;

export type SiteConfig = typeof siteConfig;
