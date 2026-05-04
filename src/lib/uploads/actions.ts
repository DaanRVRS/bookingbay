"use server";

import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { requireOrg } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB raw upload
const MAX_DIMENSION = 1600; // longest side
const QUALITY = 82;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export interface UploadResult {
  ok: boolean;
  url?: string;
  error?: string;
}

export async function uploadItemImageAction(formData: FormData): Promise<UploadResult> {
  const ctx = await requireOrg();
  assertCan(ctx.membership.role, "catalog:manage");

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Geen bestand ontvangen" };
  }
  if (file.size === 0) {
    return { ok: false, error: "Bestand is leeg" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: `Bestand te groot (max ${MAX_BYTES / 1024 / 1024} MB)` };
  }
  if (file.type && !ALLOWED.has(file.type)) {
    return { ok: false, error: `Bestandstype ${file.type} niet toegestaan` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Process: resize, convert to webp, strip metadata
  let processed: Buffer;
  try {
    processed = await sharp(buffer, { failOn: "error" })
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY })
      .toBuffer();
  } catch (err) {
    console.error("[uploads] sharp processing failed:", err);
    return { ok: false, error: "Kon afbeelding niet verwerken" };
  }

  const filename = `${randomBytes(16).toString("hex")}.webp`;
  const orgDir = path.join(process.cwd(), "public", "uploads", ctx.organization.id);
  const filePath = path.join(orgDir, filename);

  try {
    await mkdir(orgDir, { recursive: true });
    await writeFile(filePath, processed);
  } catch (err) {
    console.error("[uploads] disk write failed:", err);
    return { ok: false, error: "Kon afbeelding niet opslaan" };
  }

  const url = `/uploads/${ctx.organization.id}/${filename}`;
  return { ok: true, url };
}
