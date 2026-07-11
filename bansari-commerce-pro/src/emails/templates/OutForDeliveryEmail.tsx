import {
  AddressCard,
  CTAButton,
  type Address,
} from "../components/ContentBlocks";
import { EmailFooter, EmailHeader, EmailShell } from "../components/Layout";
import { spacing, textStyles } from "../theme";

export type OutForDeliveryEmailProps = {
  customerName: string;
  orderNumber: string;
  carrierName: string;
  trackingNumber: string;
  deliveryAddress: Address;
  trackShipmentUrl: string;
};

export default function OutForDeliveryEmail({
  customerName,
  orderNumber,
  carrierName,
  trackingNumber,
  deliveryAddress,
  trackShipmentUrl,
}: OutForDeliveryEmailProps) {
  return (
    <EmailShell>
      <EmailHeader />

      <p style={textStyles.eyebrow}>Out For Delivery</p>

      <h1 style={textStyles.heading}>
        Arriving today, {customerName}
      </h1>

      <p style={{ ...textStyles.body, marginTop: spacing.md }}>
        Your order {orderNumber} is out for delivery and should reach you
        today. Please keep your phone handy.
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
            <td style={textStyles.muted}>Carrier</td>
            <td align="right" style={textStyles.body}>
              {carrierName}
            </td>
          </tr>

          <tr>
            <td style={textStyles.muted}>Tracking Number</td>
            <td align="right" style={textStyles.body}>
              {trackingNumber}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginBottom: spacing.lg }}>
        <AddressCard title="Delivering To" address={deliveryAddress} />
      </div>

      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr>
            <td align="center" style={{ paddingTop: spacing.sm }}>
              <CTAButton href={trackShipmentUrl}>Track Shipment</CTAButton>
            </td>
          </tr>
        </tbody>
      </table>

      <EmailFooter />
    </EmailShell>
  );
}

// Sample props for local preview/testing.
export const previewProps: OutForDeliveryEmailProps = {
  customerName: "Priya Sharma",
  orderNumber: "BC-100482",
  carrierName: "BlueDart",
  trackingNumber: "BD1234567890",
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
  trackShipmentUrl: "https://bansaricollections.in/orders/BC-100482/track",
};