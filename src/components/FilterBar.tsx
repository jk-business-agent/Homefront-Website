"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const SORTS = [
  { v: "", label: "Featured" },
  { v: "most_liked", label: "Most liked" },
  { v: "rating", label: "Top rated" },
  { v: "price_asc", label: "Price: low → high" },
  { v: "price_desc", label: "Price: high → low" },
];

export default function FilterBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [min, setMin] = useState(params.get("minPrice") || "");
  const [max, setMax] = useState(params.get("maxPrice") || "");

  function update(next: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) { if (v) p.set(k, v); else p.delete(k); }
    router.push(`/?${p.toString()}`);
  }

  return (
    <div className="filter-bar">
      <label className="fb-field">
        <span>Sort</span>
        <select value={params.get("sort") || ""} onChange={(e) => update({ sort: e.target.value })}>
          {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
      </label>
      <div className="fb-field">
        <span>Price</span>
        <div className="fb-price">
          <input type="number" min="0" placeholder="$ min" value={min} onChange={(e) => setMin(e.target.value)} />
          <span>–</span>
          <input type="number" min="0" placeholder="$ max" value={max} onChange={(e) => setMax(e.target.value)} />
          <button className="btn btn-outline" style={{ padding: "7px 12px" }} onClick={() => update({ minPrice: min, maxPrice: max })}>Go</button>
        </div>
      </div>
      {(params.get("sort") || params.get("minPrice") || params.get("maxPrice")) && (
        <button className="fb-clear" onClick={() => { setMin(""); setMax(""); update({ sort: "", minPrice: "", maxPrice: "" }); }}>Clear filters</button>
      )}
    </div>
  );
}
