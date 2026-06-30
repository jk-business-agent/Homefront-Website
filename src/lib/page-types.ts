// Shared context passed to every widget renderer.
export type PageCtx = {
  category: string;
  search: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  showHero: boolean; // true on the plain landing view (category All, no search)
  settings: any;
  // Set on product pages so product-aware widgets (e.g. related products) work.
  product?: { id: string; category: string; name: string };
};

export const landingCtx = (settings: any): PageCtx => ({
  category: "All", search: "", showHero: true, settings,
});
