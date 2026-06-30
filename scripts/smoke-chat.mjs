// End-to-end test for the 3-way chat: buyer ↔ seller ↔ admin (platform).
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
function check(n, c) { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}`); } }
function client() {
  let ck = "";
  return async (p, o = {}) => {
    const r = await fetch(BASE + p, { ...o, headers: { "Content-Type": "application/json", ...(ck ? { Cookie: ck } : {}), ...(o.headers || {}) } });
    const sc = r.headers.get("set-cookie"); if (sc) ck = sc.split(";")[0];
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
}

async function main() {
  console.log(`\nTesting chat at ${BASE}\n`);
  const guest = client();
  // Find the store that owns the water bottle (seller5 / Summit Steel Goods).
  const products = (await guest("/api/products")).body.products;
  const bottle = products.find((p) => /bottle/i.test(p.name));
  const storeId = bottle.storeId;

  // Buyer starts a NEW conversation (use customer1 to avoid the seeded demo thread).
  const buyer = client();
  await buyer("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "customer1@demo.com", password: "password123" }) });
  const start = await buyer("/api/messages", { method: "POST", body: JSON.stringify({ storeId, subject: "Test thread", body: "Hello, is this in stock?" }) });
  check("buyer starts a conversation", start.status === 201 && !!start.body.conversationId);
  const convoId = start.body.conversationId;
  const inbox = await buyer("/api/messages?as=buyer");
  check("buyer sees it in their inbox", inbox.body.conversations.some((c) => c.id === convoId));

  // Seller (owns the store) sees it and replies.
  const seller = client();
  await seller("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "seller5@demo.com", password: "password123" }) });
  const sInbox = await seller("/api/messages?as=seller");
  check("seller sees the conversation", sInbox.body.conversations.some((c) => c.id === convoId));
  const sReply = await seller(`/api/messages/${convoId}`, { method: "POST", body: JSON.stringify({ body: "Yes! Ships in 1 business day." }) });
  check("seller can reply", sReply.status === 201 && sReply.body.message.senderRole === "SELLER");

  // Admin (platform) sees ALL and joins.
  const admin = client();
  await admin("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@demo.com", password: "password123" }) });
  const aInbox = await admin("/api/messages?as=admin");
  check("admin sees all conversations", aInbox.body.conversations.some((c) => c.id === convoId));
  const aReply = await admin(`/api/messages/${convoId}`, { method: "POST", body: JSON.stringify({ body: "Homefront Support here if you need anything!" }) });
  check("admin can join the thread", aReply.status === 201 && aReply.body.message.senderRole === "ADMIN");

  // Buyer sees the full 3-way thread.
  const thread = await buyer(`/api/messages/${convoId}`);
  const roles = new Set(thread.body.messages.map((m) => m.senderRole));
  check("thread contains all 3 voices (buyer/seller/admin)", roles.has("BUYER") && roles.has("SELLER") && roles.has("ADMIN"));
  check("buyer's role in thread is BUYER", thread.body.myRole === "BUYER");

  // Access control: an unrelated buyer cannot read it.
  const stranger = client();
  await stranger("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "customer2@demo.com", password: "password123" }) });
  const denied = await stranger(`/api/messages/${convoId}`);
  check("unrelated user is blocked (403)", denied.status === 403);
  const guestDenied = await guest("/api/messages?as=buyer");
  check("signed-out user is blocked (401)", guestDenied.status === 401);

  console.log(`\n${fail === 0 ? "🎉 ALL PASSED" : "⚠️ SOME FAILED"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error("crashed:", e); process.exit(1); });
