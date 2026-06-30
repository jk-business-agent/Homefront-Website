// Prices are stored as whole cents in the database. This turns 4999 into "$49.99".
export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function stars(rating: number): string {
  return "★".repeat(Math.round(rating));
}
