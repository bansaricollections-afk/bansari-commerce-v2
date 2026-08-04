// ─── Sprint 9C — Client-side synonym expander ────────────────────────────────
// Mirrors the authoritative list in the search_synonyms DB table.
// The application layer expands terms here before passing the query to the RPC,
// so the DB receives an already-resolved, multi-term tsquery string.

const SYNONYMS: Record<string, string[]> = {
  kurti:   ['kurta'],
  bandhej: ['bandhani'],
  gota:    ['gota', 'gota patti'],
  mirror:  ['mirror work'],
  chunni:  ['dupatta'],
};

/**
 * Expands each token in `query` by appending its synonyms.
 * Returns a whitespace-joined string of all terms (original + synonyms).
 * Preserves the original query terms so relevance ranking still works.
 *
 * @example
 * expandSynonyms('kurti silk')  // 'kurti kurta silk'
 */
export function expandSynonyms(query: string): string {
  const tokens = query.trim().toLowerCase().split(/\s+/);
  const expanded = new Set<string>(tokens);

  for (const token of tokens) {
    const alts = SYNONYMS[token];
    if (alts) {
      for (const alt of alts) {
        // multi-word synonyms (e.g. 'gota patti') split into individual tokens
        alt.split(/\s+/).forEach((w) => expanded.add(w));
      }
    }
  }

  return Array.from(expanded).join(' ');
}
