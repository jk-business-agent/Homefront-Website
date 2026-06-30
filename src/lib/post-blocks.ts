// Newsletter article content blocks — a simple block model for mixing
// text, headings, and images down the page.
export type Block =
  | { type: "text"; value: string }
  | { type: "heading"; value: string }
  | { type: "image"; url: string; caption?: string }
  | { type: "quote"; value: string; attribution?: string }
  | { type: "button"; label: string; href: string }
  | { type: "product"; productId: string };

export function parseBlocks(json?: string | null): Block[] {
  if (!json) return [];
  try {
    const b = JSON.parse(json);
    return Array.isArray(b) ? (b as Block[]) : [];
  } catch {
    return [];
  }
}

// Plain-text fallback (for excerpts / search) derived from text + heading blocks.
export function bodyFromBlocks(json?: string | null, fallback = ""): string {
  const blocks = parseBlocks(json);
  if (blocks.length === 0) return fallback;
  return blocks
    .map((b) => (b.type === "text" || b.type === "heading" || b.type === "quote" ? b.value || "" : ""))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

// Turn an old plain-text body into starter blocks (one text block per paragraph).
export function blocksFromBody(body: string): Block[] {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ type: "text" as const, value: p }));
}
