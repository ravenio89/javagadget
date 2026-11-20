import { useSyncExternalStore } from "react";

export type WishItem = {
  id: number;
  name: string;
  slug: string;
  price: number;
  image: string | null;
};

const KEY = "headless-wishlist-v1";
let items: WishItem[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const EMPTY: WishItem[] = [];

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    items = JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    items = [];
  }
}

function commit(next: WishItem[]) {
  items = next;
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}

export const wishlist = {
  toggle: (item: WishItem) => {
    load();
    commit(items.some((i) => i.id === item.id) ? items.filter((i) => i.id !== item.id) : [...items, item]);
  },
  remove: (id: number) => {
    load();
    commit(items.filter((i) => i.id !== id));
  },
};

export function useWishlist() {
  return useSyncExternalStore(
    (cb) => {
      load();
      listeners.add(cb);
      cb();
      return () => listeners.delete(cb);
    },
    () => (loaded ? items : EMPTY),
    () => EMPTY,
  );
}

/** Discount percentage, rounded; 0 when not on sale. */
export function discountPercent(price: number, regular: number) {
  if (!regular || !price || regular <= price) return 0;
  return Math.round(((regular - price) / regular) * 100);
}
