"use client";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";

export default function CartDrawer() {
  const router = useRouter();
  const { lines, saved, count, subtotalCents, isOpen, closeCart, setQty, removeItem, saveForLater, moveToCart, removeSaved } = useCart();
  const taxCents = Math.round(subtotalCents * 0.07);
  const totalCents = subtotalCents + taxCents;

  function goCheckout() {
    closeCart();
    router.push("/checkout");
  }

  return (
    <>
      <div className={`overlay ${isOpen ? "open" : ""}`} onClick={closeCart} />
      <aside className={`drawer ${isOpen ? "open" : ""}`} aria-hidden={!isOpen}>
        <div className="drawer-head">
          <h3>Your Cart 🛒</h3>
          <button className="x" onClick={closeCart} aria-label="Close cart">×</button>
        </div>

        <div className="drawer-body">
          {count === 0 ? (
            <div className="empty-state">
              <div className="b">🛒</div>
              <p style={{ marginTop: 12 }}>Your cart is empty.</p>
              <p style={{ fontSize: 13, marginTop: 6 }}>Add some American-made goods!</p>
            </div>
          ) : (
            lines.map((l) => (
              <div className="citem" key={l.productId + (l.size || "")}>
                <div className="ph">{l.emoji}</div>
                <div className="info">
                  <div className="cseller">{l.storeName}</div>
                  <h4>{l.name}</h4>
                  {l.size && <div style={{ fontSize: 12, color: "var(--muted)" }}>Size: <strong>{l.size}</strong></div>}
                  <div className="qty">
                    <button onClick={() => setQty(l.productId, l.size, l.quantity - 1)} aria-label="Decrease">−</button>
                    <b>{l.quantity}</b>
                    <button onClick={() => setQty(l.productId, l.size, l.quantity + 1)} aria-label="Increase">+</button>
                    <span className="cprice" style={{ marginLeft: "auto" }}>{formatPrice(l.priceCents * l.quantity)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button className="remove" onClick={() => removeItem(l.productId, l.size)}>Remove</button>
                    <button className="remove" style={{ color: "var(--navy)" }} onClick={() => saveForLater(l.productId, l.size)}>Save for later</button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Saved for later */}
          {saved.length > 0 && (
            <div style={{ borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 12 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "var(--navy)", textTransform: "uppercase", letterSpacing: ".3px" }}>Saved for later ({saved.length})</h4>
              {saved.map((l) => (
                <div className="citem" key={"s" + l.productId + (l.size || "")}>
                  <div className="ph">{l.emoji}</div>
                  <div className="info">
                    <div className="cseller">{l.storeName}</div>
                    <h4>{l.name}</h4>
                    {l.size && <div style={{ fontSize: 12, color: "var(--muted)" }}>Size: <strong>{l.size}</strong></div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                      <span className="cprice">{formatPrice(l.priceCents)}</span>
                      <button className="remove" style={{ color: "var(--navy)" }} onClick={() => moveToCart(l.productId, l.size)}>Move to cart</button>
                      <button className="remove" onClick={() => removeSaved(l.productId, l.size)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {count > 0 && (
          <div className="drawer-foot">
            <div className="row total"><span>Subtotal ({count} item{count !== 1 ? "s" : ""})</span><span>{formatPrice(subtotalCents)}</span></div>
            <div className="row"><span>Shipping &amp; tax</span><span>Calculated at checkout</span></div>
            <button className="btn btn-red btn-block" onClick={goCheckout} style={{ marginTop: 8 }}>Proceed to Checkout</button>
          </div>
        )}
      </aside>
    </>
  );
}
