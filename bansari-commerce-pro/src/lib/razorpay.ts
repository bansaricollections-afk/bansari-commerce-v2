import Razorpay from "razorpay";

let razorpayInstance: Razorpay | null = null;

export function getRazorpay() {
  if (razorpayInstance) {
    return razorpayInstance;
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Missing Razorpay environment variables: RAZORPAY_KEY_ID and/or RAZORPAY_KEY_SECRET."
    );
  }

  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayInstance;
}