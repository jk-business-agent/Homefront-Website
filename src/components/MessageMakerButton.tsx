"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function MessageMakerButton({ storeId, storeName, productName }: { storeId: string; storeName: string; productName?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(productName ? `Hi! I have a question about "${productName}".` : `Hi! I have a question about ${storeName}.`);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  function start() {
    if (!user) { router.push("/login?next=/"); return; }
    setOpen((o) => !o);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, subject: `Question about ${productName}`, body: text }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not send"); return; }
      setSent(true);
    } finally { setSending(false); }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button className="btn btn-outline btn-block" onClick={start} type="button">💬 Message the maker</button>
      {open && !sent && (
        <form onSubmit={send} style={{ marginTop: 10 }}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="field"><textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} required /></div>
          <button className="btn btn-navy" disabled={sending}>{sending ? "Sending…" : `Send to ${storeName}`}</button>
        </form>
      )}
      {sent && (
        <div className="alert alert-ok" style={{ marginTop: 10 }}>
          ✅ Sent! <Link href="/account/messages" className="muted-link">View in your messages →</Link>
        </div>
      )}
    </div>
  );
}
