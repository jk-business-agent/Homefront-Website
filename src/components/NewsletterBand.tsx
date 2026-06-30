"use client";
// A medium "Join the newsletter" band shown above the footer on every page.
import Link from "next/link";
import NewsletterSignup from "./NewsletterSignup";

export default function NewsletterBand() {
  return (
    <section className="news-band">
      <div className="news-band-inner">
        <div className="news-band-text">
          <span className="nb-kicker">📰 The Homefront Dispatch</span>
          <h3>Join the newsletter</h3>
          <p>Maker spotlights and new American-made drops — straight to your inbox. <Link href="/newsletter" className="muted-link">Read the latest →</Link></p>
        </div>
        <div className="news-band-form">
          <NewsletterSignup source="footer" buttonLabel="Subscribe" dark />
        </div>
      </div>
    </section>
  );
}
