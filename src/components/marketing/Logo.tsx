import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  href?: string;
  showWordmark?: boolean;
}

export function Logo({ className, href = "/", showWordmark = true }: LogoProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-[oklch(0.55_0.18_18)] text-primary-foreground shadow-[0_4px_24px_-6px_color-mix(in_oklch,var(--primary)_55%,transparent)]">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          className="absolute inset-0 h-full w-full opacity-30"
        >
          <path
            d="M0 18 Q 6 14, 12 18 T 24 18"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M0 14 Q 6 10, 12 14 T 24 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
        <span className="relative font-semibold text-[15px] tracking-tight">B</span>
      </span>
      {showWordmark && (
        <span className="text-[17px] font-semibold tracking-tight text-foreground">
          Booking<span className="text-primary">Bay</span>
        </span>
      )}
    </span>
  );

  if (!href) return content;
  return <Link href={href} className="inline-flex items-center">{content}</Link>;
}
