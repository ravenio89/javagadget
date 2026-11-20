export type CartItem = {
  key: string; // productId or productId:variationId
  productId: number;
  variationId?: number | undefined;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  quantity: number;
  variantLabel?: string | undefined;
};

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function addItem(items: CartItem[], item: CartItem): CartItem[] {
  const existing = items.find((i) => i.key === item.key);
  if (existing) {
    return items.map((i) => (i.key === item.key ? { ...i, quantity: i.quantity + item.quantity } : i));
  }
  return [...items, item];
}

export function setQuantity(items: CartItem[], key: string, quantity: number): CartItem[] {
  if (quantity <= 0) return items.filter((i) => i.key !== key);
  return items.map((i) => (i.key === key ? { ...i, quantity } : i));
}

export function cartTotal(items: CartItem[], shippingCost: number | null) {
  return cartSubtotal(items) + (shippingCost ?? 0);
}
