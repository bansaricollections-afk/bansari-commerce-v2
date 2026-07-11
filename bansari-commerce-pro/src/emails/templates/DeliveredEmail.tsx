import {
  AddressCard,
  CTAButton,
  type Address,
} from "../components/ContentBlocks";
import { EmailFooter, EmailHeader, EmailShell } from "../components/Layout";
import { spacing, textStyles } from "../theme";

export type DeliveredEmailProps = {
  customerName: string;
  orderNumber: string;
  deliveredOn: string;
  deliveryAddress: Address;
  viewOrderUrl: string;
};

export default function DeliveredEmail({
  customerName,
  orderNumber,
  deliveredOn,
  deliveryAddress,
  viewOrderUrl,
}: DeliveredEmailProps) {
  return (
    <EmailShell>
      <EmailHeader />

      <p style={textStyles.eyebrow}>Delivered</p>

      <h1 style={textStyles.heading}>
        Your order has arrived, {customerName}
      </h1>

      <p style={{ ...textStyles.body, marginTop: spacing.md }}>
        Order {orderNumber} was delivered on {deliveredOn}. We hope you
        love it as much as we loved putting it together.
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
            <td style={textStyles.muted}>Delivered On</td>
            <td align="right" style={textStyles.body}>
              {deliveredOn}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginBottom: spacing.lg }}>
        <AddressCard title="Delivered To" address={deliveryAddress} />
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
export const previewProps: DeliveredEmailProps = {
  customerName: "Priya Sharma",
  orderNumber: "BC-100482",
  deliveredOn: "14 July 2026",
  deliveryAddress: {
    name: "Priya Sharma",
    line1: "12 Lotus Enclave",
    line2: "Near City Park",
    city: "Vadodara",
    state: "Gujarat",
    postalCode: "390001",
    country: "India",
    phone: "+91 98765 43210",
  },
  viewOrderUrl: "https://bansaricollections.in/orders/BC-100482",
};