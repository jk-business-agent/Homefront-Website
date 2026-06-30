// Terms of Service — the basic rules for using Homefront Markets.
import Link from "next/link";

export const metadata = { title: "Terms of Service" };

const updated = "June 16, 2026";

export default function TermsPage() {
  return (
    <div className="page">
      <section className="about-hero">
        <h1>Terms of Service</h1>
        <p>Last updated: {updated}. By using Homefront Markets you agree to these terms.</p>
      </section>

      <div className="panel legal-doc" style={{ fontFamily: "var(--font-body)", color: "#3a3022", lineHeight: 1.7, fontSize: 15.5 }}>
        <h2>Using the marketplace</h2>
        <p>You must provide accurate account information and keep your password secure. You're responsible for activity under your account. You must be old enough to form a binding contract in your state.</p>

        <h2>Made-in-USA commitment</h2>
        <p>Sellers certify that the products they list are American-made. Misrepresenting a product's origin is grounds for removal from the marketplace.</p>

        <h2>Buying</h2>
        <p>Prices and availability can change. An order is confirmed once payment is processed. Shipping times and returns are handled per each seller's policy and applicable law.</p>

        <h2>Selling</h2>
        <ul>
          <li>You must provide valid business and tax information (e.g., a W-9) to receive payouts.</li>
          <li>You're responsible for fulfilling orders, accurate listings, and your own legal/tax obligations.</li>
          <li>New sellers are reviewed before their products go live.</li>
        </ul>

        <h2>Acceptable use</h2>
        <p>Don't misuse the platform: no fraud, no abuse or harassment, no attempts to break security, scrape at scale, or upload unlawful content.</p>

        <h2>Content you submit</h2>
        <p>Reviews, photos, and store content remain yours, but you grant us a license to display them on the marketplace. We may remove content that violates these terms.</p>

        <h2>Account closure</h2>
        <p>You can close your account anytime (see our <Link href="/privacy">Privacy Policy</Link>). We may suspend accounts that violate these terms. Some records are retained where the law requires.</p>

        <h2>Disclaimer</h2>
        <p>The service is provided "as is." To the extent permitted by law, Homefront Markets isn't liable for indirect or incidental damages arising from use of the marketplace.</p>

        <p style={{ marginTop: 24, fontSize: 13.5, color: "#6b5d49" }}>
          Homefront Markets is currently in active development. These terms will be finalized with our legal team before public launch.
        </p>
      </div>
    </div>
  );
}
