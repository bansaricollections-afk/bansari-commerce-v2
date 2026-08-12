import { SHIPPING_THRESHOLD, STANDARD_SHIPPING } from "@/lib/shipping";

// This object is currently unreferenced elsewhere in the codebase. Its
// shipping figures are kept wired to the single source of truth (rather than
// left as independent literals) so it cannot silently drift if it is ever
// wired up.
export const STORE = {

  freeShipping: SHIPPING_THRESHOLD,

  shippingCharge: STANDARD_SHIPPING,

  currencySymbol: "₹",

  codAvailable: true,

  maxWishlist: 100,

  defaultProductLimit: 24,

  supportEmail: "support@bansaricollection.in",

};