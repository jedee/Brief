/** Lower-case only the first letter, so "Service of Statement of Defence" reads well mid-sentence. */
export function lcFirst(s: string): string {
  if (!s) return s;
  // Leave acronyms such as "FCT" alone.
  if (s.length > 1 && s[1] === s[1].toUpperCase() && /\p{L}/u.test(s[1])) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}
