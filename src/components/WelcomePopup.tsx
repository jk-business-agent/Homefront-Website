"use client";
// The welcome popup that greets visitors on arrival. Captures an email for the
// newsletter and teases the latest story. Dismissal is remembered so returning
// visitors aren't nagged.
import { useEffect, useState } from "react";
import Link from "next/link";
import NewsletterSignup from "./NewsletterSignup";

const DISMISS_KEY = "hfm_news_seen";

type TeaserPost = { title: string; slug: string; excerpt: string; coverEmoji: string };

export default function WelcomePopup() {
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState<TeaserPost | null>(null);

  useEffect(() => {
    // Only show if they haven't seen/dismissed it before.
    let seen = false;
    try { seen = localStorage.getItem(DISMISS_KEY) === "1"; } catch {}
    if (seen) return;

    // Small delay so the page paints first, then greet them.
    const t = setTimeout(() => setOpen(true), 900);

    // Grab the latest story to feature.
    fetch("/api/posts?limit=1")
      .then((r) => r.json())
      .then((d) => { if (d.posts?.[0]) setTeaser(d.posts[0]); })
      .catch(() => {});

    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setOpen(false);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
  }

  if (!open) return null;

  return (
    <div className="news-pop-overlay" onClick={dismiss}>
      <div className="news-pop" onClick={(e) => e.stopPropagation()}>
        <button className="news-pop-x" onClick={dismiss} aria-label="Close">×</button>

        <div className="news-pop-banner">
          <div className="news-pop-emblem">🎁</div>
          <span className="news-pop-kicker">Welcome offer</span>
        </div>

        <div className="news-pop-body">
          <h2>Get 10% off your first order</h2>
          <p className="news-pop-sub">
            Join the newsletter for maker stories &amp; new American-made drops — and we'll send a code for
            <strong> 10% off your first order</strong>. Free, unsubscribe anytime.
          </p>

          {teaser && (
            <Link href={`/newsletter/${teaser.slug}`} className="news-pop-teaser" onClick={dismiss}>
              <span className="tz-emoji">{teaser.coverEmoji}</span>
              <span>
                <span className="tz-label">Latest story</span>
                <span className="tz-title">{teaser.title}</span>
              </span>
            </Link>
          )}

          <NewsletterSignup source="popup" buttonLabel="Get my 10% off" onSuccess={() => { try { localStorage.setItem(DISMISS_KEY, "1"); } catch {} }} />

          <button className="news-pop-skip" onClick={dismiss}>No thanks, take me to the shop →</button>
        </div>
      </div>
    </div>
  );
}
