import Link from "next/link";
import Flag from "./Flag";
import NewsletterSignup from "./NewsletterSignup";

export default function Footer({ tagline }: { tagline?: string }) {
  return (
    <footer className="site">
      <div className="foot-inner">
        <div>
          <Link href="/" className="logo" style={{ marginBottom: 12 }}>
            <span className="wordmark">
              <span className="hf">HOMEFRONT</span>
              <span className="mk">★ <b>MARKETS</b> ★</span>
            </span>
          </Link>
          <p style={{ fontSize: 14, maxWidth: 300, marginTop: 12 }}>
            {tagline || "The marketplace for American-made goods. Built to keep U.S. makers thriving and dollars on the home front."}
          </p>
          <div style={{ maxWidth: 320, marginTop: 16 }}>
            <h5 style={{ marginBottom: 8 }}>📰 Join the newsletter</h5>
            <NewsletterSignup source="footer" buttonLabel="Subscribe" dark />
          </div>
        </div>
        <div>
          <h5>Shop</h5>
          <ul>
            <li><Link href="/">All products</Link></li>
            <li><Link href="/?category=Kitchen">Kitchen</Link></li>
            <li><Link href="/?category=Apparel">Apparel</Link></li>
            <li><Link href="/?category=Tools">Tools</Link></li>
          </ul>
        </div>
        <div>
          <h5>Sell</h5>
          <ul>
            <li><Link href="/sell">Become a seller</Link></li>
            <li><Link href="/seller">Seller dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h5>Account</h5>
          <ul>
            <li><Link href="/login">Sign in</Link></li>
            <li><Link href="/account">Your orders</Link></li>
            <li><Link href="/gift-cards">Gift cards</Link></li>
          </ul>
        </div>
        <div>
          <h5>Company</h5>
          <ul>
            <li><Link href="/about">About us</Link></li>
            <li><Link href="/privacy">Privacy Policy</Link></li>
            <li><Link href="/terms">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="foot-bottom">
        © 2026 Home Front Markets. Made in the USA. <Flag size={13} />
        <span style={{ margin: "0 8px", opacity: 0.5 }}>·</span>
        <Link href="/privacy">Privacy</Link>
        <span style={{ margin: "0 6px", opacity: 0.5 }}>·</span>
        <Link href="/terms">Terms</Link>
      </div>
    </footer>
  );
}
