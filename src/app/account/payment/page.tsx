"use client";
// Payment methods — placeholder until Stripe is connected.
export default function PaymentPage() {
  return (
    <div className="panel">
      <h2>Payment Methods</h2>
      <p className="panel-sub">Manage how you pay.</p>
      <div className="empty-state">
        <div className="b">💳</div>
        <p style={{ marginTop: 12 }}>Saved cards are coming with secure checkout.</p>
        <p style={{ fontSize: 13, color: "var(--muted)", maxWidth: 380, margin: "8px auto 0" }}>
          We'll connect Stripe so you can save cards safely — your card details never touch our servers.
          For now, orders are placed without a live charge.
        </p>
      </div>
    </div>
  );
}
