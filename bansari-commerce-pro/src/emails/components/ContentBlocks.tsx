import { boxStyles, colors, radius, spacing, textStyles } from "../theme";

// ---------------------------------------------------------------------------
// CTAButton — the single call-to-action button style, reused everywhere an
// email needs one (track order, view invoice, reset password, etc.).
// ---------------------------------------------------------------------------
export function CTAButton({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
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
              borderRadius: `${radius.pill}px`,
              backgroundColor: colors.maroon,
            }}
          >
            <a
              href={href}
              style={{
                display: "inline-block",
                padding: `${spacing.sm + 4}px ${spacing.xl}px`,
                fontFamily: textStyles.body.fontFamily,
                fontSize: "15px",
                fontWeight: 600,
                color: colors.white,
                textDecoration: "none",
                borderRadius: `${radius.pill}px`,
              }}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// AddressCard — a labeled block for a shipping or billing address.
// ---------------------------------------------------------------------------
export type Address = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
};

export function AddressCard({
  title,
  address,
}: {
  title: string;
  address: Address;
}) {
  return (
    <div style={boxStyles.card}>
      <p style={textStyles.label}>{title}</p>

      <p style={{ ...textStyles.body, marginTop: spacing.sm, fontWeight: 600 }}>
        {address.name}
      </p>

      <p style={{ ...textStyles.body, marginTop: spacing.xs }}>
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ""}
      </p>

      <p style={{ ...textStyles.body, marginTop: spacing.xs }}>
        {address.city}, {address.state} {address.postalCode}
      </p>

      <p style={{ ...textStyles.body, marginTop: spacing.xs }}>
        {address.country}
      </p>

      {address.phone && (
        <p style={{ ...textStyles.muted, marginTop: spacing.sm }}>
          {address.phone}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PriceSummary — subtotal / discount / shipping / tax / grand total block.
// ---------------------------------------------------------------------------
export type PriceSummaryProps = {
  currency?: string;
  subtotal: number;
  discount?: number;
  shippingFee: number;
  tax: number;
  grandTotal: number;
};

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-IN")}`;
}

function PriceRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
      <tbody>
        <tr>
          <td
            style={{
              ...(emphasize ? textStyles.subheading : textStyles.body),
              paddingTop: spacing.xs,
              paddingBottom: spacing.xs,
            }}
          >
            {label}
          </td>

          <td
            align="right"
            style={{
              ...(emphasize ? textStyles.subheading : textStyles.body),
              paddingTop: spacing.xs,
              paddingBottom: spacing.xs,
            }}
          >
            {value}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function PriceSummary({
  currency = "₹",
  subtotal,
  discount = 0,
  shippingFee,
  tax,
  grandTotal,
}: PriceSummaryProps) {
  return (
    <div style={boxStyles.card}>
      <p style={textStyles.label}>Price Summary</p>

      <div style={{ marginTop: spacing.sm }}>
        <PriceRow label="Subtotal" value={formatAmount(subtotal, currency)} />

        {discount > 0 && (
          <PriceRow
            label="Discount"
            value={`- ${formatAmount(discount, currency)}`}
          />
        )}

        <PriceRow
          label="Shipping"
          value={shippingFee === 0 ? "FREE" : formatAmount(shippingFee, currency)}
        />

        <PriceRow label="Tax" value={formatAmount(tax, currency)} />

        <div style={{ ...boxStyles.divider, margin: `${spacing.sm}px 0` }} />

        <PriceRow
          label="Grand Total"
          value={formatAmount(grandTotal, currency)}
          emphasize
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OrderSummaryTable — line items for an order.
// ---------------------------------------------------------------------------
export type OrderLineItem = {
  id: string;
  name: string;
  variant?: string;
  quantity: number;
  unitPrice: number;
};

export function OrderSummaryTable({
  currency = "₹",
  items,
}: {
  currency?: string;
  items: OrderLineItem[];
}) {
  return (
    <div style={boxStyles.card}>
      <p style={{ ...textStyles.label, marginBottom: spacing.sm }}>
        Order Summary
      </p>

      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id}>
              <td
                style={{
                  ...textStyles.body,
                  paddingTop: index === 0 ? 0 : spacing.sm,
                  paddingBottom: spacing.sm,
                  borderTop:
                    index === 0 ? "none" : `1px solid ${colors.border}`,
                }}
              >
                <span style={{ fontWeight: 600 }}>{item.name}</span>

                {item.variant && (
                  <>
                    <br />
                    <span style={textStyles.muted}>{item.variant}</span>
                  </>
                )}

                <br />
                <span style={textStyles.muted}>Qty {item.quantity}</span>
              </td>

              <td
                align="right"
                style={{
                  ...textStyles.body,
                  paddingTop: index === 0 ? 0 : spacing.sm,
                  paddingBottom: spacing.sm,
                  borderTop:
                    index === 0 ? "none" : `1px solid ${colors.border}`,
                  whiteSpace: "nowrap",
                }}
              >
                {formatAmount(item.unitPrice * item.quantity, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}