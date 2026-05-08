import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  href?: string;
  /**
   * - `true` (default): icon + wordmark naast elkaar
   * - `false`: alleen het boot-icon (voor mobiele headers en compacte plekken)
   */
  showWordmark?: boolean;
}

export function Logo({ className, href = "/", showWordmark = true }: LogoProps) {
  const content = (
    <span className={cn("inline-flex items-center", className)}>
      {showWordmark ? (
        // Combined logo (icon + "bookingbay" wordmark in één PNG)
        <Image
          src="/logo.png"
          alt="BookingBay"
          width={1080}
          height={300}
          priority
          className="h-11 w-auto"
        />
      ) : (
        // Icon only (boot in oranje cirkel)
        <Image
          src="/icon.png"
          alt="BookingBay"
          width={312}
          height={312}
          priority
          className="size-10"
        />
      )}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-flex items-center">
      {content}
    </Link>
  );
}
