// Transactional email via Resend. Configure RESEND_API_KEY + EMAIL_FROM in .env.
// Without keys it runs in "simulation mode" (logs instead of sending) so nothing breaks.
const API = "https://api.resend.com/emails";

function creds() {
  const key = process.env.RESEND_API_KEY || "";
  const from = process.env.EMAIL_FROM || "";
  return key && from ? { key, from } : null;
}

export function emailEnabled(): boolean {
  return creds() !== null;
}

// Send an email. Best-effort: never throws. Returns true if actually sent.
export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  const c = creds();
  if (!c) {
    console.log(`[email:sim] → ${opts.to} :: ${opts.subject}`);
    return false;
  }
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: c.from, to: opts.to, subject: opts.subject, html: opts.html }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Branded HTML wrapper for all emails.
export function brandEmail(heading: string, innerHtml: string, cta?: { label: string; url: string }): string {
  const button = cta
    ? `<a href="${cta.url}" style="display:inline-block;background:#d99a3f;color:#16243a;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:8px;margin-top:8px">${cta.label}</a>`
    : "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#f3e9d8;border-radius:14px;overflow:hidden;border:1px solid #e2d6bf">
    <div style="background:#16243a;color:#f3e9d8;padding:20px 24px;font-size:20px;font-weight:700;letter-spacing:1px">HOMEFRONT <span style="color:#d99a3f">MARKETS</span></div>
    <div style="padding:24px 26px;color:#2a2218;font-size:15px;line-height:1.6">
      <h1 style="font-size:21px;color:#16243a;margin:0 0 12px">${heading}</h1>
      ${innerHtml}
      ${button ? `<div style="margin-top:18px">${button}</div>` : ""}
    </div>
    <div style="padding:16px 26px;color:#6b5d49;font-size:12px;border-top:1px solid #e2d6bf">🇺🇸 Homefront Markets — keeping America working. You're receiving this because you have an account or order with us.</div>
  </div>`;
}
