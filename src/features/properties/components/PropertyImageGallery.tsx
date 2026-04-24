"use client";

import { useState } from "react";
import type { PropertyImage } from "@/types";
import { Badge, Button } from "@/components";
import { cn } from "@/lib/utils";

interface PropertyImageGalleryProps {
  title: string;
  images: PropertyImage[];
  isFavorited?: boolean;
  favoritePending?: boolean;
  onToggleFavorite?: () => void;
  showFavoriteButton?: boolean;
}

export function PropertyImageGallery({
  title,
  images,
  isFavorited = false,
  favoritePending = false,
  onToggleFavorite,
  showFavoriteButton = false,
}: PropertyImageGalleryProps) {
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);

  const defaultImage =
    images.find((image) => image.is_primary) ?? images[0] ?? null;

  const selectedImage =
    images.find((image) => image.image_id === selectedImageId) ?? defaultImage;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl">
        <div className="relative aspect-[16/9] bg-gray-100 dark:bg-gray-900">
          {selectedImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImage.image_url}
                alt={selectedImage.caption ?? title}
                className="h-full w-full object-cover"
              />
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-gray-500 dark:text-gray-400">
              <svg
                className="h-12 w-12 text-gray-300 dark:text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M2.25 15l5.159-5.159a2.25 2.25 0 013.182 0L15 14.25l1.909-1.909a2.25 2.25 0 013.182 0L21.75 14M4.5 19.5h15A2.25 2.25 0 0021.75 17.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  No photos available
                </p>
                <p className="text-sm">Images will appear here when uploaded.</p>
              </div>
            </div>
          )}

          {showFavoriteButton && onToggleFavorite ? (
            <Button
              type="button"
              variant={isFavorited ? "destructive" : "secondary"}
              size="sm"
              loading={favoritePending}
              onClick={onToggleFavorite}
              className="absolute right-4 top-4"
            >
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4"
                  fill={isFavorited ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                  />
                </svg>
                {isFavorited ? "Saved listing" : "Save listing"}
              </span>
            </Button>
          ) : null}
        </div>
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image) => (
            <button
              key={image.image_id}
              type="button"
              onClick={() => setSelectedImageId(image.image_id)}
              className={cn(
                "overflow-hidden rounded-xl border bg-white text-left transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-gray-900",
                image.image_id === selectedImage?.image_id
                  ? "border-blue-500 ring-2 ring-blue-500/30"
                  : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700",
              )}
            >
              <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800">
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.image_url}
                    alt={image.caption ?? title}
                    className="h-full w-full object-cover"
                  />
                </>
              </div>
              <div className="flex items-center justify-between gap-2 p-2">
                <p className="line-clamp-1 text-xs text-gray-600 dark:text-gray-300">
                  {image.caption ?? "Property image"}
                </p>
                {image.is_primary ? <Badge variant="outline">Primary</Badge> : null}
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
