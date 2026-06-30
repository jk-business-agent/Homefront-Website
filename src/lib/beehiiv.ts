// beehiiv newsletter integration.
// Configure with BEEHIIV_API_KEY + BEEHIIV_PUBLICATION_ID in .env. When those are
// blank we run in "simulation mode": signups still save locally and the site shows
// our own stories — nothing breaks. The moment the keys are set, signups sync to
// your beehiiv audience and the Newsletter tab pulls your published beehiiv issues.
const API = "https://api.beehiiv.com/v2";

function creds() {
  const key = process.env.BEEHIIV_API_KEY || "";
  const pub = process.env.BEEHIIV_PUBLICATION_ID || "";
  return key && pub ? { key, pub } : null;
}

export function beehiivEnabled(): boolean {
  return creds() !== null;
}

// Add (or reactivate) a subscriber in beehiiv. Best-effort: never throws.
export async function beehiivSubscribe(email: string, source = "website"): Promise<boolean> {
  const c = creds();
  if (!c) return false;
  try {
    const res = await fetch(`${API}/publications/${c.pub}/subscriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, reactivate_existing: true, send_welcome_email: true, utm_source: source }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false; // network/timeout — local save already succeeded
  }
}

export type BeehiivPost = { id: string; title: string; subtitle: string | null; url: string; thumbnail: string | null; publishedAt: number | null };

// Pull recently published beehiiv posts for the Newsletter tab. Returns [] on any failure.
export async function beehiivPosts(limit = 12): Promise<BeehiivPost[]> {
  const c = creds();
  if (!c) return [];
  try {
    const url = `${API}/publications/${c.pub}/posts?status=confirmed&limit=${limit}&order_by=publish_date&direction=desc`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${c.key}` },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 300 }, // cache 5 min so we don't hammer their API
    });
    if (!res.ok) return [];
    const json = await res.json();
    const data = Array.isArray(json?.data) ? json.data : [];
    return data.map((p: any) => ({
      id: String(p.id),
      title: p.title ?? "Untitled",
      subtitle: p.subtitle ?? null,
      url: p.web_url ?? "#",
      thumbnail: p.thumbnail_url ?? null,
      publishedAt: p.publish_date ?? p.created ?? null,
    }));
  } catch {
    return [];
  }
}
