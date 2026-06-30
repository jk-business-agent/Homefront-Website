// Shipping rate ESTIMATOR.
//
// This computes believable shipping prices from package weight, destination, and
// speed — so checkout shows a real cost instead of "free". It is an estimate.
// To bill exact live carrier rates, connect EasyPost / Shippo / Pirate Ship
// (one account covers USPS + UPS + FedEx) and swap this function for their quote API.

export type ShippingOption = {
  service: string;
  label: string;
  etaDays: string;
  priceCents: number;
};

// Rough U.S. shipping "zone" from the destination ZIP's first digit.
// Higher = farther from the population center / more cost.
function zoneMultiplier(zip: string): number {
  const d = parseInt((zip || "0")[0], 10);
  if (Number.isNaN(d)) return 1.15;
  // West coast (9), Northeast (0) etc. cost a bit more than the middle.
  const byFirstDigit = [1.05, 1.0, 1.05, 1.1, 1.1, 1.15, 1.15, 1.2, 1.25, 1.3];
  return byFirstDigit[d] ?? 1.15;
}

const SERVICES: { service: string; label: string; etaDays: string; base: number; perLb: number; mult: number }[] = [
  { service: "usps_ground", label: "USPS Ground Advantage", etaDays: "3–5 business days", base: 499, perLb: 90, mult: 1.0 },
  { service: "usps_priority", label: "USPS Priority Mail", etaDays: "2–3 business days", base: 799, perLb: 140, mult: 1.0 },
  { service: "ups_2day", label: "UPS 2nd Day Air", etaDays: "2 business days", base: 1499, perLb: 320, mult: 1.0 },
  { service: "overnight", label: "Overnight (next business day)", etaDays: "1 business day", base: 2999, perLb: 650, mult: 1.0 },
];

// totalWeightOz across the cart; zip = destination. Returns priced options.
export function quoteShipping(totalWeightOz: number, zip: string): ShippingOption[] {
  const lbs = Math.max(1, Math.ceil(totalWeightOz / 16));
  const z = zoneMultiplier(zip);
  return SERVICES.map((s) => ({
    service: s.service,
    label: s.label,
    etaDays: s.etaDays,
    priceCents: Math.round((s.base + s.perLb * (lbs - 1)) * z * s.mult),
  }));
}

export function findServiceLabel(service: string): string {
  return SERVICES.find((s) => s.service === service)?.label ?? "Shipping";
}
