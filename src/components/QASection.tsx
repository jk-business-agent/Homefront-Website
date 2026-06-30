"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

type Q = { id: string; body: string; authorName: string; answer: string | null; answeredBy: string | null; answeredAt: string | null; createdAt: string };

export default function QASection({ productId, storeOwnerId }: { productId: string; storeOwnerId: string }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Q[]>([]);
  const [ask, setAsk] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const canAnswer = !!user && (user.id === storeOwnerId || user.role === "ADMIN");

  const load = useCallback(() => {
    fetch(`/api/products/${productId}/questions`, { cache: "no-store" }).then((r) => r.json()).then((d) => setQuestions(d.questions || []));
  }, [productId]);
  useEffect(() => { load(); }, [load]);

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault(); setMsg(""); setBusy(true);
    const res = await fetch(`/api/products/${productId}/questions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: ask }) });
    const data = await res.json(); setBusy(false);
    if (!res.ok) { setMsg(data.error || "Could not post"); return; }
    setAsk(""); setMsg("✅ Question posted — the maker will reply soon."); load();
  }

  return (
    <section className="qa-section" style={{ marginTop: 34 }}>
      <div className="section-head"><h2>Questions &amp; Answers</h2></div>

      {user ? (
        <form onSubmit={submitQuestion} style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask the maker a question about this product…" required
            style={{ flex: 1, minWidth: 240, border: "1.5px solid var(--line)", borderRadius: 8, padding: "11px 14px", fontFamily: "var(--font-body)" }} />
          <button className="btn btn-navy" disabled={busy}>{busy ? "Posting…" : "Ask question"}</button>
        </form>
      ) : (
        <p style={{ color: "var(--muted)", fontFamily: "var(--font-body)" }}>
          <Link href="/login" className="muted-link">Sign in</Link> to ask the maker a question.
        </p>
      )}
      {msg && <div className={msg.startsWith("✅") ? "alert alert-ok" : "alert alert-error"}>{msg}</div>}

      {questions.length === 0 ? (
        <p style={{ color: "var(--muted)", fontFamily: "var(--font-body)" }}>No questions yet. Be the first to ask!</p>
      ) : (
        questions.map((q) => <QARow key={q.id} q={q} canAnswer={canAnswer} onAnswered={load} />)
      )}
    </section>
  );
}

function QARow({ q, canAnswer, onAnswered }: { q: Q; canAnswer: boolean; onAnswered: () => void }) {
  const [answer, setAnswer] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const res = await fetch(`/api/questions/${q.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer }) });
    setBusy(false);
    if (res.ok) { setOpen(false); setAnswer(""); onAnswered(); }
  }

  return (
    <div className="qa-row" style={{ borderTop: "1px solid var(--line)", padding: "14px 0" }}>
      <div style={{ fontFamily: "var(--font-body)" }}>
        <span style={{ fontWeight: 700, color: "var(--navy)" }}>Q:</span> {q.body}
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{q.authorName} · {new Date(q.createdAt).toLocaleDateString()}</div>
      </div>

      {q.answer ? (
        <div style={{ marginTop: 8, background: "var(--cream)", borderRadius: 8, padding: "10px 12px", fontFamily: "var(--font-body)" }}>
          <span style={{ fontWeight: 700, color: "var(--barn)" }}>A:</span> {q.answer}
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>— {q.answeredBy}{q.answeredAt ? ` · ${new Date(q.answeredAt).toLocaleDateString()}` : ""}</div>
        </div>
      ) : canAnswer ? (
        open ? (
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write your answer…" autoFocus
              style={{ flex: 1, minWidth: 240, border: "1.5px solid var(--line)", borderRadius: 8, padding: "9px 12px", fontFamily: "var(--font-body)" }} />
            <button className="btn btn-navy" style={{ padding: "8px 14px" }} disabled={busy || !answer.trim()} onClick={submit}>{busy ? "Saving…" : "Post answer"}</button>
            <button className="btn btn-outline" style={{ padding: "8px 14px" }} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        ) : (
          <button className="btn btn-outline" style={{ marginTop: 8, padding: "6px 12px" }} onClick={() => setOpen(true)}>✍️ Answer this</button>
        )
      ) : (
        <div style={{ marginTop: 6, fontSize: 13, color: "var(--muted)", fontFamily: "var(--font-body)" }}>Awaiting the maker's answer.</div>
      )}
    </div>
  );
}
