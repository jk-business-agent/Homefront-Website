"use client";
// Holds the shopping cart in React state and saves it to the browser so it
// survives refreshes. Each line keeps a small snapshot of the product so the
// cart can render without re-fetching.
import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type CartLine = {
  productId: string;
  name: string;
  slug: string;
  priceCents: number;
  emoji: string;
  storeName: string;
  madeInState?: string | null;
  shipFromState?: string | null;
  size?: string | null;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  saved: CartLine[];
  count: number;
  subtotalCents: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  setQty: (productId: string, size: string | null | undefined, qty: number) => void;
  removeItem: (productId: string, size: string | null | undefined) => void;
  saveForLater: (productId: string, size: string | null | undefined) => void;
  moveToCart: (productId: string, size: string | null | undefined) => void;
  removeSaved: (productId: string, size: string | null | undefined) => void;
  clear: () => void;
};

// Two lines are the same cart item only if product AND size match.
const sameLine = (a: { productId: string; size?: string | null }, b: { productId: string; size?: string | null }) =>
  a.productId === b.productId && (a.size || null) === (b.size || null);

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "hfm_cart";
const SAVED_KEY = "hfm_saved";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [saved, setSaved] = useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load saved cart + save-for-later once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
      const rawSaved = localStorage.getItem(SAVED_KEY);
      if (rawSaved) setSaved(JSON.parse(rawSaved));
    } catch {}
    setLoaded(true);
  }, []);

  // Persist whenever either list changes (after initial load).
  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, loaded]);
  useEffect(() => {
    if (loaded) localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  }, [saved, loaded]);

  const addItem = useCallback((line: Omit<CartLine, "quantity">, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => sameLine(l, line));
      if (existing) {
        return prev.map((l) => (sameLine(l, line) ? { ...l, quantity: l.quantity + qty } : l));
      }
      return [...prev, { ...line, quantity: qty }];
    });
    setIsOpen(true);
  }, []);

  const setQty = useCallback((productId: string, size: string | null | undefined, qty: number) => {
    const target = { productId, size };
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => !sameLine(l, target)) : prev.map((l) => (sameLine(l, target) ? { ...l, quantity: qty } : l))
    );
  }, []);

  const removeItem = useCallback((productId: string, size: string | null | undefined) => {
    setLines((prev) => prev.filter((l) => !sameLine(l, { productId, size })));
  }, []);

  const saveForLater = useCallback((productId: string, size: string | null | undefined) => {
    setLines((prev) => {
      const line = prev.find((l) => sameLine(l, { productId, size }));
      if (line) setSaved((s) => (s.some((x) => sameLine(x, line)) ? s : [...s, { ...line, quantity: 1 }]));
      return prev.filter((l) => !sameLine(l, { productId, size }));
    });
  }, []);

  const moveToCart = useCallback((productId: string, size: string | null | undefined) => {
    setSaved((prev) => {
      const line = prev.find((l) => sameLine(l, { productId, size }));
      if (line) setLines((c) => {
        const existing = c.find((l) => sameLine(l, line));
        return existing ? c.map((l) => (sameLine(l, line) ? { ...l, quantity: l.quantity + line.quantity } : l)) : [...c, line];
      });
      return prev.filter((l) => !sameLine(l, { productId, size }));
    });
  }, []);

  const removeSaved = useCallback((productId: string, size: string | null | undefined) => {
    setSaved((prev) => prev.filter((l) => !sameLine(l, { productId, size })));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const subtotalCents = lines.reduce((n, l) => n + l.priceCents * l.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        lines, saved, count, subtotalCents, isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        addItem, setQty, removeItem, saveForLater, moveToCart, removeSaved, clear,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
