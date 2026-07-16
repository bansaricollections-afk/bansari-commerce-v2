"use client";

export default function Newsletter() {
  return (
    <section
      aria-label="Bansari Privé Club newsletter sign-up"
      style={{
        backgroundColor: "var(--bc-surface-dark)",
        paddingBlock: "var(--bc-section-padding)",
      }}
    >
      <div
        className="mx-auto bc-newsletter-grid"
        style={{
          maxWidth: "var(--bc-content-wide)",
          paddingInline: "var(--bc-gutter)",
        }}
      >
        {/* ── Left: editorial headline ── */}
        <div>
          <p
            className="uppercase tracking-[0.2em]"
            style={{
              fontSize: "var(--bc-text-xs)",
              fontWeight: 500,
              color: "var(--bc-text-gold)",
              marginBottom: "var(--bc-space-5)",
            }}
          >
            Bansari Privé
          </p>

          <h2
            className="font-[family:var(--font-playfair)]"
            style={{
              fontSize: "var(--bc-text-2xl)",
              fontWeight: 400,
              lineHeight: 1.08,
              letterSpacing: "-0.01em",
              color: "var(--bc-text-inverse)",
              marginBottom: "var(--bc-space-6)",
            }}
          >
            Be first to discover
            <br />
            <em style={{ fontStyle: "italic" }}>every collection.</em>
          </h2>

          <p
            style={{
              fontSize: "var(--bc-text-sm)",
              lineHeight: 1.8,
              color: "var(--bc-text-inverse)",
              opacity: 0.55,
              maxWidth: "38ch",
            }}
          >
            Early access to new arrivals, festive edits, exclusive member offers
            and styling inspiration — delivered directly to your inbox.
          </p>
        </div>

        {/* ── Right: form ── */}
        <div>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col"
            style={{ gap: "var(--bc-space-3)" }}
          >
            <label
              htmlFor="newsletter-email"
              className="uppercase tracking-[0.14em]"
              style={{
                fontSize: "var(--bc-text-xs)",
                fontWeight: 500,
                color: "var(--bc-text-inverse)",
                opacity: 0.6,
              }}
            >
              Your email address
            </label>

            <input
              id="newsletter-email"
              type="email"
              placeholder="you@example.com"
              required
              className="bc-nl-input"
              style={{
                height: "3.25rem",
                backgroundColor: "transparent",
                border: "1px solid var(--bc-border-dark)",
                color: "var(--bc-text-inverse)",
                fontSize: "var(--bc-text-sm)",
                padding: "0 1.25rem",
                outline: "none",
                fontFamily: "inherit",
                transition: "border-color var(--bc-transition-fast)",
              }}
            />

            <button
              type="submit"
              className="bc-nl-btn uppercase tracking-[0.16em]"
              style={{
                height: "3.25rem",
                backgroundColor: "var(--bc-gold-warm)",
                border: "none",
                color: "var(--bc-surface-dark)",
                fontSize: "var(--bc-text-xs)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "opacity var(--bc-transition-fast)",
                fontFamily: "inherit",
              }}
            >
              Join Privé
            </button>

            <p
              style={{
                fontSize: "var(--bc-text-xs)",
                color: "var(--bc-text-inverse)",
                opacity: 0.35,
                marginTop: "var(--bc-space-1)",
              }}
            >
              No spam. Unsubscribe at any time.
            </p>
          </form>

          {/* Benefit chips */}
          <div
            className="flex flex-wrap"
            style={{ gap: "var(--bc-space-3)", marginTop: "var(--bc-space-10)" }}
          >
            {["Early Access", "Member Offers", "Style Tips", "Celebration Edits"].map((b) => (
              <span
                key={b}
                className="uppercase tracking-[0.1em]"
                style={{
                  fontSize: "var(--bc-text-xs)",
                  fontWeight: 500,
                  color: "var(--bc-text-inverse)",
                  opacity: 0.45,
                  border: "1px solid var(--bc-border-dark)",
                  padding: "0.375rem 0.875rem",
                }}
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .bc-newsletter-grid {
          display: grid;
          gap: var(--bc-space-16);
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .bc-newsletter-grid {
            grid-template-columns: 1fr 1fr;
            gap: var(--bc-space-24);
            align-items: center;
          }
        }
        .bc-nl-input::placeholder { opacity: 0.35; color: var(--bc-text-inverse); }
        .bc-nl-input:focus { border-color: var(--bc-gold-warm) !important; }
        .bc-nl-btn:hover { opacity: 0.88; }
      `}</style>
    </section>
  );
}
