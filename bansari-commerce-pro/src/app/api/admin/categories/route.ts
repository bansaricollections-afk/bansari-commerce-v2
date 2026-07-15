import { NextRequest, NextResponse } from "next/server";
import { getCategories, renameCategory } from "@/services/categories";

export async function GET() {
  try {
    const data = await getCategories();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as { old_name: string; new_name: string };
    if (!body.old_name || !body.new_name) {
      return NextResponse.json({ error: "old_name and new_name are required" }, { status: 400 });
    }
    await renameCategory(body.old_name, body.new_name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
