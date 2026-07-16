const testimonials = [
  {
    name: "Priya Shah",
    city: "Vadodara",
    review:
      "Beautiful craftsmanship and exactly as shown. The fabric quality exceeded every expectation — I was genuinely surprised.",
  },
  {
    name: "Neha Patel",
    city: "Ahmedabad",
    review:
      "Perfect fitting and elegant embroidery. I received so many compliments throughout the wedding — everyone asked where I bought it.",
  },
  {
    name: "Riya Mehta",
    city: "Surat",
    review:
      "Packaging, delivery and product quality were all outstanding. This is the third time I have ordered and it only gets better.",
  },
];

export default function Testimonials() {
  return (
    <section
      aria-label="Customer Stories"
      className="border-t"
      style={{
        backgroundColor: "var(--bc-surface-cream)",
        borderColor: "var(--bc-border-soft)",
        paddingBlock: "var(--bc-section-padding)",
      }}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: "var(--bc-content-wide)",
          paddingInline: "var(--bc-gutter)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "var(--bc-space-16)" }}>
          <p
            className="uppercase tracking-[0.18em]"
            style={{
              fontSize: "var(--bc-text-xs)",
              fontWeight: 500,
              color: "var(--bc-text-gold)",
              marginBottom: "var(--bc-space-3)",
            }}
          >
            Loved By Customers
          </p>
          <h2
            className="font-[family:var(--font-playfair)]"
            style={{
              fontSize: "var(--bc-text-xl)",
              fontWeight: 400,
              lineHeight: 1.1,
              color: "var(--bc-text-primary)",
            }}
          >
            What Our Customers Say
          </h2>
        </div>

        {/* Pull-quote grid — no cards, no stars, no shadows */}
        <div className="bc-testimonial-grid">
          {testimonials.map(({ name, city, review }) => (
            <div
              key={name}
              className="border-t"
              style={{
                borderColor: "var(--bc-border-soft)",
                paddingTop: "var(--bc-space-8)",
                paddingBottom: "var(--bc-space-8)",
              }}
            >
              <p
                className="font-[family:var(--font-playfair)] italic"
                style={{
                  fontSize: "var(--bc-text-lg)",
                  fontWeight: 400,
                  lineHeight: 1.65,
                  color: "var(--bc-text-primary)",
                  marginBottom: "var(--bc-space-6)",
                }}
              >
                &ldquo;{review}&rdquo;
              </p>

              <div className="flex items-center" style={{ gap: "var(--bc-space-3)" }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: "2rem",
                    height: "1px",
                    backgroundColor: "var(--bc-border-soft)",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <p
                    className="uppercase tracking-[0.1em]"
                    style={{
                      fontSize: "var(--bc-text-xs)",
                      fontWeight: 600,
                      color: "var(--bc-text-primary)",
                    }}
                  >
                    {name}
                  </p>
                  <p
                    style={{
                      fontSize: "var(--bc-text-xs)",
                      color: "var(--bc-text-muted)",
                      marginTop: "0.125rem",
                    }}
                  >
                    {city} · Verified Purchase
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .bc-testimonial-grid {
          display: grid;
          gap: 0;
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .bc-testimonial-grid {
            grid-template-columns: repeat(3, 1fr);
            column-gap: var(--bc-space-12);
          }
        }
      `}</style>
    </section>
  );
}
