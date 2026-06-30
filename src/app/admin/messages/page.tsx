"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import MessagesPanel from "@/components/MessagesPanel";
import AdminNav from "@/components/AdminNav";

// Platform/admin view — see and join every buyer↔seller conversation.
export default function AdminMessagesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login?next=/admin/messages"); return; }
    if (user.role !== "ADMIN") router.push("/");
  }, [user, loading, router]);

  if (loading || !user || user.role !== "ADMIN") {
    return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;
  }

  return (
    <div className="page">
      <AdminNav />
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Support Inbox</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>
        Every buyer ↔ seller conversation. Reply as Homefront Support to join the thread.
      </p>
      <MessagesPanel as="admin" />
      <p style={{ marginTop: 10, fontSize: 13 }}><Link href="/" className="muted-link">← Back to storefront</Link></p>
    </div>
  );
}
