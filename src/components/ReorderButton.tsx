"use client";
import { useRouter } from "next/navigation";
import { useCart, CartLine } from "@/lib/cart-context";

// Adds all of a past order's items back to the cart, then opens the cart.
export default function ReorderButton({ items }: { items: Omit<CartLine, "quantity">[] & { quantity?: number }[] }) {
  const router = useRouter();
  const { addItem, openCart } = useCart();

  function reorder() {
    for (const it of items as any[]) {
      const { quantity, ...line } = it;
      addItem(line, quantity || 1);
    }
    openCart();
    router.refresh();
  }

  return <button className="btn btn-navy" onClick={reorder}>🔁 Reorder</button>;
}
