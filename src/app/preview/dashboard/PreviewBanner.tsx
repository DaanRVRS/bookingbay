import Link from "next/link";

export function PreviewBanner({ name }: { name: string }) {
  return (
    <div className="border-b border-dashed border-[oklch(0.85_0.13_85)]/50 bg-[oklch(0.97_0.05_80)] px-4 py-2 text-center text-xs text-[oklch(0.4_0.13_70)]">
      <strong>{name} preview</strong> — alleen voor review.{" "}
      <Link href="/preview/dashboard" className="underline hover:no-underline">
        Bekijk andere varianten
      </Link>
    </div>
  );
}
