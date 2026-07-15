import { NextRequest, NextResponse } from "next/server";
import { getInventory, updateStock } from "@/services/inventory";

export async function GET() {
  try {
    const items = await getInventory();
    return NextResponse.json(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as { id: number; stock: number };
    if (typeof body.id !== "number" || typeof body.stock !== "number" || body.stock < 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    await updateStock({ id: body.id, stock: body.stock });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
