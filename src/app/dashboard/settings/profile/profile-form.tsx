"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/FormField";
import { updateProfileAction } from "@/lib/settings/actions";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/settings/schemas";

export function ProfileForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setError,
    reset,
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: initialName },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await updateProfileAction(values);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            setError(k as keyof UpdateProfileInput, { message: v });
          }
        }
        toast.error(res.error);
        return;
      }
      toast.success("Profiel bijgewerkt");
      reset(values);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField
        label="Naam"
        error={errors.name?.message}
        autoComplete="name"
        {...register("name")}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !isDirty}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Opslaan
        </Button>
      </div>
    </form>
  );
}
