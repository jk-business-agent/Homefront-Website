// Visual order progress tracker. Pure component — safe in server components.
const STAGES = [
  { key: "placed", label: "Placed", icon: "🧾" },
  { key: "paid", label: "Paid", icon: "💳" },
  { key: "shipped", label: "Shipped", icon: "🚚" },
  { key: "delivered", label: "Delivered", icon: "📦" },
];

export default function OrderProgress({ status }: { status: string }) {
  const current =
    status === "DELIVERED" ? 3 :
    status === "SHIPPED" ? 2 :
    status === "PAID" ? 1 : 1; // orders are created already-paid (payment simulated)

  return (
    <div className="op-track">
      {STAGES.map((s, i) => (
        <div key={s.key} className={`op-step ${i <= current ? "done" : ""} ${i === current ? "active" : ""}`}>
          <div className="op-dot">{i <= current ? s.icon : i + 1}</div>
          <div className="op-label">{s.label}</div>
          {i < STAGES.length - 1 && <div className={`op-line ${i < current ? "done" : ""}`} />}
        </div>
      ))}
    </div>
  );
}
