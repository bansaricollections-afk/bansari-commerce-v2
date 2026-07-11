// Shared design tokens for the transactional email system.
// Every email component pulls its colors/fonts/spacing from here so no
// style values are duplicated across templates.

export const colors = {
  ivory: "#FFFDF9",
  card: "#FFFFFF",
  gold: "#C9A227",
  goldSoft: "#E9D9A8",
  maroon: "#5A1F2C",
  maroonDeep: "#3F1420",
  textPrimary: "#3A2A2E",
  textMuted: "#8A7A6A",
  border: "#EDE3D0",
  success: "#4C7A51",
  danger: "#B3413B",
  white: "#FFFFFF",
} as const;

export const fonts = {
  heading: "Georgia, 'Times New Roman', Times, serif",
  body: "Helvetica, Arial, sans-serif",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

// Reusable inline style objects. Email clients require inline styles (no
// external stylesheets, unreliable <style> tag support), so these are
// meant to be spread/reused directly on elements rather than duplicated
// as ad-hoc literals in every template.
export const textStyles = {
  eyebrow: {
    fontFamily: fonts.body,
    fontSize: "12px",
    letterSpacing: "2px",
    textTransform: "uppercase" as const,
    color: colors.gold,
    margin: 0,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: "28px",
    lineHeight: "36px",
    color: colors.maroonDeep,
    margin: `${spacing.sm}px 0 0 0`,
  },
  subheading: {
    fontFamily: fonts.heading,
    fontSize: "20px",
    lineHeight: "28px",
    color: colors.maroonDeep,
    margin: 0,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: "15px",
    lineHeight: "24px",
    color: colors.textPrimary,
    margin: 0,
  },
  muted: {
    fontFamily: fonts.body,
    fontSize: "13px",
    lineHeight: "20px",
    color: colors.textMuted,
    margin: 0,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: "12px",
    letterSpacing: "1px",
    textTransform: "uppercase" as const,
    color: colors.textMuted,
    margin: 0,
  },
};

export const boxStyles = {
  card: {
    backgroundColor: colors.card,
    borderRadius: `${radius.md}px`,
    border: `1px solid ${colors.border}`,
    padding: `${spacing.lg}px`,
  },
  divider: {
    borderTop: `1px solid ${colors.border}`,
    margin: `${spacing.lg}px 0`,
  },
};
