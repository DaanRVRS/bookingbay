/** Escape a single CSV cell. RFC 4180 — quote when needed, double quotes inside. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str: string;
  if (value instanceof Date) {
    str = value.toISOString();
  } else if (typeof value === "object") {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Render rows of records to a CSV string. The header row is emitted from
 * `columns` (in order), and each row is built by reading the same keys.
 */
export function toCsv<T extends Record<string, unknown>>(
  columns: ReadonlyArray<{ key: keyof T & string; label: string }>,
  rows: ReadonlyArray<T>,
): string {
  const lines: string[] = [];
  lines.push(columns.map((c) => cell(c.label)).join(","));
  for (const row of rows) {
    lines.push(columns.map((c) => cell(row[c.key])).join(","));
  }
  // BOM so Excel reads UTF-8 cleanly.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Slug-safe yyyy-mm-dd timestamp suffix for filenames. */
export function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
