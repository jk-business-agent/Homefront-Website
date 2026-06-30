"use client";
import { useState } from "react";
import { useCart, CartLine } from "@/lib/cart-context";

export default function AddToCartButton({
  product, sizes = [], sizeStock = {},
}: {
  product: Omit<CartLine, "quantity">;
  sizes?: string[];
  sizeStock?: Record<string, number>;
}) {
  const { addItem } = useCart();
  const tracksStock = Object.keys(sizeStock).length > 0;
  const inStock = (s: string) => !tracksStock || (sizeStock[s] ?? 0) > 0;
  const firstAvailable = sizes.find(inStock) || "";

  const [qty, setQty] = useState(1);
  const [size, setSize] = useState<string>(firstAvailable || sizes[0] || "");

  const selectedOut = sizes.length > 0 && tracksStock && !inStock(size);
  const selectedLeft = tracksStock ? sizeStock[size] : undefined;

  return (
    <div>
      {sizes.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: "var(--font-head)", textTransform: "uppercase", letterSpacing: ".4px", fontSize: 12, color: "var(--navy)", marginBottom: 6 }}>
            Size: <span style={{ color: "var(--barn)" }}>{size}</span>
            {selectedLeft !== undefined && selectedLeft > 0 && selectedLeft <= 5 && <span style={{ color: "var(--barn)", marginLeft: 8 }}>Only {selectedLeft} left</span>}
          </div>
          <div className="chips">
            {sizes.map((s) => {
              const out = !inStock(s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={out}
                  className={`chip ${size === s ? "active" : ""}`}
                  onClick={() => setSize(s)}
                  style={out ? { opacity: 0.4, textDecoration: "line-through", cursor: "not-allowed" } : undefined}
                  title={out ? "Out of stock" : `${sizeStock[s] ?? ""} in stock`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="qty" style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 14, color: "var(--muted)", marginRight: 6 }}>Quantity</span>
        <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
        <b>{qty}</b>
        <button onClick={() => setQty((q) => q + 1)} aria-label="Increase">+</button>
      </div>

      {selectedOut ? (
        <button className="btn btn-outline btn-block" disabled>Out of stock in {size}</button>
      ) : (
        <button className="btn btn-navy btn-block" onClick={() => addItem({ ...product, size: size || null }, qty)}>
          Add to Cart
        </button>
      )}
    </div>
  );
}
