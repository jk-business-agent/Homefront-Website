// Password strength / breach checks for new passwords (signup + password change).
// Existing accounts aren't re-validated — this only gates passwords being SET.

// A small blocklist of the most-abused passwords. A full deployment can swap this
// for a k-anonymity check against the HaveIBeenPwned range API; this catches the
// overwhelming majority of credential-stuffing targets with zero network calls.
const COMMON = new Set([
  "password", "password1", "password123", "passw0rd", "12345678", "123456789",
  "1234567890", "qwerty", "qwertyuiop", "111111", "123123", "abc123", "iloveyou",
  "admin", "admin123", "letmein", "welcome", "welcome1", "monkey", "dragon",
  "sunshine", "princess", "football", "baseball", "trustno1", "000000", "homefront",
  "homefront1", "changeme", "secret", "starwars", "whatever", "superman", "qwerty123",
]);

// Returns an error message if the password is unacceptable, or null if it's fine.
export function checkPasswordStrength(password: string): string | null {
  const p = password ?? "";
  if (p.length < 8) return "Password must be at least 8 characters";
  if (p.length > 200) return "Password is too long";
  if (COMMON.has(p.toLowerCase())) {
    return "That password is too common and easy to guess. Please choose a stronger one.";
  }
  // Reject trivial single-class passwords (all digits / all same char).
  if (/^(.)\1+$/.test(p)) return "Please choose a less repetitive password";
  if (/^\d+$/.test(p)) return "Password can't be all numbers. Add letters or symbols.";
  return null;
}
