/** Room passwords never travel in clear: peers exchange this hash. */
export async function hashPassword(code: string, password: string): Promise<string | null> {
  if (!password) return null;
  const input = `love-letter:${code}:${password}`;
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Insecure contexts (plain http on a LAN) have no crypto.subtle: weak fallback (FNV-1a).
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) h = Math.imul(h ^ input.charCodeAt(i), 0x01000193);
  return `fnv-${(h >>> 0).toString(16)}`;
}
