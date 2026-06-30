"use client";
import { useEffect, useRef, useState, useCallback } from "react";

type Convo = { id: string; subject: string | null; storeName: string; buyerName: string; lastMessageAt: string; lastSnippet: string };
type Msg = { id: string; body: string; senderRole: string; senderName: string; createdAt: string };

// Shared chat center. `as` controls whose inbox is shown: buyer / seller / admin.
export default function MessagesPanel({ as }: { as: "buyer" | "seller" | "admin" }) {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<{ messages: Msg[]; myRole: string; subject: string | null; storeName: string; buyerName: string } | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConvos = useCallback(async () => {
    const r = await fetch(`/api/messages?as=${as}`, { cache: "no-store" });
    const d = await r.json();
    setConvos(d.conversations || []);
    setLoading(false);
    setActiveId((cur) => cur || d.conversations?.[0]?.id || null);
  }, [as]);

  const loadThread = useCallback(async (id: string) => {
    const r = await fetch(`/api/messages/${id}`, { cache: "no-store" });
    const d = await r.json();
    if (d.conversation) setThread({ messages: d.messages, myRole: d.myRole, subject: d.conversation.subject, storeName: d.conversation.storeName, buyerName: d.conversation.buyerName });
  }, []);

  useEffect(() => { loadConvos(); }, [loadConvos]);

  // Load + poll the active thread every 4s.
  useEffect(() => {
    if (!activeId) return;
    loadThread(activeId);
    const t = setInterval(() => loadThread(activeId), 4000);
    return () => clearInterval(t);
  }, [activeId, loadThread]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread?.messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !activeId) return;
    setSending(true);
    const body = text;
    setText("");
    await fetch(`/api/messages/${activeId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
    await loadThread(activeId);
    await loadConvos();
    setSending(false);
  }

  function whoLabel(c: Convo) {
    return as === "buyer" ? c.storeName : as === "seller" ? c.buyerName : `${c.buyerName} ↔ ${c.storeName}`;
  }

  return (
    <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
      <div className="chat">
        <div className="chat-list">
          {loading ? (
            <p style={{ padding: 16, color: "var(--muted)" }}>Loading…</p>
          ) : convos.length === 0 ? (
            <p style={{ padding: 16, color: "var(--muted)", fontFamily: "var(--font-body)" }}>No conversations yet.</p>
          ) : (
            convos.map((c) => (
              <button key={c.id} className={`chat-conv ${activeId === c.id ? "active" : ""}`} onClick={() => setActiveId(c.id)}>
                <div className="cc-name">{whoLabel(c)}</div>
                <div className="cc-snip">{c.lastSnippet}</div>
              </button>
            ))
          )}
        </div>

        <div className="chat-thread">
          {!thread ? (
            <div className="empty-state" style={{ margin: "auto" }}><div className="b">💬</div><p style={{ marginTop: 10 }}>Select a conversation</p></div>
          ) : (
            <>
              <div className="chat-head">
                <strong>{as === "buyer" ? thread.storeName : as === "seller" ? thread.buyerName : `${thread.buyerName} ↔ ${thread.storeName}`}</strong>
                {thread.subject && <span style={{ color: "var(--muted)", fontSize: 13 }}> · {thread.subject}</span>}
              </div>
              <div className="chat-msgs">
                {thread.messages.map((m) => (
                  <div key={m.id} className={`bubble ${m.senderRole === thread.myRole ? "mine" : ""} role-${m.senderRole.toLowerCase()}`}>
                    <div className="bub-name">{m.senderName}{m.senderRole === "ADMIN" ? " · Support" : ""}</div>
                    <div className="bub-body">{m.body}</div>
                    <div className="bub-time">{new Date(m.createdAt).toLocaleString()}</div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form className="chat-compose" onSubmit={send}>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" />
                <button className="btn btn-navy" disabled={sending || !text.trim()}>Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
