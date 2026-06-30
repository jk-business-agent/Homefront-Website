// Platform-managed shipping LABELS.
//
// We hold one carrier account; sellers just click "Buy & Print Label". This module
// buys a label and returns the tracking number + a printable label URL.
//
// - If EASYPOST_API_KEY is set  -> real label via EasyPost (USPS/UPS/FedEx).
// - If it's blank               -> SIMULATION: a fake tracking number + our own
//                                  printable /label page, so the whole flow works
//                                  with zero setup or charges.
import crypto from "crypto";
import { quoteShipping } from "./shipping";

export type LabelAddress = {
  name: string;
  street1: string;
  city: string;
  state: string;
  zip: string;
};

export type LabelResult = {
  carrier: string;
  trackingNumber: string;
  labelUrl: string | null; // null in simulation — caller falls back to /label/[itemId]
  rateCents: number;
  shipmentId: string | null;
  simulated: boolean;
};

const API = "https://api.easypost.com/v2";

function authHeader(key: string) {
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

export function isLiveShipping(): boolean {
  return !!process.env.EASYPOST_API_KEY;
}

export async function buyLabel(input: {
  from: LabelAddress;
  to: LabelAddress;
  weightOz: number;
  service?: string; // our service id, e.g. "usps_priority"
}): Promise<LabelResult> {
  const key = process.env.EASYPOST_API_KEY;
  const weightOz = Math.max(1, Math.round(input.weightOz || 16));

  // ---- Simulation mode ----
  if (!key) {
    const est = quoteShipping(weightOz, input.to.zip);
    const chosen = est.find((o) => o.service === input.service) ?? est[0];
    const tn = "HFM" + crypto.randomBytes(6).toString("hex").toUpperCase();
    return { carrier: "USPS", trackingNumber: tn, labelUrl: null, rateCents: chosen.priceCents, shipmentId: null, simulated: true };
  }

  // ---- Real EasyPost ----
  const headers = { "Content-Type": "application/json", Authorization: authHeader(key) };
  const toAddr = { name: input.to.name, street1: input.to.street1, city: input.to.city, state: input.to.state, zip: input.to.zip, country: "US" };
  const fromAddr = { name: input.from.name, street1: input.from.street1, city: input.from.city, state: input.from.state, zip: input.from.zip, country: "US" };

  const createRes = await fetch(`${API}/shipments`, {
    method: "POST", headers,
    body: JSON.stringify({ shipment: { to_address: toAddr, from_address: fromAddr, parcel: { weight: weightOz } } }),
  });
  const shipment = await createRes.json();
  if (!createRes.ok) throw new Error(shipment?.error?.message || "Could not create shipment");

  const rates: any[] = shipment.rates || [];
  if (!rates.length) throw new Error("No shipping rates available for this address");
  // Prefer a rate matching the requested service keyword; otherwise cheapest.
  const wanted = (input.service || "").replace(/^.*_/, "").toLowerCase();
  const match = rates.find((r) => wanted && (r.service || "").toLowerCase().includes(wanted));
  const rate = match || rates.reduce((lo, r) => (parseFloat(r.rate) < parseFloat(lo.rate) ? r : lo), rates[0]);

  const buyRes = await fetch(`${API}/shipments/${shipment.id}/buy`, {
    method: "POST", headers, body: JSON.stringify({ rate: { id: rate.id } }),
  });
  const bought = await buyRes.json();
  if (!buyRes.ok) throw new Error(bought?.error?.message || "Could not buy label");

  return {
    carrier: bought.selected_rate?.carrier || rate.carrier || "USPS",
    trackingNumber: bought.tracking_code,
    labelUrl: bought.postage_label?.label_url || null,
    rateCents: Math.round(parseFloat(bought.selected_rate?.rate || rate.rate) * 100),
    shipmentId: bought.id,
    simulated: false,
  };
}
