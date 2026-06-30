"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

const STEPS = ["Store profile", "Ship-from", "Business & tax (W-9)", "Done"];
const BUSINESS_TYPES = ["Sole Proprietor", "Single-member LLC", "LLC", "S-Corporation", "C-Corporation", "Partnership", "Nonprofit"];

export default function Onboarding() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<any>(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login?next=/seller/onboarding"); return; }
    if (user.role !== "SELLER") { router.push("/account"); return; }
    fetch("/api/seller/store", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      const s = d.store || {};
      setF({
        name: s.name || "", bio: s.bio || "", city: s.city || "", state: s.state || "",
        shipFromLine1: s.shipFromLine1 || "", shipFromCity: s.shipFromCity || s.city || "", shipFromState: s.shipFromState || s.state || "", shipFromZip: s.shipFromZip || "",
        legalName: s.legalName || s.name || "", businessType: s.businessType || BUSINESS_TYPES[0], taxIdType: s.taxIdType || "EIN", taxId: "",
        legalLine1: s.legalLine1 || "", legalCity: s.legalCity || "", legalState: s.legalState || "", legalZip: s.legalZip || "",
        w9Name: s.w9Name || user.name, w9Certify: false, taxIdOnFile: s.taxIdOnFile,
      });
    });
  }, [user, loading, router]);

  function set(k: string, v: any) { setF((x: any) => ({ ...x, [k]: v })); }

  async function patch(body: any) {
    const res = await fetch("/api/seller/store", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Could not save"); }
  }

  async function next() {
    setErr(""); setSaving(true);
    try {
      if (step === 0) { if (!f.name) throw new Error("Store name is required"); await patch({ name: f.name, bio: f.bio, city: f.city, state: f.state }); setStep(1); }
      else if (step === 1) { await patch({ shipFromLine1: f.shipFromLine1, shipFromCity: f.shipFromCity, shipFromState: f.shipFromState, shipFromZip: f.shipFromZip }); setStep(2); }
      else if (step === 2) {
        if (!f.legalName) throw new Error("Legal name is required");
        if (!f.taxIdOnFile && !f.taxId) throw new Error("Enter your FEIN/EIN or SSN");
        if (!f.w9Certify) throw new Error("Please certify the W-9 information");
        await patch({
          legalName: f.legalName, businessType: f.businessType, taxIdType: f.taxIdType, taxId: f.taxId || undefined,
          legalLine1: f.legalLine1, legalCity: f.legalCity, legalState: f.legalState, legalZip: f.legalZip,
          w9Certify: true, w9Name: f.w9Name, onboardingComplete: true,
        });
        setStep(3);
      }
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  if (loading || !user || !f) return <div className="page"><p style={{ color: "var(--muted)" }}>Loading…</p></div>;

  return (
    <div className="page" style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ color: "var(--navy)", fontSize: 26, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>Become a Homefront Seller</h1>
      <p style={{ color: "var(--muted)", marginTop: 0, fontFamily: "var(--font-body)" }}>A quick, seamless setup. Takes about 3 minutes.</p>

      {/* Stepper */}
      <div className="op-track" style={{ marginBottom: 18 }}>
        {STEPS.map((s, i) => (
          <div key={s} className={`op-step ${i <= step ? "done" : ""} ${i === step ? "active" : ""}`}>
            <div className="op-dot">{i < step ? "✓" : i + 1}</div>
            <div className="op-label">{s}</div>
            {i < STEPS.length - 1 && <div className={`op-line ${i < step ? "done" : ""}`} />}
          </div>
        ))}
      </div>

      <div className="panel">
        {err && <div className="alert alert-error">{err}</div>}

        {step === 0 && (
          <>
            <h2>Your store</h2>
            <div className="field"><label>Store name</label><input value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
            <div className="field"><label>Tagline</label><input value={f.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Hand-forged cookware from Tennessee" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <div className="field"><label>City</label><input value={f.city} onChange={(e) => set("city", e.target.value)} /></div>
              <div className="field"><label>State</label><input value={f.state} onChange={(e) => set("state", e.target.value)} /></div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2>Ship-from address</h2>
            <p className="panel-sub">Where your packages ship from — used to create shipping labels.</p>
            <div className="field"><label>Street address</label><input value={f.shipFromLine1} onChange={(e) => set("shipFromLine1", e.target.value)} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
              <div className="field"><label>City</label><input value={f.shipFromCity} onChange={(e) => set("shipFromCity", e.target.value)} /></div>
              <div className="field"><label>State</label><input value={f.shipFromState} onChange={(e) => set("shipFromState", e.target.value)} /></div>
              <div className="field"><label>ZIP</label><input value={f.shipFromZip} onChange={(e) => set("shipFromZip", e.target.value)} /></div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Business &amp; tax info (W-9)</h2>
            <p className="panel-sub">Required for our records and 1099 tax reporting. 🔒 Your tax ID is stored securely and never shown in full.</p>
            <div className="field"><label>Legal name (as on your tax return)</label><input value={f.legalName} onChange={(e) => set("legalName", e.target.value)} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <div className="field"><label>Business type (federal tax classification)</label><select value={f.businessType} onChange={(e) => set("businessType", e.target.value)}>{BUSINESS_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
              <div className="field"><label>Tax ID type</label><select value={f.taxIdType} onChange={(e) => set("taxIdType", e.target.value)}><option value="EIN">FEIN / EIN</option><option value="SSN">SSN</option></select></div>
            </div>
            <div className="field">
              <label>{f.taxIdType === "EIN" ? "FEIN / EIN" : "SSN"}</label>
              <input value={f.taxId} onChange={(e) => set("taxId", e.target.value)} placeholder={f.taxIdOnFile ? "On file — leave blank to keep" : (f.taxIdType === "EIN" ? "12-3456789" : "123-45-6789")} />
            </div>
            <div className="field"><label>Business address</label><input value={f.legalLine1} onChange={(e) => set("legalLine1", e.target.value)} placeholder="Street" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
              <div className="field"><label>City</label><input value={f.legalCity} onChange={(e) => set("legalCity", e.target.value)} /></div>
              <div className="field"><label>State</label><input value={f.legalState} onChange={(e) => set("legalState", e.target.value)} /></div>
              <div className="field"><label>ZIP</label><input value={f.legalZip} onChange={(e) => set("legalZip", e.target.value)} /></div>
            </div>
            <div className="field"><label>Signature (type your full name)</label><input value={f.w9Name} onChange={(e) => set("w9Name", e.target.value)} /></div>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)" }}>
              <input type="checkbox" checked={f.w9Certify} onChange={(e) => set("w9Certify", e.target.checked)} style={{ marginTop: 3 }} />
              <span>Under penalties of perjury, I certify that the information above (including my taxpayer identification number) is correct, and that I am a U.S. person. (Substitute Form W-9)</span>
            </label>
          </>
        )}

        {step === 3 && (
          <div className="empty-state">
            <div className="b">🎉</div>
            <h2 style={{ marginTop: 8 }}>You're all set!</h2>
            <p style={{ color: "var(--muted)", maxWidth: 420, margin: "6px auto 0" }}>Your store is ready and your W-9 is on file. Add your first product to start selling.</p>
            <Link href="/seller" className="btn btn-navy" style={{ marginTop: 16 }}>Go to my dashboard</Link>
          </div>
        )}

        {step < 3 && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {step > 0 && <button className="btn btn-outline" onClick={() => setStep(step - 1)}>Back</button>}
            <button className="btn btn-navy" onClick={next} disabled={saving}>{saving ? "Saving…" : step === 2 ? "Finish setup" : "Continue"}</button>
          </div>
        )}
      </div>
    </div>
  );
}
