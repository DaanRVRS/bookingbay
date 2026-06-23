"use client";

import { useRef, useTransition } from "react";
import { Loader2, Star, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { uploadItemImageAction } from "@/lib/uploads/actions";

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  /** Maximaal aantal afbeeldingen. Standaard 5. */
  max?: number;
  disabled?: boolean;
}

/**
 * Galerij-uploader voor meerdere item-afbeeldingen (max `max`). De eerste in de
 * lijst is de hoofd-afbeelding (= imageUrl). Uploaden gaat per bestand via
 * dezelfde server-action als de losse ImageUploader (scaling + webp).
 */
export function MultiImageUploader({
  value,
  onChange,
  max = 5,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const full = value.length >= max;

  const onPick = () => inputRef.current?.click();

  const onFiles = (files: FileList) => {
    const room = max - value.length;
    const picked = Array.from(files).slice(0, room);
    if (picked.length === 0) return;
    if (files.length > room) {
      toast.error(`Maximaal ${max} afbeeldingen — alleen de eerste ${room} toegevoegd`);
    }
    startTransition(async () => {
      const uploaded: string[] = [];
      for (const file of picked) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await uploadItemImageAction(formData);
        if (!res.ok || !res.url) {
          toast.error(res.error ?? "Upload mislukt");
          continue;
        }
        uploaded.push(res.url);
      }
      if (uploaded.length > 0) {
        onChange([...value, ...uploaded].slice(0, max));
        toast.success(
          uploaded.length > 1
            ? `${uploaded.length} afbeeldingen geüpload`
            : "Afbeelding geüpload",
        );
      }
    });
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const makePrimary = (i: number) => {
    if (i === 0) return;
    const next = [...value];
    const [picked] = next.splice(i, 1);
    next.unshift(picked);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {value.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="size-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                Hoofd
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => makePrimary(i)}
                  disabled={disabled || pending}
                  title="Als hoofd-afbeelding instellen"
                  aria-label="Als hoofd-afbeelding instellen"
                  className="grid size-6 place-items-center rounded bg-background/90 text-foreground transition-colors hover:bg-background"
                >
                  <Star className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                disabled={disabled || pending}
                title="Verwijderen"
                aria-label="Afbeelding verwijderen"
                className="grid size-6 place-items-center rounded bg-background/90 text-destructive transition-colors hover:bg-background"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {!full && (
          <button
            type="button"
            onClick={onPick}
            disabled={disabled || pending}
            className="grid aspect-[4/3] place-items-center rounded-lg border border-dashed border-border bg-muted/20 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="size-5 animate-spin text-primary" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-xs">
                <UploadCloud className="size-5" />
                Toevoegen
              </span>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="text-xs text-muted-foreground">
        Max {max} afbeeldingen. JPG, PNG, WEBP of HEIC, max 8 MB per stuk. De
        eerste is de hoofd-afbeelding (klik op de ster om te wisselen).
      </p>
    </div>
  );
}
