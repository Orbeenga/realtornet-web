"use client";

import { useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { notify } from "@/lib/toast";
import { Button, Card, CardBody, CardHeader } from "@/components";
import {
  useDeletePropertyImage,
  usePropertyImages,
  useReorderPropertyImages,
  useSetPrimaryImage,
  useUploadPropertyImage,
} from "@/features/properties/hooks/usePropertyImages";
import type { PropertyImage } from "@/types";
import { cn } from "@/lib/utils";

interface PropertyImageManagerProps {
  propertyId: number;
  variant?: "card" | "plain";
}

export function PropertyImageManager({
  propertyId,
  variant = "card",
}: PropertyImageManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const { data: images = [], isLoading, isError, refetch } = usePropertyImages(propertyId);
  const uploadMutation = useUploadPropertyImage(propertyId);
  const deleteMutation = useDeletePropertyImage(propertyId);
  const setPrimaryMutation = useSetPrimaryImage(propertyId);
  const reorderMutation = useReorderPropertyImages(propertyId);

  const handleUploadError = (error: unknown) => {
    if (error instanceof ApiError && typeof error.detail === "string") {
      notify.error(error.detail);
      return;
    }

    notify.error("Could not upload image");
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (imageFiles.length === 0) {
      notify.error("Select valid image files to upload");
      return;
    }

    try {
      await Promise.all(
        imageFiles.map((file, index) =>
          uploadMutation.mutateAsync({
            file,
            isPrimary: images.length === 0 && index === 0,
          }),
        ),
      );
      notify.success(
        imageFiles.length === 1 ? "Image uploaded" : "Images uploaded",
      );
    } catch (error) {
      handleUploadError(error);
    }
  };

  const handleDelete = async (imageId: number) => {
    try {
      await deleteMutation.mutateAsync(imageId);
      notify.success("Image deleted");
    } catch (error) {
      if (error instanceof ApiError && typeof error.detail === "string") {
        notify.error(error.detail);
        return;
      }

      notify.error("Could not delete image");
    }
  };

  const handleSetPrimary = async (imageId: number) => {
    try {
      await setPrimaryMutation.mutateAsync(imageId);
      notify.success("Primary image updated");
    } catch (error) {
      if (error instanceof ApiError && typeof error.detail === "string") {
        notify.error(error.detail);
        return;
      }

      notify.error("Could not set primary image");
    }
  };

  const handleReorder = async (targetId: number) => {
    if (draggingId === null || draggingId === targetId) {
      setDraggingId(null);
      return;
    }

    const ids = images.map((image) => image.image_id);
    const sourceIndex = ids.indexOf(draggingId);
    const targetIndex = ids.indexOf(targetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggingId(null);
      return;
    }

    const reorderedIds = [...ids];
    reorderedIds.splice(sourceIndex, 1);
    reorderedIds.splice(targetIndex, 0, draggingId);

    try {
      await reorderMutation.mutateAsync(reorderedIds);
      notify.success("Image order updated");
    } catch (error) {
      if (error instanceof ApiError && typeof error.detail === "string") {
        notify.error(error.detail);
      } else {
        notify.error("Could not reorder images");
      }
    } finally {
      setDraggingId(null);
    }
  };

  if (isError) {
    const errorContent = (
      <div className="space-y-3">
        <p className="text-sm text-red-600 dark:text-red-300">
          We could not load this listing&apos;s images right now.
        </p>
        <Button type="button" variant="secondary" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );

    if (variant === "plain") {
      return (
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Listing images
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload, reorder, and choose the main photo for this listing.
            </p>
          </div>
          {errorContent}
        </section>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Listing images
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload, reorder, and choose the main photo for this listing.
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">{errorContent}</CardBody>
      </Card>
    );
  }

  const content = (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Listing images
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Upload photos, drag to reorder them, and choose which image appears first.
        </p>
      </div>
      <div className="mx-auto flex w-full max-w-[480px] flex-col items-start gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void handleFiles(event.dataTransfer.files);
          }}
          className={cn(
            "flex h-[120px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 text-center transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            dragOver
              ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/20"
              : "border-gray-300 hover:border-blue-400 dark:border-gray-700",
          )}
        >
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {uploadMutation.isPending ? "Uploading images..." : "Drag images here or click to upload"}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            PNG, JPG, and WEBP supported. You can add multiple files at once.
          </p>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />

        <div className="mx-auto flex w-full max-w-[480px] flex-col items-start gap-4">
          {isLoading ? (
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-video animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
                />
              ))}
            </div>
          ) : images.length > 0 ? (
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((image, index) => (
                <ImageTile
                  key={image.image_id}
                  image={image}
                  position={index + 1}
                  dragging={draggingId === image.image_id}
                  busy={
                    deleteMutation.isPending ||
                    setPrimaryMutation.isPending ||
                    reorderMutation.isPending
                  }
                  onDelete={() => void handleDelete(image.image_id)}
                  onSetPrimary={() => void handleSetPrimary(image.image_id)}
                  onDragStart={() => setDraggingId(image.image_id)}
                  onDragEnd={() => setDraggingId(null)}
                  onDrop={() => void handleReorder(image.image_id)}
                />
              ))}
            </div>
          ) : (
            <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-left dark:border-gray-800 dark:bg-gray-900/60">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                No images uploaded yet
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Add at least one image so this listing has a visible gallery.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (variant === "plain") {
    return <section>{content}</section>;
  }

  return (
    <Card>
      <CardBody>{content}</CardBody>
    </Card>
  );
}

interface ImageTileProps {
  image: PropertyImage;
  position: number;
  dragging: boolean;
  busy: boolean;
  onDelete: () => void;
  onSetPrimary: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}

function ImageTile({
  image,
  position,
  dragging,
  busy,
  onDelete,
  onSetPrimary,
  onDragStart,
  onDragEnd,
  onDrop,
}: ImageTileProps) {
  return (
    <div
      draggable={!busy}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      className={cn(
        "group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition dark:border-gray-800 dark:bg-gray-900",
        !busy && "cursor-grab active:cursor-grabbing",
        dragging && "scale-[0.98] opacity-70",
      )}
    >
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.image_url}
          alt={image.caption ?? "Property image"}
          className="h-full w-full object-cover"
        />

        {image.is_primary ? (
          <span className="absolute left-3 top-3 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
            Primary
          </span>
        ) : null}
      </div>

      <div className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {`Image ${position}`}
            </p>
            {image.caption ? (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {image.caption}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Drag to change display order
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!image.is_primary ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={busy}
              onClick={onSetPrimary}
            >
              Set primary
            </Button>
          ) : null}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            loading={busy}
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
