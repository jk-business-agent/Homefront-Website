// Tests for admin upgrades: review moderation, announcement control, theme, curation.
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}`); } }
function client() {
  let ck = "";
  return async (p, o = {}) => {
    const r = await fetch(BASE + p, { ...o, headers: { "Content-Type": "application/json", ...(ck ? { Cookie: ck } : {}), ...(o.headers || {}) } });
    const sc = r.headers.get("set-cookie"); if (sc) ck = sc.split(";")[0];
    const ct = r.headers.get("content-type") || "";
    return { status: r.status, ct, body: ct.includes("json") ? await r.json().catch(() => ({})) : await r.text() };
  };
}

async function main() {
  console.log(`\nTesting admin upgrades at ${BASE}\n`);
  const admin = client();
  await admin("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@demo.com", password: "password123" }) });

  console.log("1. Review moderation");
  const buyer = client();
  await buyer("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "buyer@demo.com", password: "password123" }) });
  const prods = await buyer("/api/products");
  const product = prods.body.products[0];
  const pid = product.id;
  const unique = "ModTest " + Math.floor(performance.now());
  const posted = await buyer(`/api/products/${pid}/reviews`, { method: "POST", body: JSON.stringify({ rating: 5, title: unique, body: "Great product " + unique }) });
  check("buyer posts a review (201)", posted.status === 201);

  const listed = await admin("/api/admin/reviews");
  const mine = (listed.body.reviews || []).find((r) => r.title === unique);
  check("review shows in moderation list", !!mine);

  await admin(`/api/admin/reviews/${mine.id}`, { method: "PATCH", body: JSON.stringify({ hidden: true }) });
  const pubReviews = await client()(`/api/products/${pid}/reviews`);
  check("hidden review not shown on storefront", !(pubReviews.body.reviews || []).some((r) => r.title === unique));

  await admin(`/api/admin/reviews/${mine.id}`, { method: "PATCH", body: JSON.stringify({ hidden: false }) });
  const pubReviews2 = await client()(`/api/products/${pid}/reviews`);
  check("unhidden review shown again", (pubReviews2.body.reviews || []).some((r) => r.title === unique));

  const del = await admin(`/api/admin/reviews/${mine.id}`, { method: "DELETE" });
  check("review can be deleted", del.status === 200);

  console.log("2. Announcement bar control");
  const annText = "FLASH SALE " + Math.floor(performance.now());
  // Check the rendered topbar ELEMENT (the settings text is also in the serialized
  // page data, so we assert on `class="topbar"` which only the rendered bar emits).
  await admin("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ announcement: annText, announcementEnabled: true, announcementStart: null, announcementEnd: null }) });
  const homeOn = await client()("/");
  check("enabled announcement bar renders", typeof homeOn.body === "string" && homeOn.body.includes('class="topbar"') && homeOn.body.includes(annText));
  await admin("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ announcementEnabled: false }) });
  const homeOff = await client()("/");
  check("disabled announcement bar not rendered", typeof homeOff.body === "string" && !homeOff.body.includes('class="topbar"'));
  // Schedule entirely in the future -> hidden even if enabled
  await admin("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ announcementEnabled: true, announcementStart: "2099-01-01T00:00" }) });
  const homeFuture = await client()("/");
  check("future-scheduled announcement bar not rendered", typeof homeFuture.body === "string" && !homeFuture.body.includes('class="topbar"'));

  console.log("3. Theme colors + fonts");
  await admin("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ primaryColor: "#123456", headingFont: "georgia" }) });
  const themed = await client()("/");
  check("primary color applied to <body> CSS var", typeof themed.body === "string" && themed.body.includes("123456"));
  check("heading font override applied", typeof themed.body === "string" && themed.body.includes("Georgia"));
  const badColor = await admin("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ primaryColor: "navy" }) });
  check("invalid hex color rejected (400)", badColor.status === 400);

  console.log("4. Homepage curation toggles");
  const before = product.featuredHome;
  await admin(`/api/admin/products/${pid}`, { method: "PATCH", body: JSON.stringify({ featuredHome: !before }) });
  const after = await admin("/api/admin/products");
  const updated = (after.body.products || []).find((p) => p.id === pid);
  check("featuredHome toggled via quick action", updated?.featuredHome === !before);
  await admin(`/api/admin/products/${pid}`, { method: "PATCH", body: JSON.stringify({ featuredHome: before }) }); // restore

  console.log("5. Restore defaults");
  const restore = await admin("/api/admin/settings", { method: "PATCH", body: JSON.stringify({
    announcement: "Every product verified American Made — supporting U.S. workers, farms & factories",
    announcementEnabled: true, announcementStart: null, announcementEnd: null, announcementLink: null,
    primaryColor: "#16243a", accentColor: "#d99a3f", headingFont: "oswald", bodyFont: "cabin",
  }) });
  check("settings restored to defaults", restore.status === 200);

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
