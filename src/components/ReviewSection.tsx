"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { stars } from "@/lib/format";

type Media = string;
type Review = {
  id: string; rating: number; title: string | null; body: string;
  authorName: string; createdAt: string; media: Media[]; verified?: boolean;
};

export default function ReviewSection({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<{ url: string; kind: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function load() {
    fetch(`/api/products/${productId}/reviews`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews || []))
      .finally(() => setLoading(false));
  }
  useEffect(load, [productId]);

  const avg = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;
  // Star distribution (5★ → 1★) for the rating-breakdown bars.
  const dist = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    return { star, count, pct: reviews.length ? Math.round((count / reviews.length) * 100) : 0 };
  });

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError("");
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setMedia((m) => [...m, { url: data.url, kind: data.kind }]);
      else setError(data.error || "Upload failed");
    }
    setUploading(false);
    e.target.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title || undefined, body, media: media.map((m) => m.url) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not post review"); return; }
      setTitle(""); setBody(""); setMedia([]); setRating(5);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="reviews">
      <h2>Customer Reviews</h2>
      {!loading && reviews.length > 0 && (
        <div className="review-summary">
          <div>
            <span className="big">{avg.toFixed(1)}</span>
            <div className="stars" style={{ fontSize: 18 }}>{stars(avg)}</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</div>
          </div>
          <div className="rating-bars">
            {dist.map((d) => (
              <div className="rb-row" key={d.star}>
                <span className="rb-label">{d.star}★</span>
                <span className="rb-track"><span className="rb-fill" style={{ width: `${d.pct}%` }} /></span>
                <span className="rb-pct">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Write a review */}
      {user ? (
        <form className="review-form" onSubmit={submit}>
          <h3>Leave a review</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="star-pick" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={n <= (hover || rating) ? "on" : ""}
                onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}>★</span>
            ))}
          </div>
          <div className="field"><input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="field"><textarea rows={3} placeholder="Share what you think…" value={body} onChange={(e) => setBody(e.target.value)} required /></div>

          {media.length > 0 && (
            <div className="media-row">
              {media.map((m, i) => m.kind === "video"
                ? <video key={i} className="m" src={m.url} muted />
                : <img key={i} className="m" src={m.url} alt="" />)}
            </div>
          )}
          <label className="upload-btn">
            {uploading ? "Uploading…" : "📷 Add photo / video"}
            <input type="file" accept="image/*,video/*" multiple hidden onChange={onFiles} />
          </label>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-navy" disabled={submitting || uploading}>{submitting ? "Posting…" : "Post review"}</button>
          </div>
        </form>
      ) : (
        <div className="alert alert-ok" style={{ background: "var(--cream)", borderColor: "var(--line)", color: "var(--ink)" }}>
          <Link href="/login" className="muted-link">Sign in</Link> to leave a review with photos or video.
        </div>
      )}

      {/* List */}
      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No reviews yet — be the first!</p>
      ) : (
        reviews.map((r) => (
          <div className="review" key={r.id}>
            <div className="r-head">
              <span className="r-author">{r.authorName}{r.verified && <span className="r-verified">✓ Verified Purchase</span>}</span>
              <span className="r-date">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="stars">{stars(r.rating)}</div>
            {r.title && <div className="r-title">{r.title}</div>}
            <div className="r-body">{r.body}</div>
            {r.media.length > 0 && (
              <div className="r-media">
                {r.media.map((m, i) => /\.(mp4|mov|webm)$/i.test(m)
                  ? <video key={i} src={m} controls />
                  : <img key={i} src={m} alt="" />)}
              </div>
            )}
          </div>
        ))
      )}
    </section>
  );
}
