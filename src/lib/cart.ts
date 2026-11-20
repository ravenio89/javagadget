import { useSyncExternalStore } from "react";
import { addItem, setQuantity, type CartItem } from "./cart-math";

const KEY = "headless-cart-v1";
let items: CartItem[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const EMPTY: CartItem[] = [];

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    items = JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    items = [];
  }
}

function commit(next: CartItem[]) {
  items = next;
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}

export const cart = {
  add: (item: CartItem) => {
    load();
    commit(addItem(items, item));
  },
  setQty: (key: string, qty: number) => {
    load();
    commit(setQuantity(items, key, qty));
  },
  clear: () => commit([]),
};

export function useCart() {
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
