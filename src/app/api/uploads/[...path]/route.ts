import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

const UPLOADS_ROOT = path.resolve(process.cwd(), "public", "uploads");

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await ctx.params;
  if (!parts || parts.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const requested = path.resolve(UPLOADS_ROOT, ...parts);

  // Path traversal guard: must stay inside UPLOADS_ROOT
  if (!requested.startsWith(UPLOADS_ROOT + path.sep) && requested !== UPLOADS_ROOT) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let info;
  try {
    info = await stat(requested);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!info.isFile()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(requested).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";

  const data = await readFile(requested);

  return new NextResponse(data, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(info.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
