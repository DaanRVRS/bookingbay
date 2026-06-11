"use client";

import { useRef, useState, useTransition } from "react";
import { ImageIcon, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadItemImageAction } from "@/lib/uploads/actions";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export function ImageUploader({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(value);

  const onPick = () => inputRef.current?.click();

  const onFile = (file: File) => {
    // Show local preview immediately
    const local = URL.createObjectURL(file);
    setPreviewUrl(local);

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const res = await uploadItemImageAction(formData);
      if (!res.ok || !res.url) {
        toast.error(res.error ?? "Upload mislukt");
        setPreviewUrl(value);
        return;
      }
      onChange(res.url);
      setPreviewUrl(res.url);
      toast.success("Afbeelding geüpload");
    });
  };

  const onClear = () => {
    setPreviewUrl(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg border border-border bg-muted/40 sm:w-40">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <ImageIcon className="size-8 opacity-40" />
          </div>
        )}
        {pending && (
          <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={onPick}
          disabled={disabled || pending}
          className="w-full"
        >
          <UploadCloud className="size-4 shrink-0" />
          <span className="truncate">
            {previewUrl ? "Andere afbeelding" : "Afbeelding uploaden"}
          </span>
        </Button>
        {previewUrl && (
          <Button
            type="button"
            variant="outline"
            onClick={onClear}
            disabled={disabled || pending}
            className="w-full text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" />
            Verwijderen
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WEBP of HEIC. Max 8 MB. Wordt automatisch geschaald + naar webp omgezet.
        </p>
      </div>
    </div>
  );
}
