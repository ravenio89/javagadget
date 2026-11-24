/**
 * White-label config. To launch for a new client: edit this file
 * (and theme tokens in src/styles.css), then link that client's
 * WordPress + WooCommerce connections. No other code changes needed.
 */
export const siteConfig = {
  name: "JavaGadget",
  tagline: "Gadget, Laptop & Aksesori Teknologi Pilihan",
  description:
    "Belanja gadget, smartphone, laptop, dan aksesori original dengan harga terbaik dan pengiriman ke seluruh Indonesia.",
  siteUrl: "https://javagadget.com",
  storeUrl: "https://store.javagadget.com",
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
