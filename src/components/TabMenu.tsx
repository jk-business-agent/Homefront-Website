"use client";
import { useEffect, useRef, useState } from "react";

type Item = { key: string; label: string };
export type TabGroup = { label: string; key?: string; items?: Item[] };

// Grouped dropdown bar for in-page tabs (state-driven, not routes).
export default function TabMenu({ groups, active, onSelect, large }: { groups: TabGroup[]; active: string; onSelect: (key: string) => void; large?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const groupActive = (g: TabGroup) => (g.key ? active === g.key : !!g.items?.some((i) => i.key === active));
  function pick(k: string) { onSelect(k); setOpen(null); }

  return (
    <div className={`menubar ${large ? "menubar-lg" : ""}`} ref={ref}>
      {groups.map((g) => {
        if (g.key) {
          return <button key={g.label} className={`menubar-top ${groupActive(g) ? "active" : ""}`} onClick={() => pick(g.key!)}>{g.label}</button>;
        }
        const isOpen = open === g.label;
        return (
          <div key={g.label} className="menubar-group">
            <button className={`menubar-top ${groupActive(g) ? "active" : ""} ${isOpen ? "open" : ""}`} onClick={() => setOpen(isOpen ? null : g.label)} aria-expanded={isOpen}>
              {g.label} <span className="caret">▾</span>
            </button>
            {isOpen && (
              <div className="menubar-drop">
                {g.items!.map((i) => (
                  <button key={i.key} className={active === i.key ? "active" : ""} onClick={() => pick(i.key)}>{i.label}</button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
