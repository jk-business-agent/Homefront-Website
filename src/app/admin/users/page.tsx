"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AdminNav from "@/components/AdminNav";

type U = { id: string; name: string; email: string; role: string; suspended: boolean; createdAt: string; orders: number };
const ROLES = ["ALL", "BUYER", "SELLER", "ADMIN"];

export default function AdminUsers() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<U[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");

  const load = useCallback((q = "", r = "ALL") => {
    const sp = new URLSearchParams();
    if (q) sp.set("search", q); if (r !== "ALL") sp.set("role", r);
    fetch(`/api/admin/users?${sp}`, { cache: "no-store" }).then((res) => res.json()).then((d) => setUsers(d.users || []));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login?next=/admin/users"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    load();
  }, [user, loading, router, load]);

  async function patch(id: string, body: any) {
    await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    load(search, role);
  }

  if (loading || !user || user.role !== "ADMIN") return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;

  return (
    <div className="page">
      <AdminNav />
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Users</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>Every account on the marketplace. Suspend bad actors or change roles.</p>

      <div className="panel">
        <form onSubmit={(e) => { e.preventDefault(); load(search, role); }} style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <input style={{ flex: 1, minWidth: 200, border: "1.5px solid var(--line)", borderRadius: 8, padding: "9px 12px", fontFamily: "var(--font-body)" }} placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={role} onChange={(e) => { setRole(e.target.value); load(search, e.target.value); }} style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "9px 12px" }}>{ROLES.map((r) => <option key={r} value={r}>{r === "ALL" ? "All roles" : r}</option>)}</select>
          <button className="btn btn-navy">Search</button>
        </form>

        {users.map((u) => (
          <div className="line-item" key={u.id} style={{ borderBottom: "1px solid var(--line)", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <strong>{u.name}</strong>{" "}
              <span className={`badge ${u.role === "ADMIN" ? "badge-paid" : u.role === "SELLER" ? "badge-shipped" : "badge-pending"}`}>{u.role}</span>
              {u.suspended && <span className="badge badge-pending" style={{ marginLeft: 6, background: "#f7e4e1", color: "var(--barn-dark)" }}>Suspended</span>}
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{u.email} · {u.orders} orders · joined {new Date(u.createdAt).toLocaleDateString()}</div>
            </div>
            {u.id === user.id ? <span style={{ fontSize: 12, color: "var(--muted)" }}>(you)</span> : (
              <>
                <select defaultValue={u.role} onChange={(e) => patch(u.id, { role: e.target.value })} style={{ border: "1.5px solid var(--line)", borderRadius: 7, padding: "5px 8px", fontSize: 13 }}>
                  {["BUYER", "SELLER", "ADMIN"].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button className={`btn ${u.suspended ? "btn-navy" : "btn-outline"}`} style={{ padding: "6px 11px" }} onClick={() => patch(u.id, { suspended: !u.suspended })}>{u.suspended ? "Unsuspend" : "Suspend"}</button>
              </>
            )}
          </div>
        ))}
        {users.length === 0 && <p style={{ color: "var(--muted)" }}>No users match.</p>}
      </div>
      <p style={{ marginTop: 10, fontSize: 13 }}><Link href="/" className="muted-link">← Back to storefront</Link></p>
    </div>
  );
}
