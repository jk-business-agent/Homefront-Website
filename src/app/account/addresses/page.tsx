"use client";
import { useEffect, useState } from "react";

type Address = { id: string; fullName: string; line1: string; line2?: string | null; city: string; state: string; zip: string; isDefault: boolean };

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", line1: "", line2: "", city: "", state: "", zip: "" });
  const [err, setErr] = useState("");

  function load() {
    fetch("/api/account/addresses", { cache: "no-store" }).then((r) => r.json()).then((d) => setAddresses(d.addresses || []));
  }
  useEffect(load, []);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const res = await fetch("/api/account/addresses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "Could not save"); return; }
    setForm({ fullName: "", line1: "", line2: "", city: "", state: "", zip: "" });
    setShowForm(false); load();
  }

  async function remove(id: string) {
    await fetch(`/api/account/addresses?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="panel">
      <h2>Addresses</h2>
      <p className="panel-sub">Your saved shipping addresses.</p>

      {addresses.length === 0 && !showForm && <p style={{ color: "var(--muted)" }}>No saved addresses yet.</p>}

      {addresses.map((a) => (
        <div className="order-card" key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>{a.fullName}</strong> {a.isDefault && <span className="badge badge-shipped">Default</span>}
            <div style={{ fontSize: 14, color: "var(--muted)", fontFamily: "var(--font-body)" }}>
              {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.zip}
            </div>
          </div>
          <button className="remove" onClick={() => remove(a.id)}>Remove</button>
        </div>
      ))}

      {showForm ? (
        <form onSubmit={add} style={{ marginTop: 14, maxWidth: 520 }}>
          {err && <div className="alert alert-error">{err}</div>}
          <div className="field"><label>Full name</label><input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required /></div>
          <div className="field"><label>Street address</label><input value={form.line1} onChange={(e) => set("line1", e.target.value)} required /></div>
          <div className="field"><label>Apt / Suite (optional)</label><input value={form.line2} onChange={(e) => set("line2", e.target.value)} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
            <div className="field"><label>City</label><input value={form.city} onChange={(e) => set("city", e.target.value)} required /></div>
            <div className="field"><label>State</label><input value={form.state} onChange={(e) => set("state", e.target.value)} required /></div>
            <div className="field"><label>ZIP</label><input value={form.zip} onChange={(e) => set("zip", e.target.value)} required /></div>
          </div>
          <button className="btn btn-navy">Save address</button>{" "}
          <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
        </form>
      ) : (
        <button className="btn btn-navy" style={{ marginTop: 12 }} onClick={() => setShowForm(true)}>+ Add an address</button>
      )}
    </div>
  );
}
