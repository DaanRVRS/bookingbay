import type { VideoBlock } from "@/lib/pages/blocks";
import { ConsentEmbed } from "./ConsentEmbed";

/**
 * Build an embed URL from a YouTube watch / shorts / youtu.be / Vimeo URL.
 * Returns null when the URL doesn't look like a supported video.
 *
 * YouTube via youtube-nocookie.com (privacy-enhanced mode: geen cookies
 * vóór afspelen); Vimeo met dnt=1 (Do Not Track).
 */
function toEmbedUrl(raw: string): { src: string; provider: "YouTube" | "Vimeo" } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "");

    // YouTube ?v=ID
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        if (id) return { src: `https://www.youtube-nocookie.com/embed/${id}`, provider: "YouTube" };
      }
      // /shorts/ID or /embed/ID already
      const m = u.pathname.match(/^\/(shorts|embed)\/([\w-]{6,})/);
      if (m) return { src: `https://www.youtube-nocookie.com/embed/${m[2]}`, provider: "YouTube" };
    }
    // youtu.be/ID
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      if (id) return { src: `https://www.youtube-nocookie.com/embed/${id}`, provider: "YouTube" };
    }
    // Vimeo /ID
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const m = u.pathname.match(/(\d+)/);
      if (m) return { src: `https://player.vimeo.com/video/${m[1]}?dnt=1`, provider: "Vimeo" };
    }
  } catch {
    return null;
  }
  return null;
}

export function VideoBlockView({ block }: { block: VideoBlock }) {
  const embed = toEmbedUrl(block.url);
  if (!embed && !block.heading) return null;

  return (
    <section className="border-t border-border py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {block.heading && (
          <h2 className="mb-5 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {block.heading}
          </h2>
        )}
        {embed ? (
          <ConsentEmbed
            src={embed.src}
            title={block.heading || "Video"}
            provider={embed.provider}
            className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted"
            iframeClassName="absolute inset-0 size-full"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            loadLabel="Video laden"
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
            Plak een YouTube- of Vimeo-URL om de video te tonen.
          </div>
        )}
        {block.caption && (
          <p className="mt-3 text-center text-xs text-muted-foreground">{block.caption}</p>
        )}
      </div>
    </section>
  );
}
