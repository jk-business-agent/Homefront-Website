// Verifies admin can set a background (color/image) behind a section and it renders.
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const check = (n, c) => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}`); } };
function client() {
  let ck = "";
  return async (p, o = {}) => {
    const r = await fetch(BASE + p, { ...o, headers: { "Content-Type": "application/json", ...(ck ? { Cookie: ck } : {}), ...(o.headers || {}) } });
    const sc = r.headers.get("set-cookie"); if (sc) ck = sc.split(";")[0];
    const ct = r.headers.get("content-type") || "";
    return { status: r.status, body: ct.includes("json") ? await r.json().catch(() => ({})) : await r.text() };
  };
}

async function main() {
  console.log(`\nTesting section backgrounds at ${BASE}\n`);
  const admin = client();
  await admin("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@demo.com", password: "password123" }) });

  const pages = (await admin("/api/admin/pages")).body.pages || [];
  const promise = pages.find((p) => p.key === "our-promise");
  check("found the Our Promise page", !!promise);
  const detail = await admin(`/api/admin/pages/${promise.id}`);
  const richText = detail.body.page.sections.find((s) => s.type === "richText");
  check("found a text section to style", !!richText);

  // Merge a background into the section's existing config.
  const current = (() => { try { return JSON.parse(richText.config || "{}"); } catch { return {}; } })();
  const newCfg = { ...current, bgColor: "#16243a", bgOverlay: 35, textColor: "light" };
  const patch = await admin(`/api/admin/sections/${richText.id}`, { method: "PATCH", body: JSON.stringify({ config: newCfg }) });
  check("section background saved (200)", patch.status === 200);
  const saved = JSON.parse(patch.body.section.config);
  check("bgColor persisted", saved.bgColor === "#16243a");
  check("text field NOT lost on save", typeof saved.body === "string" && saved.body.length > 0);

  // The public page renders the background wrapper + chosen color + light text.
  const page = await client()("/p/our-promise");
  check("page renders section-bg wrapper", page.body.includes('class="section-bg'));
  check("applies the chosen background color", page.body.includes("background-color:#16243a") || page.body.includes("rgb(22, 36, 58)"));
  check("applies light text class", page.body.includes("section-bg-light"));
  check("applies darken overlay", page.body.includes("section-bg-overlay"));

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
