import type { ReactNode } from "react";

import { boxStyles, colors, fonts, radius, spacing, textStyles } from "../theme";

// ---------------------------------------------------------------------------
// BrandLogo — placeholder wordmark. Swap for a real <img> once a hosted
// logo asset exists; kept as styled text so emails never depend on an
// image URL that might not load (many clients block images by default).
// ---------------------------------------------------------------------------
export function BrandLogo() {
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      style={{ margin: "0 auto" }}
    >
      <tbody>
        <tr>
          <td
            style={{
              width: 48,
              height: 48,
              borderRadius: radius.pill,
              border: `1px solid ${colors.gold}`,
              textAlign: "center",
              verticalAlign: "middle",
              fontFamily: fonts.heading,
              fontSize: "20px",
              color: colors.gold,
            }}
          >
            B
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// EmailShell — outer page background + centered, rounded card container.
// Every template renders its content inside this.
// ---------------------------------------------------------------------------
export function EmailShell({ children }: { children: ReactNode }) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{ backgroundColor: colors.ivory, padding: `${spacing.xxl}px 0` }}
    >
      <tbody>
        <tr>
          <td align="center">
            <table
              role="presentation"
              width="600"
              cellPadding={0}
              cellSpacing={0}
              style={{
                width: "600px",
                maxWidth: "600px",
                backgroundColor: colors.card,
                borderRadius: `${radius.lg}px`,
                border: `1px solid ${colors.border}`,
                overflow: "hidden",
              }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: `${spacing.xl}px` }}>{children}</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// EmailHeader — logo + brand name, shown at the top of every email.
// ---------------------------------------------------------------------------
export function EmailHeader() {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{ marginBottom: spacing.xl }}
    >
      <tbody>
        <tr>
          <td align="center" style={{ paddingBottom: spacing.md }}>
            <BrandLogo />

            <p
              style={{
                ...textStyles.eyebrow,
                marginTop: spacing.sm,
              }}
            >
              Bansari Collections
            </p>
          </td>
        </tr>

        <tr>
          <td
            style={{
              borderTop: `1px solid ${colors.goldSoft}`,
            }}
          />
        </tr>
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// SocialIcons — text-based social links (no external image dependency).
// ---------------------------------------------------------------------------
export function SocialIcons() {
  const links = [
    { label: "Instagram", href: "https://instagram.com/" },
    { label: "Facebook", href: "https://facebook.com/" },
    { label: "Pinterest", href: "https://pinterest.com/" },
  ];

  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: "0 auto" }}>
      <tbody>
        <tr>
          {links.map((link, index) => (
            <td key={link.label} style={{ padding: `0 ${spacing.sm}px` }}>
              <a
                href={link.href}
                style={{
                  ...textStyles.muted,
                  color: colors.maroon,
                  textDecoration: "none",
                }}
              >
                {link.label}
              </a>

              {index < links.length - 1 && (
                <span style={{ color: colors.border }}>&nbsp;·</span>
              )}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// SupportSection — "need help" block reused in every footer.
// ---------------------------------------------------------------------------
export function SupportSection() {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{ textAlign: "center", marginBottom: spacing.lg }}
    >
      <tbody>
        <tr>
          <td>
            <p style={textStyles.subheading}>Need help?</p>

            <p style={{ ...textStyles.muted, marginTop: spacing.xs }}>
              Write to us at{" "}
              <a
                href="mailto:support@bansaricollections.com"
                style={{ color: colors.maroon }}
              >
                support@bansaricollections.com
              </a>{" "}
              or call +91 98765 43210
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// EmailFooter — support section + social icons + copyright, shown at the
// bottom of every email.
// ---------------------------------------------------------------------------
export function EmailFooter() {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{ marginTop: spacing.xl }}
    >
      <tbody>
        <tr>
          <td style={boxStyles.divider as React.CSSProperties} />
        </tr>

        <tr>
          <td style={{ textAlign: "center" }}>
            <SupportSection />

            <SocialIcons />

            <p style={{ ...textStyles.muted, marginTop: spacing.lg }}>
              © {new Date().getFullYear()} Bansari Collections. All rights
              reserved.
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
