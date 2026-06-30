"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Item = { href: string; label: string };
type Group = { label: string; href?: string; items?: Item[] };

// Grouped admin navigation — a handful of dropdown menus instead of a long flat row.
const GROUPS: Group[] = [
  { label: "📊 Dashboard", href: "/admin" },
  { label: "🛍️ Catalog", items: [
    { href: "/admin/products", label: "🏷️ Products" },
    { href: "/admin/reviews", label: "⭐ Reviews" },
    { href: "/admin/returns", label: "📦 Returns" },
    { href: "/admin/categories", label: "🗂️ Categories" },
    { href: "/admin/coupons", label: "🎟️ Coupons" },
  ] },
  { label: "🏪 Sellers & Users", items: [
    { href: "/admin/sellers", label: "🏪 Sellers" },
    { href: "/admin/users", label: "👥 Users" },
  ] },
  { label: "🎨 Content", items: [
    { href: "/admin/design", label: "🎨 Design Pages" },
    { href: "/admin/settings", label: "⚙️ Customize" },
    { href: "/admin/newsletter", label: "📰 Newsletter" },
  ] },
  { label: "💬 Messages", items: [
    { href: "/admin/support", label: "🆘 Help Desk" },
    { href: "/admin/messages", label: "💬 Seller Chats" },
  ] },
  { label: "📑 Insights", items: [
    { href: "/admin/reports", label: "📑 Reports" },
    { href: "/admin/audit", label: "📜 Audit Log" },
  ] },
];

export default function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close any open dropdown when the route changes or on an outside click.
  useEffect(() => { setOpen(null); }, [pathname]);
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const isActive = (g: Group) =>
    g.href ? pathname === g.href : !!g.items?.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"));

  return (
    <div className="menubar" ref={ref}>
      {GROUPS.map((g) => {
        if (g.href) {
          return (
            <Link key={g.label} href={g.href} className={`menubar-top ${isActive(g) ? "active" : ""}`}>{g.label}</Link>
          );
        }
        const isOpen = open === g.label;
        return (
          <div key={g.label} className="menubar-group">
            <button
              className={`menubar-top ${isActive(g) ? "active" : ""} ${isOpen ? "open" : ""}`}
              onClick={() => setOpen(isOpen ? null : g.label)}
              aria-expanded={isOpen}
            >
              {g.label} <span className="caret">▾</span>
            </button>
            {isOpen && (
              <div className="menubar-drop">
                {g.items!.map((i) => (
                  <Link key={i.href} href={i.href} className={pathname === i.href ? "active" : ""}>{i.label}</Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
