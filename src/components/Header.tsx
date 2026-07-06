"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { CATEGORIES_WITH_ALL } from "@/lib/categories";
import Flag from "./Flag";

export default function Header({ announcement, announcementLink }: { announcement?: string; announcementLink?: string | null }) {
  const router = useRouter();
  const { count, openCart } = useCart();
  const { user, logout } = useAuth();
  const [q, setQ] = useState("");
  const [logoOk, setLogoOk] = useState(true);
  const [cats, setCats] = useState<string[]>(CATEGORIES_WITH_ALL);
  const [navPages, setNavPages] = useState<{ key: string; label: string }[]>([]);
  const [suggests, setSuggests] = useState<{ type: string; label: string; slug?: string; emoji?: string }[]>([]);
  const [showS, setShowS] = useState(false);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => {
      if (d.categories?.length) setCats(["All", ...d.categories.map((c: any) => c.name)]);
    }).catch(() => {});
    fetch("/api/pages/nav").then((r) => r.json()).then((d) => {
      if (d.pages?.length) setNavPages(d.pages);
    }).catch(() => {});
  }, []);

  // Debounced search suggestions.
  useEffect(() => {
    if (q.trim().length < 2) { setSuggests([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}`).then((r) => r.json()).then((d) => setSuggests(d.suggestions || [])).catch(() => {});
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  function pick(s: { type: string; label: string; slug?: string }) {
    setShowS(false); setQ("");
    if (s.type === "product" && s.slug) router.push(`/products/${s.slug}`);
    else router.push(`/?search=${encodeURIComponent(s.label)}`);
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/?search=${encodeURIComponent(q.trim())}` : "/");
  }

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      {announcement && (
        <div className="topbar">
          <Flag size={13} />{" "}
          {announcementLink ? (
            <Link href={announcementLink} style={{ color: "inherit", textDecoration: "underline" }}>{announcement}</Link>
          ) : (
            announcement
          )}
        </div>
      )}
      <header className="site">
        <div className="header-inner">
          <Link href="/" className="logo">
            {logoOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/Main_Logo_With_Background.png" alt="Homefront Markets" onError={() => setLogoOk(false)} />
            ) : (
              <span className="wordmark">
                <span className="hf">HOMEFRONT</span>
                <span className="mk">★ <b>MARKETS</b> ★</span>
              </span>
            )}
          </Link>
          <div className="search-wrap">
            <form className="search" onSubmit={search}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setShowS(true)}
                onBlur={() => setTimeout(() => setShowS(false), 150)}
                placeholder="Search American-made products, brands, or sellers…"
                aria-label="Search products"
              />
              <button type="submit">Search</button>
            </form>
            {showS && suggests.length > 0 && (
              <div className="search-suggest">
                {suggests.map((s, i) => (
                  <button key={i} className="ss-item" onMouseDown={(e) => { e.preventDefault(); pick(s); }}>
                    <span className="ss-emoji">{s.type === "product" ? (s.emoji || "🔍") : "🏭"}</span>
                    <span>{s.label}</span>
                    {s.type === "store" && <span className="ss-tag">Maker</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="header-actions">
            {user ? (
              <>
                <Link href={user.role === "ADMIN" ? "/admin" : user.role === "SELLER" ? "/seller" : "/account"} className="haction">
                  <span>Hello, {user.name.split(" ")[0]}</span>
                  <b>{user.role === "ADMIN" ? "Admin Center" : user.role === "SELLER" ? "Seller Dashboard" : "Account & Orders"}</b>
                </Link>
                <button className="haction" onClick={handleLogout}>
                  <span>Not you?</span><b>Sign out</b>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="haction">
                  <span>Hello, sign in</span><b>Account &amp; Orders</b>
                </Link>
                <Link href="/sell" className="haction">
                  <span>Own a U.S. business?</span><b>Sell on HFM</b>
                </Link>
              </>
            )}
            <button className="cart-btn" onClick={openCart} aria-label="Open cart">
              <span className="icon">🛒</span>
              <span className="cart-count">{count}</span>
            </button>
          </div>
        </div>
        <nav className="navrow">
          <div className="navrow-inner">
            {cats.map((c) => (
              <Link key={c} href={c === "All" ? "/" : `/?category=${encodeURIComponent(c)}`}>
                {c === "All" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Flag size={13} /> All Departments</span> : c}
              </Link>
            ))}
            <Link href="/vendors">Vendors</Link>
            <Link href="/about">About</Link>
            {navPages.map((p) => (
              <Link key={p.key} href={`/p/${p.key}`}>{p.label}</Link>
            ))}
            <Link href="/newsletter" style={{ color: "var(--amber-soft)" }}>📰 Newsletter</Link>
          </div>
        </nav>
      </header>
    </>
  );
}
