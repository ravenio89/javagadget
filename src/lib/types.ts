export type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  regularPrice: number;
  onSale: boolean;
  inStock: boolean;
  image: string | null;
  images: string[];
  shortDescription: string;
  description: string;
  categories: { id: number; name: string; slug: string }[];
  type: string;
  attributes: { name: string; options: string[] }[];
  variations: number[];
};

export type Variation = {
  id: number;
  price: number;
  inStock: boolean;
  image: string | null;
  attributes: { name: string; option: string }[];
};

export type Category = { id: number; name: string; slug: string; count: number; image: string | null };

export type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  image: string | null;
};

export type PostCategory = { id: number; name: string; slug: string; count: number };

export type Paged<T> = { items: T[]; total: number; totalPages: number };

export type ShippingMethod = { id: string; title: string; cost: number | null };

export type OrderSummary = {
  id: number;
  number: string;
  status: string;
  total: number;
  date: string;
  paymentUrl: string | null;
  items: { name: string; quantity: number; total: number }[];
  shippingLines: string[];
};

export type Coupon = {
  code: string;
  type: "percent" | "fixed_cart" | "fixed_product";
  amount: number;
  description: string;
  expires: string | null;
  minSpend: number;
  freeShipping: boolean;
};
