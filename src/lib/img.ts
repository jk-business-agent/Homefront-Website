// Image helpers. For Cloudinary-hosted images we inject on-the-fly transformations
// so the browser gets the best FORMAT (f_auto → WebP/AVIF), best QUALITY (q_auto),
// and a SIZE matched to the device (via srcset widths). Non-Cloudinary URLs (local
// dev uploads) are returned untouched.

function isCloudinary(url?: string | null): url is string {
  return typeof url === "string" && url.includes("res.cloudinary.com/") && url.includes("/upload/");
}

// Insert a transformation segment right after "/upload/".
export function cld(url: string, transform: string): string {
  if (!isCloudinary(url)) return url;
  return url.replace("/upload/", `/upload/${transform}/`);
}

export type Responsive = { src: string; srcSet?: string };

// Build a responsive image: a default src + a srcset across widths.
// `square` crops to a centered square (cards); otherwise it limits the longest side.
export function responsive(url: string | null | undefined, opts: { widths: number[]; base: number; square?: boolean }): Responsive {
  if (!isCloudinary(url)) return { src: url || "" };
  const t = (w: number) =>
    opts.square ? `f_auto,q_auto,c_fill,g_auto,w_${w},h_${w}` : `f_auto,q_auto,c_limit,w_${w}`;
  return {
    src: cld(url, t(opts.base)),
    srcSet: opts.widths.map((w) => `${cld(url, t(w))} ${w}w`).join(", "),
  };
}

// Parse the JSON imageUrls field → first image URL (or null).
export function firstImage(imageUrls?: string | null): string | null {
  if (!imageUrls) return null;
  try { const arr = JSON.parse(imageUrls); return Array.isArray(arr) && arr.length ? arr[0] : null; } catch { return null; }
}
