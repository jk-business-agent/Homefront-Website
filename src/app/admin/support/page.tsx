"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AdminNav from "@/components/AdminNav";

type Thread = { id: string; name: string; email: string; status: string; lastMessageAt: string; lastSnippet: string };
type Msg = { id: string; body: string; fromRole: string; senderName: string; createdAt: string };

export default function AdminSupport() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<{ name: string; email: string; status: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(() => {
    fetch("/api/admin/support", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      setThreads(d.threads || []);
      setActiveId((cur) => cur || d.threads?.[0]?.id || null);
    });
  }, []);

  const loadThread = useCallback((id: string) => {
    fetch(`/api/admin/support/${id}`, { cache: "no-store" }).then((r) => r.json()).then((d) => { if (d.thread) { setActive(d.thread); setMessages(d.messages); } });
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login?next=/admin/support"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    loadThreads();
  }, [user, loading, router, loadThreads]);

  useEffect(() => {
    if (!activeId) return;
    loadThread(activeId);
    const t = setInterval(() => loadThread(activeId), 5000);
    return () => clearInterval(t);
  }, [activeId, loadThread]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !activeId) return;
    const body = text; setText("");
    await fetch(`/api/admin/support/${activeId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
    loadThread(activeId); loadThreads();
  }

  if (loading || !user || user.role !== "ADMIN") return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;

  return (
    <div className="page">
      <AdminNav />
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Help Desk</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>Questions from visitors via the "Chat with us" widget.</p>

      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        <div className="chat">
          <div className="chat-list">
            {threads.length === 0 ? <p style={{ padding: 16, color: "var(--muted)" }}>No messages yet.</p> :
              threads.map((t) => (
                <button key={t.id} className={`chat-conv ${activeId === t.id ? "active" : ""}`} onClick={() => setActiveId(t.id)}>
                  <div className="cc-name">{t.name} {t.status === "CLOSED" && <span className="badge badge-pending">Closed</span>}</div>
                  <div className="cc-snip">{t.lastSnippet}</div>
                </button>
              ))}
          </div>
          <div className="chat-thread">
            {!active ? <div className="empty-state" style={{ margin: "auto" }}><div className="b">🆘</div><p style={{ marginTop: 10 }}>Select a conversation</p></div> : (
              <>
                <div className="chat-head">{active.name} <span style={{ color: "var(--muted)", fontSize: 13 }}>· {active.email}</span></div>
                <div className="chat-msgs">
                  {messages.map((m) => (
                    <div key={m.id} className={`bubble ${m.fromRole === "ADMIN" ? "mine" : ""}`}>
                      <div className="bub-name">{m.senderName}</div>
                      <div className="bub-body">{m.body}</div>
                      <div className="bub-time">{new Date(m.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <form className="chat-compose" onSubmit={reply}>
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply as Homefront Support…" />
                  <button className="btn btn-navy" disabled={!text.trim()}>Send</button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
      <p style={{ marginTop: 10, fontSize: 13 }}><Link href="/" className="muted-link">← Back to storefront</Link></p>
    </div>
  );
}
