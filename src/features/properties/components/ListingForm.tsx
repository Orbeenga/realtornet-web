"use client";

import { useEffect, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError } from "@/lib/api/client";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Input,
  LoadingState,
} from "@/components";
import { useLocations, usePropertyTypes } from "@/features/properties/hooks";

const listingFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  price: z.coerce.number().positive("Price must be greater than zero"),
  bedrooms: z.coerce.number().int().min(0, "Bedrooms cannot be negative"),
  bathrooms: z.coerce.number().min(0, "Bathrooms cannot be negative"),
  property_size: z.coerce.number().positive("Property size must be greater than zero"),
  listing_type: z.enum(["sale", "rent", "lease"]),
  listing_status: z.enum(["available", "active", "sold", "pending"]),
  property_type_id: z.coerce.number().int().positive("Select a property type"),
  location_id: z.coerce.number().int().positive("Select a location"),
});

type ListingFormInput = z.input<typeof listingFormSchema>;
export type ListingFormValues = z.output<typeof listingFormSchema>;

interface ListingFormProps {
  title: string;
  description?: string;
  submitLabel: string;
  initialValues?: Partial<ListingFormValues>;
  onSubmit: (values: ListingFormValues) => Promise<void>;
  submitting?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  children?: ReactNode;
  variant?: "card" | "plain";
}

const defaultValues: ListingFormValues = {
  title: "",
  description: "",
  price: 0,
  bedrooms: 0,
  bathrooms: 0,
  property_size: 0,
  listing_type: "sale",
  listing_status: "available",
  property_type_id: 0,
  location_id: 0,
};

export function ListingForm({
  title,
  description,
  submitLabel,
  initialValues,
  onSubmit,
  submitting = false,
  secondaryActionLabel,
  onSecondaryAction,
  children,
  variant = "card",
}: ListingFormProps) {
  const propertyTypesQuery = usePropertyTypes();
  const locationsQuery = useLocations();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ListingFormInput, unknown, ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      ...defaultValues,
      ...initialValues,
    } satisfies ListingFormInput,
  });

  useEffect(() => {
    if (!initialValues) {
      return;
    }

    reset({
      ...defaultValues,
      ...initialValues,
    } satisfies ListingFormInput);
  }, [initialValues, reset]);

  const submitHandler = async (values: ListingFormValues) => {
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors ?? {}).forEach(([field, messages]) => {
          setError(field as keyof ListingFormValues, {
            message: messages[0],
          });
        });

        if (!error.fieldErrors || Object.keys(error.fieldErrors).length === 0) {
          setError("root", {
            message:
              typeof error.detail === "string"
                ? error.detail
                : "Could not save listing. Please try again.",
          });
        }

        return;
      }

      setError("root", {
        message: "Could not save listing. Please try again.",
      });
    }
  };

  if (propertyTypesQuery.isLoading || locationsQuery.isLoading) {
    return <LoadingState message="Loading listing form..." />;
  }

  if (propertyTypesQuery.isError || locationsQuery.isError) {
    return (
      <ErrorState
        title="Could not load listing options"
        message="Property types and locations come from the live backend catalogue. Please try again."
        onRetry={() => {
          void propertyTypesQuery.refetch();
          void locationsQuery.refetch();
        }}
      />
    );
  }

  const form = (
    <form className="mx-auto w-full max-w-[800px] space-y-6" onSubmit={handleSubmit(submitHandler)} noValidate>
          <div className="w-full">
            <Input
              label="Title"
              placeholder="Modern 3-bedroom apartment in Lekki"
              error={errors.title?.message}
              className="h-11 w-full px-3 py-2"
              {...register("title")}
            />
          </div>

          <div className="w-full">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              {...register("description")}
              className="h-40 w-full resize-none overflow-y-auto rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs transition outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              placeholder="Describe the property, its location, and standout features."
            />
            {errors.description ? (
              <p className="text-xs text-red-600">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="w-full sm:w-[240px]">
              <Input
                type="number"
                label="Price"
                error={errors.price?.message}
                {...register("price")}
              />
            </div>
            <div className="w-full sm:w-[180px]">
              <Input
                type="number"
                label="Property Size (sqm)"
                error={errors.property_size?.message}
                {...register("property_size")}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="w-full sm:w-[140px]">
              <Input
                type="number"
                label="Bedrooms"
                error={errors.bedrooms?.message}
                {...register("bedrooms")}
              />
            </div>
            <div className="w-full sm:w-[140px]">
              <Input
                type="number"
                label="Bathrooms"
                error={errors.bathrooms?.message}
                {...register("bathrooms")}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="w-full sm:w-[200px]">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Listing Type
              </label>
              <select
                {...register("listing_type")}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
                <option value="lease">For Lease</option>
              </select>
              {errors.listing_type ? (
                <p className="text-xs text-red-600">{errors.listing_type.message}</p>
              ) : null}
            </div>

            <div className="w-full sm:w-[200px]">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Listing Status
              </label>
              <select
                {...register("listing_status")}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="available">Available</option>
                <option value="active">Active</option>
                <option value="sold">Sold</option>
                <option value="pending">Pending</option>
              </select>
              {errors.listing_status ? (
                <p className="text-xs text-red-600">{errors.listing_status.message}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="w-full sm:w-[260px]">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Property Type
              </label>
              <select
                {...register("property_type_id")}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value={0}>Select property type</option>
                {(propertyTypesQuery.data ?? []).map((propertyType) => (
                  <option
                    key={propertyType.property_type_id}
                    value={propertyType.property_type_id}
                  >
                    {propertyType.name}
                  </option>
                ))}
              </select>
              {errors.property_type_id ? (
                <p className="text-xs text-red-600">
                  {errors.property_type_id.message}
                </p>
              ) : null}
            </div>

            <div className="w-full sm:w-[260px]">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Location
              </label>
              <select
                {...register("location_id")}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value={0}>Select location</option>
                {(locationsQuery.data ?? []).map((location) => (
                  <option key={location.location_id} value={location.location_id}>
                    {[location.neighborhood, location.city, location.state]
                      .filter(Boolean)
                      .join(", ")}
                  </option>
                ))}
              </select>
              {errors.location_id ? (
                <p className="text-xs text-red-600">{errors.location_id.message}</p>
              ) : null}
            </div>
          </div>

          {children}

          {errors.root ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
              {errors.root.message}
            </p>
          ) : null}

          <div className="flex gap-3">
            {secondaryActionLabel && onSecondaryAction ? (
              <Button
                type="button"
                variant="secondary"
                onClick={onSecondaryAction}
              >
                {secondaryActionLabel}
              </Button>
            ) : null}
            <Button type="submit" loading={isSubmitting || submitting}>
              {submitLabel}
            </Button>
          </div>
        </form>
  );

  if (variant === "plain") {
    return form;
  }

  return (
    <Card className="mx-auto w-full max-w-[800px]">
      <CardHeader>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          ) : null}
        </div>
      </CardHeader>
      <CardBody>{form}</CardBody>
    </Card>
  );
}
