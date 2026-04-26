"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Card, CardBody, Input } from "@/components";
import { useApplyForAgency } from "@/features/agencies/hooks";
import { ApiError } from "@/lib/api/client";

const agencyApplicationSchema = z.object({
  name: z.string().trim().min(2, "Agency name is required"),
  description: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  website_url: z.url("Use a valid website URL").optional().or(z.literal("")),
  owner_email: z.email("Use a valid owner email"),
  owner_name: z.string().trim().min(2, "Owner contact name is required"),
  owner_phone_number: z.string().trim().optional().or(z.literal("")),
  email: z.email("Use a valid agency email").optional().or(z.literal("")),
  phone_number: z.string().trim().optional().or(z.literal("")),
});

type AgencyApplicationFormValues = z.infer<typeof agencyApplicationSchema>;

function optionalValue(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function AgencyApplyForm() {
  const [submitted, setSubmitted] = useState(false);
  const applyForAgency = useApplyForAgency();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AgencyApplicationFormValues>({
    resolver: zodResolver(agencyApplicationSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      website_url: "",
      owner_email: "",
      owner_name: "",
      owner_phone_number: "",
      email: "",
      phone_number: "",
    },
  });

  const onSubmit = async (values: AgencyApplicationFormValues) => {
    try {
      await applyForAgency.mutateAsync({
        name: values.name.trim(),
        description: optionalValue(values.description),
        address: optionalValue(values.address),
        website_url: optionalValue(values.website_url),
        owner_email: values.owner_email.trim(),
        owner_name: values.owner_name.trim(),
        owner_phone_number: optionalValue(values.owner_phone_number),
        email: optionalValue(values.email),
        phone_number: optionalValue(values.phone_number),
      });
      setSubmitted(true);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        Object.entries(error.fieldErrors).forEach(([field, messages]) => {
          if (field in agencyApplicationSchema.shape) {
            setError(field as keyof AgencyApplicationFormValues, {
              type: "server",
              message: messages[0] ?? "Invalid value",
            });
          }
        });
        return;
      }

      setError("root", {
        type: "server",
        message: "Could not submit the application. Please try again.",
      });
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardBody className="space-y-5 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Application submitted
          </h1>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            Application submitted - we&apos;ll review and get back to you.
          </p>
          <Link
            href="/agencies"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Back to Agencies
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="p-6">
        <form className="space-y-6" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Agency name"
              placeholder="Example Realty"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              label="Agency email"
              type="email"
              placeholder="office@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Agency phone"
              placeholder="+234..."
              error={errors.phone_number?.message}
              {...register("phone_number")}
            />
            <Input
              label="Owner contact name"
              placeholder="Full name"
              error={errors.owner_name?.message}
              {...register("owner_name")}
            />
            <Input
              label="Owner contact email"
              type="email"
              placeholder="owner@example.com"
              error={errors.owner_email?.message}
              {...register("owner_email")}
            />
            <Input
              label="Owner contact phone"
              placeholder="+234..."
              error={errors.owner_phone_number?.message}
              {...register("owner_phone_number")}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="agency-address" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Address
            </label>
            <textarea
              id="agency-address"
              rows={3}
              className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              {...register("address")}
            />
            {errors.address?.message ? (
              <p className="text-xs text-red-600" role="alert">
                {errors.address.message}
              </p>
            ) : null}
          </div>

          <Input
            label="Website URL"
            type="url"
            placeholder="https://example.com"
            error={errors.website_url?.message}
            {...register("website_url")}
          />

          <div className="space-y-2">
            <label htmlFor="agency-description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              id="agency-description"
              rows={5}
              className="min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              {...register("description")}
            />
            {errors.description?.message ? (
              <p className="text-xs text-red-600" role="alert">
                {errors.description.message}
              </p>
            ) : null}
          </div>

          {errors.root?.message ? (
            <p className="text-sm text-red-600" role="alert">
              {errors.root.message}
            </p>
          ) : null}

          <Button type="submit" loading={applyForAgency.isPending}>
            Submit application
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
