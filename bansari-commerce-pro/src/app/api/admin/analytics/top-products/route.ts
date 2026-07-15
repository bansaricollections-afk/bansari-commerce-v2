import { NextResponse } from "next/server";
import { getTopProducts } from "@/services/analytics";

export async function GET() {
  try {
    const data = await getTopProducts(10);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
