"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AdminNav from "@/components/AdminNav";

type Entry = { id: string; adminName: string; action: string; detail: string | null; createdAt: string };

export default function AdminAudit() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login?next=/admin/audit"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    fetch("/api/admin/audit", { cache: "no-store" }).then((r) => r.json()).then((d) => setEntries(d.entries || []));
  }, [user, loading, router]);

  if (loading || !user || user.role !== "ADMIN") return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;

  return (
    <div className="page">
      <AdminNav />
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Audit Log</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>A record of admin actions across the platform.</p>

      <div className="panel">
        {entries.length === 0 ? <p style={{ color: "var(--muted)" }}>No admin actions logged yet.</p> :
          entries.map((e) => (
            <div className="line-item" key={e.id} style={{ borderBottom: "1px solid var(--line)", gap: 12 }}>
              <code style={{ background: "var(--navy)", color: "#f3e9d8", padding: "3px 8px", borderRadius: 5, fontSize: 12, whiteSpace: "nowrap" }}>{e.action}</code>
              <div style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 14 }}>{e.detail}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "right", whiteSpace: "nowrap" }}>{e.adminName}<br />{new Date(e.createdAt).toLocaleString()}</div>
            </div>
          ))}
      </div>
      <p style={{ marginTop: 10, fontSize: 13 }}><Link href="/" className="muted-link">← Back to storefront</Link></p>
    </div>
  );
}
