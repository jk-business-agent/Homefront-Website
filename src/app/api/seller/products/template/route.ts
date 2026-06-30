// GET /api/seller/products/template — a CSV template (headers + example rows) for bulk import.
import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/auth";

export const dynamic = "force-dynamic";

const HEADERS = ["name", "description", "price", "category", "emoji", "madeInCity", "madeInState", "stockQty", "weightOz", "shippingPrice", "dimensions", "sizes", "sizeStock", "safetyInfo"];

const EXAMPLES = [
  ["Cast Iron Skillet 10in", "Foundry-cast in the USA, pre-seasoned.", "44.99", "Home", "🍳", "Akron", "Ohio", "75", "80", "0", "10 x 10 x 2 in", "", "", "Hand wash only"],
  ["Heavyweight Pocket Tee", "100% U.S. cotton, sewn in the Carolinas.", "29.00", "Apparel", "👕", "Burlington", "North Carolina", "", "10", "0", "", "S,M,L,XL", "S:10;M:25;L:20;XL:8", ""],
];

function cell(v: string) { return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }

export async function GET() {
  try { await requireSeller(); } catch { return NextResponse.json({ error: "Seller access required" }, { status: 401 }); }
  const csv = [HEADERS, ...EXAMPLES].map((r) => r.map(cell).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="homefront-product-import-template.csv"' },
  });
}
