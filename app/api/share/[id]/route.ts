import { NextResponse } from "next/server";
import { getShared } from "@/lib/share-store";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const result = getShared(params.id);
  if (!result) {
    return NextResponse.json(
      { error: "Risultato non trovato o link scaduto", code: "NOT_FOUND" },
      { status: 404 }
    );
  }
  return NextResponse.json(result);
}
