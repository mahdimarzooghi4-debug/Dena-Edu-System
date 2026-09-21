/** Shared, dependency-free UI canonicalization; API still validates independently. */
export const IRAN_MOBILE = /^\+989\d{9}$/;

export function normalizeDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (char) => {
    const code = char.charCodeAt(0);
    return String(code >= 0x6f0 && code <= 0x6f9 ? code - 0x6f0 : code - 0x660);
  });
}

export function normalizeIranMobile(input: string): string | null {
  const ascii = normalizeDigits(input).replace(/[\s-]/g, "");
  const canonical = ascii.startsWith("09") ? "+98" + ascii.slice(1) : ascii;
  return IRAN_MOBILE.test(canonical) ? canonical : null;
}

export function isCanonicalIranMobile(value: string): boolean {
  return IRAN_MOBILE.test(value);
}
