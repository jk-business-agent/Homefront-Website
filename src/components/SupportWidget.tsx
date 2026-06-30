"use client";
// Floating "Chat with us" widget for any visitor. Messages land in the admin Help Desk.
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

type Msg = { id: string; body: string; fromRole: string; senderName: string; createdAt: string };
const KEY = "hfm_support_thread";

export default function SupportWidget() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { try { setThreadId(localStorage.getItem(KEY)); } catch {} }, []);
  useEffect(() => { if (user) { setName((n) => n || user.name); setEmail((e) => e || user.email); } }, [user]);

  // Poll the thread while the panel is open.
  useEffect(() => {
    if (!open || !threadId) return;
    const fetchIt = () => fetch(`/api/support?threadId=${threadId}`, { cache: "no-store" }).then((r) => r.json()).then((d) => { if (d.messages) setMessages(d.messages); }).catch(() => {});
    fetchIt();
    const t = setInterval(fetchIt, 5000);
    return () => clearInterval(t);
  }, [open, threadId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  // Don't show inside admin/seller dashboards.
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/seller")) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(""); setSending(true);
    const res = await fetch("/api/support", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: threadId || undefined, name, email, body: text }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { setError(data.error || "Could not send"); return; }
    setThreadId(data.threadId);
    try { localStorage.setItem(KEY, data.threadId); } catch {}
    setMessages(data.messages || []);
    setText("");
  }

  const needsInfo = !threadId && (!name || !email);

  return (
    <>
      <button className="support-fab" onClick={() => setOpen((o) => !o)} aria-label="Chat with us">
        {open ? "✕" : "💬 Questions?"}
      </button>
      {open && (
        <div className="support-panel">
          <div className="support-head">
            <strong>Chat with Homefront</strong>
            <span>We usually reply within a day</span>
          </div>
          <div className="support-body">
            {messages.length === 0 && <p className="support-hello">👋 Hi! Ask us anything — about an order, a product, or becoming a seller.</p>}
            {messages.map((m) => (
              <div key={m.id} className={`sbubble ${m.fromRole === "USER" ? "mine" : "them"}`}>
                <div className="sb-name">{m.fromRole === "ADMIN" ? "Homefront Support" : "You"}</div>
                <div>{m.body}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form className="support-compose" onSubmit={send}>
            {error && <div className="support-err">{error}</div>}
            {needsInfo && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
                <input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <input placeholder="Type your message…" value={text} onChange={(e) => setText(e.target.value)} required />
              <button className="btn btn-navy" disabled={sending}>Send</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
