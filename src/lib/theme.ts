// Font choices for the theme customizer. The defaults (oswald/cabin) are the
// brand fonts loaded via next/font — picking them means "no override". Other
// options use web-safe stacks that need no loading, so they always work.
export type FontOption = { key: string; label: string; stack: string | null };

export const HEADING_FONTS: FontOption[] = [
  { key: "oswald", label: "Oswald — bold condensed (default)", stack: null },
  { key: "georgia", label: "Georgia — classic serif", stack: "Georgia, 'Times New Roman', serif" },
  { key: "system", label: "System — clean sans", stack: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { key: "courier", label: "Courier — typewriter", stack: "'Courier New', Courier, monospace" },
];

export const BODY_FONTS: FontOption[] = [
  { key: "cabin", label: "Cabin — warm sans (default)", stack: null },
  { key: "georgia", label: "Georgia — classic serif", stack: "Georgia, 'Times New Roman', serif" },
  { key: "system", label: "System — clean sans", stack: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
];

export function headingStack(key: string): string | null {
  return HEADING_FONTS.find((f) => f.key === key)?.stack ?? null;
}
export function bodyStack(key: string): string | null {
  return BODY_FONTS.find((f) => f.key === key)?.stack ?? null;
}
