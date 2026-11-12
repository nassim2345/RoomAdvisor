import { NextResponse } from "next/server";
import { getShared } from "@/lib/share-store";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  let result;
  try {
    result = await getShared(params.id);
  } catch {
    return NextResponse.json(
      { error: "Archivio temporaneamente non disponibile", code: "UPSTREAM_ERROR" },
      { status: 503 }
    );
  }
  if (!result) {
    return NextResponse.json(
      { error: "Risultato non trovato o link scaduto", code: "NOT_FOUND" },
      { status: 404 }
    );
  }
  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
