import {
  CTAButton,
  OrderSummaryTable,
  PriceSummary,
  type OrderLineItem,
} from "../components/ContentBlocks";
import { EmailFooter, EmailHeader, EmailShell } from "../components/Layout";
import { spacing, textStyles } from "../theme";

export type PaymentSuccessfulEmailProps = {
  customerName: string;
  orderNumber: string;
  paymentDate: string;
  paymentMethod: string;
  items: OrderLineItem[];
  currency?: string;
  subtotal: number;
  discount?: number;
  shippingFee: number;
  tax: number;
  grandTotal: number;
  viewOrderUrl: string;
};

export default function PaymentSuccessfulEmail({
  customerName,
  orderNumber,
  paymentDate,
  paymentMethod,
  items,
  currency = "₹",
  subtotal,
  discount = 0,
  shippingFee,
  tax,
  grandTotal,
  viewOrderUrl,
}: PaymentSuccessfulEmailProps) {
  return (
    <EmailShell>
      <EmailHeader />

      <p style={textStyles.eyebrow}>Payment Successful</p>

      <h1 style={textStyles.heading}>
        We&apos;ve received your payment, {customerName}
      </h1>

      <p style={{ ...textStyles.body, marginTop: spacing.md }}>
        Your payment for order {orderNumber} was successful. We&apos;re now
        preparing your items with care.
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
            <td style={textStyles.muted}>Payment Date</td>
            <td align="right" style={textStyles.body}>
              {paymentDate}
            </td>
          </tr>

          <tr>
            <td style={textStyles.muted}>Payment Method</td>
            <td align="right" style={textStyles.body}>
              {paymentMethod}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginBottom: spacing.md }}>
        <OrderSummaryTable currency={currency} items={items} />
      </div>

      <div style={{ marginBottom: spacing.lg }}>
        <PriceSummary
          currency={currency}
          subtotal={subtotal}
          discount={discount}
          shippingFee={shippingFee}
          tax={tax}
          grandTotal={grandTotal}
        />
      </div>

      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr>
            <td align="center" style={{ paddingTop: spacing.sm }}>
              <CTAButton href={viewOrderUrl}>View Order</CTAButton>
            </td>
          </tr>
        </tbody>
      </table>

      <EmailFooter />
    </EmailShell>
  );
}

// Sample props for local preview/testing.
export const previewProps: PaymentSuccessfulEmailProps = {
  customerName: "Priya Sharma",
  orderNumber: "BC-100482",
  paymentDate: "10 July 2026",
  paymentMethod: "UPI",
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
  subtotal: 7498,
  discount: 500,
  shippingFee: 0,
  tax: 375,
  grandTotal: 7373,
  viewOrderUrl: "https://bansaricollections.in/orders/BC-100482",
};
