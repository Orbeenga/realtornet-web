"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/features/auth/AuthContext";
import { useSubmitInquiry } from "@/features/inquiries/hooks";
import { Button } from "@/components";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/api/client";

const inquirySchema = z.object({
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type InquiryFormValues = z.infer<typeof inquirySchema>;

interface InquiryFormProps {
  propertyId: number;
}

export function InquiryForm({ propertyId }: InquiryFormProps) {
  const { user } = useAuth();
  const submitInquiry = useSubmitInquiry();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      message: "",
    },
  });

  const onSubmit = async (values: InquiryFormValues) => {
    try {
      await submitInquiry.mutateAsync({
        property_id: propertyId,
        message: values.message,
      });
      reset();
      notify.success("Inquiry sent successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        const messageError = error.fieldErrors?.message?.[0];

        if (messageError) {
          setError("message", { message: messageError });
          return;
        }

        setError("root", {
          message:
            typeof error.detail === "string"
              ? error.detail
              : "Could not send your inquiry. Please try again.",
        });
        return;
      }

      setError("root", {
        message: "Could not send your inquiry. Please try again.",
      });
    }
  };

  if (!user) {
    return (
      <section className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Send an inquiry
        </h2>
        <p>Log in to contact the listing agent about this property.</p>
        <Link
          href="/login"
          className="inline-flex font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Go to login
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Send an inquiry
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ask about pricing, availability, inspections, or next steps.
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label
            htmlFor="message"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Message
          </label>
          <textarea
            id="message"
            rows={5}
            {...register("message")}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs transition outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            placeholder="Hi, I would like to know if this property is still available and when I can schedule a viewing."
          />
          {errors.message ? (
            <p className="text-xs text-red-600" role="alert">
              {errors.message.message}
            </p>
          ) : null}
        </div>

        {errors.root ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
            {errors.root.message}
          </p>
        ) : null}

        <Button type="submit" loading={isSubmitting || submitInquiry.isPending}>
          Send inquiry
        </Button>
      </form>
    </section>
  );
}
