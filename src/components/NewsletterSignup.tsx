"use client";
import { useState } from "react";

// Reusable email sign-up form. Used in the welcome popup, the newsletter page,
// and the footer. `source` records where the person subscribed.
export default function NewsletterSignup({
  source = "page",
  buttonLabel = "Join the list",
  dark = false,
  onSuccess,
}: {
  source?: "popup" | "page" | "footer";
  buttonLabel?: string;
  dark?: boolean;
  onSuccess?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Something went wrong");
        return;
      }
      setStatus("done");
      if (data.code) {
        setMessage(`🎉 You're in! Use code ${data.code} for ${data.label || "a discount"}.`);
      } else {
        setMessage(data.alreadySubscribed ? "You're already on the list — thank you!" : "You're in! Watch your inbox.");
      }
      setEmail("");
      onSuccess?.();
    } catch {
      setStatus("error");
      setMessage("Network error — please try again.");
    }
  }

  if (status === "done") {
    return (
      <div className={`news-done ${dark ? "dark" : ""}`}>
        ✅ {message}
      </div>
    );
  }

  return (
    <form className="news-form" onSubmit={submit}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        aria-label="Email address"
        className={dark ? "dark" : ""}
      />
      <button type="submit" className="btn btn-gold" disabled={status === "loading"}>
        {status === "loading" ? "Joining…" : buttonLabel}
      </button>
      {status === "error" && <span className="news-error">{message}</span>}
    </form>
  );
}
