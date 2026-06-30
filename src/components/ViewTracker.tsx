"use client";
// Records a product view once when the product page mounts. Renders nothing.
import { useEffect, useRef } from "react";

export default function ViewTracker({ productId }: { productId: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fetch(`/api/products/${productId}/view`, { method: "POST" }).catch(() => {});
  }, [productId]);
  return null;
}
