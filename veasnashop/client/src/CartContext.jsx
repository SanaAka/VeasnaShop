import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "veasna_cart";

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return [];
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const [promoCode, setPromoCode] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (_) {}
  }, [items]);

  const applyPromo = (code) => {
    const c = String(code || "").trim().toUpperCase();
    if (c === "BOTANICAL15") { setPromoCode(c); return true; }
    return false;
  };

  const clearPromo = () => setPromoCode("");

  const addItem = (item) => {
    setItems((list) => {
      const key = item.variantId ? `v${item.variantId}` : `p${item.productId}`;
      const existing = list.find(
        (it) =>
          (item.variantId && it.variantId === item.variantId) ||
          (!item.variantId && it.productId === item.productId)
      );
      if (existing) {
        return list.map((it) =>
          it === existing ? { ...it, qty: Math.min(10, it.qty + (item.qty || 1)) } : it
        );
      }
      return [...list, { ...item, qty: item.qty || 1 }];
    });
  };

  const updateQty = (id, delta) =>
    setItems((list) =>
      list.map((it) => (it.productId === id ? { ...it, qty: Math.max(1, Math.min(10, it.qty + delta)) } : it))
    );

  const removeItem = (id) => setItems((list) => list.filter((it) => it.productId !== id));

  const toggleGiftWrap = (id) =>
    setItems((list) => list.map((it) => (it.productId === id ? { ...it, giftWrap: !it.giftWrap } : it)));

  const clearCart = () => setItems([]);

  const value = useMemo(
    () => ({ items, addItem, updateQty, removeItem, toggleGiftWrap, clearCart, promoCode, applyPromo, clearPromo }),
    [items, promoCode]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
