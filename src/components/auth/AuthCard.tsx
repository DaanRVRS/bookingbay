import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  className,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full max-w-md", className)}>
      <div className="rounded-2xl border border-border bg-card p-7 shadow-[0_24px_60px_-30px_color-mix(in_oklch,var(--foreground)_15%,transparent)] sm:p-9">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        )}
        <div className="mt-7">{children}</div>
      </div>
      {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}
