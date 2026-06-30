"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const NAV_GROUPS: { label: string; items: { href: string; label: string; icon: string }[] }[] = [
  { label: "Shopping", items: [
    { href: "/account", label: "Your Orders", icon: "📦" },
    { href: "/account/messages", label: "Messages", icon: "💬" },
    { href: "/account/favorites", label: "Liked Items", icon: "❤️" },
  ] },
  { label: "Settings", items: [
    { href: "/account/profile", label: "Account Info", icon: "👤" },
    { href: "/account/addresses", label: "Addresses", icon: "🏠" },
    { href: "/account/password", label: "Change Password", icon: "🔒" },
    { href: "/account/security", label: "Two-Factor Auth", icon: "🔐" },
    { href: "/account/credit", label: "Gift Cards & Credit", icon: "🎁" },
    { href: "/account/payment", label: "Payment Methods", icon: "💳" },
  ] },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.push(`/login?next=${pathname}`);
  }, [loading, user, router, pathname]);

  async function signOut() {
    await logout();
    router.push("/");
    router.refresh();
  }

  if (loading || !user) {
    return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;
  }

  return (
    <div className="page">
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>Your Account</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>Signed in as {user.name} ({user.email})</p>

      <div className="acct-layout" style={{ marginTop: 18 }}>
        <nav className="acct-nav">
          {NAV_GROUPS.map((g) => (
            <div key={g.label} className="acct-nav-group">
              <div className="acct-nav-label">{g.label}</div>
              {g.items.map((n) => (
                <Link key={n.href} href={n.href} className={pathname === n.href ? "active" : ""}>
                  <span>{n.icon}</span> {n.label}
                </Link>
              ))}
            </div>
          ))}
          {user.role === "SELLER" && (
            <Link href="/seller"><span>🏪</span> Seller Dashboard</Link>
          )}
          <a className="acct-signout" onClick={signOut}><span>🚪</span> Sign out</a>
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
