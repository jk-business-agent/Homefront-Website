"use client";
// Tracks which products the logged-in user has liked, so heart buttons across
// the site stay in sync. Loads once on mount.
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";

type FavCtx = {
  ids: Set<string>;
  isLiked: (productId: string) => boolean;
  toggle: (productId: string) => Promise<{ liked: boolean; likeCount: number } | null>;
};

const Ctx = createContext<FavCtx | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) { setIds(new Set()); return; }
    fetch("/api/account/favorites?ids=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setIds(new Set(d.productIds || [])))
      .catch(() => {});
  }, [user]);

  const isLiked = useCallback((id: string) => ids.has(id), [ids]);

  const toggle = useCallback(async (productId: string) => {
    const res = await fetch(`/api/products/${productId}/like`, { method: "POST" });
    if (res.status === 401) return null; // not signed in
    const data = await res.json();
    setIds((prev) => {
      const next = new Set(prev);
      if (data.liked) next.add(productId);
      else next.delete(productId);
      return next;
    });
    return data;
  }, []);

  return <Ctx.Provider value={{ ids, isLiked, toggle }}>{children}</Ctx.Provider>;
}

export function useFavorites() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFavorites must be used inside <FavoritesProvider>");
  return c;
}
