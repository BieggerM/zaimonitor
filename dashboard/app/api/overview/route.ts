import { NextResponse } from "next/server";
import { queryOverview } from "@/lib/overview-query";

export const runtime = "nodejs";

const CACHE_EDGE_TTL_SECONDS = 30;
const CACHE_STALE_TTL_SECONDS = 40;

function parseHours(raw: string | null): number {
  if (!raw) return 24;
  const normalized = raw.trim();
  if (normalized === "24" || normalized === "168") return Number(normalized);
  return 24;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const hours = parseHours(url.searchParams.get("hours"));

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json({ error: "MONGODB_URI is required" }, { status: 500 });
    }

    const payload = await queryOverview(mongoUri, { hours });

    return NextResponse.json(payload, {
      headers: {
        "cache-control": `public, s-maxage=${CACHE_EDGE_TTL_SECONDS}, stale-while-revalidate=${CACHE_STALE_TTL_SECONDS}`,
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Failed to fetch overview";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
