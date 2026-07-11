import {
  AddressCard,
  CTAButton,
  OrderSummaryTable,
  PriceSummary,
  type Address,
  type OrderLineItem,
} from "../components/ContentBlocks";
import { EmailFooter, EmailHeader, EmailShell } from "../components/Layout";
import { spacing, textStyles } from "../theme";

export type OrderConfirmationEmailProps = {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  items: OrderLineItem[];
  shippingAddress: Address;
  currency?: string;
  subtotal: number;
  discount?: number;
  shippingFee: number;
  tax: number;
  grandTotal: number;
  trackOrderUrl: string;
};

export default function OrderConfirmationEmail({
  customerName,
  orderNumber,
  orderDate,
  items,
  shippingAddress,
  currency = "₹",
  subtotal,
  discount = 0,
  shippingFee,
  tax,
  grandTotal,
  trackOrderUrl,
}: OrderConfirmationEmailProps) {
  return (
    <EmailShell>
      <EmailHeader />

      <p style={textStyles.eyebrow}>Order Confirmed</p>

      <h1 style={textStyles.heading}>Thank you, {customerName}!</h1>

      <p style={{ ...textStyles.body, marginTop: spacing.md }}>
        We&apos;ve received your order and it&apos;s being prepared with
        care. Here are your order details.
      </p>

      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        style={{ marginTop: spacing.lg, marginBottom: spacing.lg }}
      >
        <tbody>
          <tr>
            <td style={textStyles.muted}>Order Number</td>
            <td align="right" style={{ ...textStyles.body, fontWeight: 600 }}>
              {orderNumber}
            </td>
          </tr>

          <tr>
            <td style={textStyles.muted}>Order Date</td>
            <td align="right" style={textStyles.body}>
              {orderDate}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginBottom: spacing.md }}>
        <OrderSummaryTable currency={currency} items={items} />
      </div>

      <div style={{ marginBottom: spacing.md }}>
        <PriceSummary
          currency={currency}
          subtotal={subtotal}
          discount={discount}
          shippingFee={shippingFee}
          tax={tax}
          grandTotal={grandTotal}
        />
      </div>

      <div style={{ marginBottom: spacing.lg }}>
        <AddressCard title="Shipping To" address={shippingAddress} />
      </div>

      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr>
            <td align="center" style={{ paddingTop: spacing.sm }}>
              <CTAButton href={trackOrderUrl}>Track Your Order</CTAButton>
            </td>
          </tr>
        </tbody>
      </table>

      <EmailFooter />
    </EmailShell>
  );
}

// Sample props for local preview/testing.
export const previewProps: OrderConfirmationEmailProps = {
  customerName: "Priya Sharma",
  orderNumber: "BC-100482",
  orderDate: "10 July 2026",
  items: [
    {
      id: "1",
      name: "Pink Embroidered Kurta Set",
      variant: "Pink · M",
      quantity: 1,
      unitPrice: 2499,
    },
    {
      id: "2",
      name: "Maroon Banarasi Silk Saree",
      variant: "Maroon · Free Size",
      quantity: 1,
      unitPrice: 4999,
    },
  ],
  shippingAddress: {
    name: "Priya Sharma",
    line1: "12 Lotus Enclave",
    line2: "Near City Park",
    city: "Vadodara",
    state: "Gujarat",
    postalCode: "390001",
    country: "India",
    phone: "+91 98765 43210",
  },
  subtotal: 7498,
  discount: 500,
  shippingFee: 0,
  tax: 375,
  grandTotal: 7373,
  trackOrderUrl: "https://bansaricollections.in/orders/BC-100482",
};