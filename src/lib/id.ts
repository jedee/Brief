/** Unique id. Falls back when randomUUID is unavailable (e.g. plain http on a LAN). */
export function uid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}
