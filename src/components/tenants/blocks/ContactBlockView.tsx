import type { ContactBlock } from "@/lib/pages/blocks";
import { ContactForm } from "@/components/tenants/ContactForm";

export function ContactBlockView({
  block,
  organizationId,
  accent,
}: {
  block: ContactBlock;
  organizationId: string;
  accent: string;
}) {
  return (
    <section className="border-b border-border py-12 sm:py-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        {(block.heading || block.intro) && (
          <div className="mb-6">
            {block.heading && (
              <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                {block.heading}
              </h2>
            )}
            {block.intro && (
              <p className="mt-2 text-base text-muted-foreground text-pretty">
                {block.intro}
              </p>
            )}
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <ContactForm organizationId={organizationId} accent={accent} />
        </div>
      </div>
    </section>
  );
}
