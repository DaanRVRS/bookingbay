import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  let dbStatus: "ok" | "error" = "ok";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch {
    dbStatus = "error";
  }

  const ok = dbStatus === "ok";

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: {
        db: { status: dbStatus, latencyMs: dbLatencyMs },
      },
      latencyMs: Date.now() - startedAt,
    },
    { status: ok ? 200 : 503 },
  );
}
