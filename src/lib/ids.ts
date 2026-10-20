/** Short, URL-safe unique ids. Uses the Web Crypto API when available. */
export function createId(prefix = 'n'): string {
  const cryptoObj = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObj?.randomUUID) {
    return `${prefix}_${cryptoObj.randomUUID().replace(/-/g, '').slice(0, 10)}`;
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Turn a label into a camelCase key: "Full name" -> "fullName". */
export function slugifyKey(label: string): string {
  const words = label
    .normalize('NFKD')
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'field';
  const [first = 'field', ...rest] = words;
  const key = first.toLowerCase() + rest.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  return /^[A-Za-z_]/.test(key) ? key : `f${key}`;
}

/** Make `base` unique against `taken` by appending 2, 3, … */
export function uniqueKey(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}${i}`)) i += 1;
  return `${base}${i}`;
}

/**
 * Keys that are already valid identifiers (camelCase, snake_case…) are kept
 * verbatim; anything else (free text, spaces, punctuation) is slugified.
 */
export function normalizeKey(raw: string): string {
  const trimmed = raw.trim();
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) return trimmed;
  return slugifyKey(trimmed);
}
