// Privacy Policy — plain-English explanation of what data we collect and how we protect it.
import Link from "next/link";

export const metadata = { title: "Privacy Policy" };

const updated = "June 16, 2026";

export default function PrivacyPage() {
  return (
    <div className="page">
      <section className="about-hero">
        <h1>Privacy Policy</h1>
        <p>Last updated: {updated}. This explains what information we collect, why, and the choices you have.</p>
      </section>

      <div className="panel legal-doc" style={{ fontFamily: "var(--font-body)", color: "#3a3022", lineHeight: 1.7, fontSize: 15.5 }}>
        <h2>What we collect</h2>
        <ul>
          <li><b>Account info:</b> your name, email, and a securely hashed password.</li>
          <li><b>Buyer info:</b> shipping addresses, order history, items you like, reviews you write, and what you browse (to recommend products).</li>
          <li><b>Seller info:</b> store details, ship-from address, and the business/tax information (such as a W-9) required to pay you and meet IRS rules.</li>
          <li><b>Payments:</b> card details are handled by our payment processor (Stripe). We never see or store full card numbers.</li>
        </ul>

        <h2>How we protect it</h2>
        <ul>
          <li>Passwords are <b>hashed</b> (one-way) — we can never read your actual password.</li>
          <li>Sensitive identifiers like tax IDs are <b>encrypted (AES-256)</b> before being stored.</li>
          <li>Access is restricted by role; admins only see the last 4 digits of any tax ID.</li>
          <li>We use security headers, login rate-limiting, and CSRF protections to guard your account.</li>
        </ul>

        <h2>How we use your data</h2>
        <p>To run your account, process and ship orders, prevent fraud and abuse, recommend products, and — only if you opt in — send our newsletter. We do <b>not</b> sell your personal information.</p>

        <h2>Sharing</h2>
        <p>We share only what's needed to deliver your order: sellers receive the shipping details for items you buy from them, and shipping carriers receive your delivery address. Payment processing goes through Stripe.</p>

        <h2>Your choices</h2>
        <ul>
          <li><b>Download your data:</b> from <Link href="/account/profile">your account</Link> you can export a copy of everything we hold about you.</li>
          <li><b>Delete your account:</b> you can permanently delete your account and personal data (some sales/tax records may be retained where the law requires).</li>
          <li><b>Unsubscribe:</b> every newsletter has a one-click unsubscribe.</li>
        </ul>

        <h2>Contact</h2>
        <p>Questions about your privacy? Reach us through the <b>Chat with us</b> button or our <Link href="/about">contact options</Link>.</p>

        <p style={{ marginTop: 24, fontSize: 13.5, color: "#6b5d49" }}>
          Homefront Markets is currently in active development. This policy will be finalized with our legal team before public launch.
        </p>
      </div>
    </div>
  );
}
