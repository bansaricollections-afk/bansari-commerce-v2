/**
 * Safely serialise a structured-data object for injection into a
 * <script type="application/ld+json"> tag.
 *
 * WHY THIS EXISTS
 * `JSON.stringify` does NOT escape `<`. Inside a <script> element the HTML
 * parser is still scanning for the closing tag, so any string reaching the page
 * that contains `</script>` terminates the block early and everything after it
 * is parsed as HTML. Product names, descriptions, SEO fields and guide copy all
 * flow into our JSON-LD, so a value like
 *
 *     Kurta </script><img src=x onerror=alert(document.cookie)>
 *
 * becomes stored XSS on every page rendering that product — executing for every
 * visitor, with access to their session.
 *
 * The site's CSP would normally blunt this, but it allows
 * `script-src 'unsafe-inline'`, so an injected inline script does run.
 *
 * Writing product data requires an admin session, which makes this a
 * privilege-escalation path rather than an open door. But "a compromised admin
 * account can XSS every customer" is exactly the blast radius worth closing,
 * and the fix costs nothing.
 *
 * WHAT IS ESCAPED
 *   <  ends a <script> block via `</script>` — this is the actual vulnerability
 *   >  escaped for symmetry; harmless alone, free to include
 *   &  prevents entity-based smuggling in some parser states
 *
 * NOT HANDLED: U+2028 / U+2029. These are valid inside JSON strings but are
 * JavaScript line terminators, so they can break a consumer that evals the
 * payload. They are deliberately omitted because they cannot be expressed
 * safely here — a literal one inside a regex literal ends the literal and the
 * file will not compile. They are not an XSS vector, only a compatibility
 * nuisance, and nothing in this codebase evals JSON-LD. If they ever matter,
 * handle them with String.fromCharCode(0x2028) and split/join, not a regex.
 *
 * The replacements are \uXXXX escapes, which are valid JSON and decode back to
 * the original characters — Google and schema validators see exactly the
 * intended text. Nothing is altered semantically.
 */
export function jsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
