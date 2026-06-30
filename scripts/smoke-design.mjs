// Tests for the CMS page builder: page + section CRUD, publish/nav, storefront render.
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
  console.log(`\nTesting CMS page builder at ${BASE}\n`);
  const admin = client();
  await admin("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@demo.com", password: "password123" }) });

  console.log("1. Pages list + seeded home");
  const list = await admin("/api/admin/pages");
  const pages = list.body.pages || [];
  const home = pages.find((p) => p.key === "home");
  check("pages list returns home", !!home);
  check("home is a built-in (system) page", home?.system === true);
  check("home has its widgets", home?.sectionCount >= 8);
  check("seeded custom 'our-promise' page exists", pages.some((p) => p.key === "our-promise"));

  console.log("2. Home detail (ordered sections)");
  const homeDetail = await admin(`/api/admin/pages/${home.id}`);
  const secs = homeDetail.body.page.sections;
  check("home detail returns ordered sections", Array.isArray(secs) && secs.length >= 8);
  check("first widget is the hero", secs[0].type === "hero");

  console.log("3. Create + edit a custom page");
  const created = await admin("/api/admin/pages", { method: "POST", body: JSON.stringify({ title: "Test Page " + Math.floor(performance.now()) }) });
  check("create page (201)", created.status === 201);
  const pid = created.body.page.id;
  const key = created.body.page.key;
  check("new page starts as draft", created.body.page.published === false);

  const add = await admin(`/api/admin/pages/${pid}/sections`, { method: "POST", body: JSON.stringify({ type: "promoStrip" }) });
  check("add widget (201)", add.status === 201);
  const sid = add.body.section.id;
  const add2 = await admin(`/api/admin/pages/${pid}/sections`, { method: "POST", body: JSON.stringify({ type: "richText" }) });
  const sid2 = add2.body.section.id;

  const badType = await admin(`/api/admin/pages/${pid}/sections`, { method: "POST", body: JSON.stringify({ type: "nonsense" }) });
  check("unknown widget type rejected (400)", badType.status === 400);

  const edit = await admin(`/api/admin/sections/${sid}`, { method: "PATCH", body: JSON.stringify({ config: { text: "Edited promo!", bg: "#222", junkField: "x" } }) });
  check("edit widget config (200)", edit.status === 200);
  check("unknown config keys are stripped", !JSON.parse(edit.body.section.config).junkField && JSON.parse(edit.body.section.config).text === "Edited promo!");

  const reorder = await admin(`/api/admin/pages/${pid}/sections`, { method: "PATCH", body: JSON.stringify({ orderedIds: [sid2, sid] }) });
  check("reorder sections (200)", reorder.status === 200);
  const after = await admin(`/api/admin/pages/${pid}`);
  check("reorder took effect", after.body.page.sections[0].id === sid2);

  console.log("4. Publish + navigation");
  await admin(`/api/admin/pages/${pid}`, { method: "PATCH", body: JSON.stringify({ published: true, showInNav: true, navLabel: "Testy" }) });
  const nav = await client()("/api/pages/nav");
  check("published page appears in public nav", (nav.body.pages || []).some((p) => p.key === key));

  console.log("5. Storefront rendering");
  const live = await client()(`/p/${key}`);
  check("custom page renders (200)", live.status === 200);
  check("custom page shows its promo text", typeof live.body === "string" && live.body.includes("Edited promo!"));
  const homePage = await client()("/");
  check("home renders from CMS (hero headline present)", typeof homePage.body === "string" && homePage.body.includes("Shop American"));
  check("home shows shop-by-category widget", typeof homePage.body === "string" && homePage.body.includes("Shop by category"));

  console.log("6. Permissions + guards");
  const anon = await client()("/api/admin/pages", { method: "POST", body: JSON.stringify({ title: "Hax" }) });
  check("non-admin cannot create pages (403)", anon.status === 403);
  const delSystem = await admin(`/api/admin/pages/${home.id}`, { method: "DELETE" });
  check("built-in page cannot be deleted (409)", delSystem.status === 409);
  const delCustom = await admin(`/api/admin/pages/${pid}`, { method: "DELETE" });
  check("custom page can be deleted (200)", delCustom.status === 200);

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
