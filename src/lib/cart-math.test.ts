import { describe, expect, it } from "vitest";
import { addItem, cartCount, cartSubtotal, cartTotal, setQuantity, type CartItem } from "./cart-math";

const a: CartItem = { key: "1", productId: 1, name: "A", slug: "a", price: 100000, image: null, quantity: 1 };
const b: CartItem = { key: "2", productId: 2, name: "B", slug: "b", price: 250000, image: null, quantity: 2 };

describe("cart math", () => {
  it("adding the same product increases quantity", () => {
    expect(addItem([a], { ...a, quantity: 2 })[0]?.quantity).toBe(3);
  });
  it("subtotal is price times quantity", () => {
    expect(cartSubtotal([a, b])).toBe(600000);
    expect(cartCount([a, b])).toBe(3);
  });
  it("quantity 0 removes the item", () => {
    expect(setQuantity([a, b], "1", 0)).toHaveLength(1);
  });
  it("total adds shipping, unknown shipping counts as 0", () => {
    expect(cartTotal([a], 20000)).toBe(120000);
    expect(cartTotal([a], null)).toBe(100000);
  });
});
