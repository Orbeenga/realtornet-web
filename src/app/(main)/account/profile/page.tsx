"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  ErrorState,
  LoadingState,
} from "@/components";
import { Input } from "@/components/Input";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  useDeleteMyAvatar,
  useMyProfile,
  useUploadMyAvatar,
  useUpsertMyProfile,
} from "@/features/profile/hooks";
import { notify } from "@/lib/toast";

interface ProfileFormValues {
  full_name: string;
  phone_number: string;
  bio: string;
}

function buildDefaultValues(input: {
  profile: ReturnType<typeof useMyProfile>["data"];
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
}): ProfileFormValues {
  const fallbackFullName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();

  return {
    full_name: input.profile?.full_name ?? fallbackFullName,
    phone_number: input.profile?.phone_number ?? input.phoneNumber ?? "",
    bio: input.profile?.bio ?? "",
  };
}

export default function AccountProfilePage() {
  const userQuery = useUserProfile();
  const profileQuery = useMyProfile(Boolean(userQuery.data));
  const upsertProfile = useUpsertMyProfile();
  const uploadAvatar = useUploadMyAvatar();
  const deleteAvatar = useDeleteMyAvatar();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<ProfileFormValues>({
    defaultValues: {
      full_name: "",
      phone_number: "",
      bio: "",
    },
  });

  useEffect(() => {
    if (!userQuery.data || profileQuery.isLoading) {
      return;
    }

    form.reset(
      buildDefaultValues({
        profile: profileQuery.data,
        firstName: userQuery.data.first_name,
        lastName: userQuery.data.last_name,
        phoneNumber: userQuery.data.phone_number,
      }),
    );
  }, [form, profileQuery.data, profileQuery.isLoading, userQuery.data]);

  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const avatarUrl = useMemo(
    () => previewUrl ?? profileQuery.data?.profile_picture ?? userQuery.data?.profile_image_url ?? null,
    [previewUrl, profileQuery.data?.profile_picture, userQuery.data?.profile_image_url],
  );

  if (userQuery.isLoading || profileQuery.isLoading) {
    return <LoadingState fullPage message="Loading your profile..." />;
  }

  if (userQuery.isError || !userQuery.data || profileQuery.isError) {
    return (
      <ErrorState
        title="Could not load your profile"
        message="There was a problem loading your account profile. Please try again."
        onRetry={() => {
          void userQuery.refetch();
          void profileQuery.refetch();
        }}
      />
    );
  }

  const handleSave = form.handleSubmit(async (values) => {
    try {
      await upsertProfile.mutateAsync({
        payload: {
          full_name: values.full_name.trim(),
          phone_number: values.phone_number.trim() || null,
          bio: values.bio.trim() || null,
        },
        hasExistingProfile: Boolean(profileQuery.data),
      });
      notify.success("Profile updated");
    } catch {
      notify.error("Could not update profile");
    }
  });

  const handleUploadAvatar = async () => {
    if (!selectedFile) {
      notify.error("Choose an image before uploading");
      return;
    }

    try {
      await uploadAvatar.mutateAsync(selectedFile);
      setSelectedFile(null);
      notify.success("Profile photo updated");
    } catch {
      notify.error("Could not upload profile photo");
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      await deleteAvatar.mutateAsync();
      setSelectedFile(null);
      notify.success("Profile photo removed");
    } catch {
      notify.error("Could not remove profile photo");
    }
  };

  return (
    <div className="mx-auto max-w-[800px] space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Account profile
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage the public details attached to your account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Profile picture
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload a profile photo so other users can recognize your account.
            </p>
          </div>
        </CardHeader>
        <CardBody className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-sm font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-300">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Profile avatar preview" className="h-full w-full object-cover" />
            ) : (
              <span>
                {userQuery.data.first_name?.[0]}
                {userQuery.data.last_name?.[0]}
              </span>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <Input
              type="file"
              id="profile-avatar"
              label="Profile picture"
              accept="image/*"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              hint="PNG or JPG recommended."
            />
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => void handleUploadAvatar()}
                loading={uploadAvatar.isPending}
                disabled={!selectedFile}
              >
                Upload photo
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleDeleteAvatar()}
                loading={deleteAvatar.isPending}
                disabled={!profileQuery.data?.profile_picture && !userQuery.data.profile_image_url}
              >
                Remove photo
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <form onSubmit={handleSave} noValidate>
          <CardHeader>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Personal details
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Update your display name, phone number, and bio.
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Full name"
                placeholder="Your full name"
                autoComplete="name"
                error={form.formState.errors.full_name?.message}
                {...form.register("full_name", {
                  required: "Full name is required",
                })}
              />
              <Input
                label="Phone number"
                placeholder="+234 800 000 0000"
                autoComplete="tel"
                error={form.formState.errors.phone_number?.message}
                {...form.register("phone_number")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="bio"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Bio / description
              </label>
              <textarea
                id="bio"
                rows={6}
                placeholder="Tell people a little about yourself."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                {...form.register("bio")}
              />
            </div>

            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:bg-gray-950/40 dark:text-gray-400">
              <p>Email</p>
              <p className="font-medium text-gray-900 dark:text-white">{userQuery.data.email}</p>
            </div>
          </CardBody>
          <CardFooter className="flex justify-end">
            <Button type="submit" loading={upsertProfile.isPending}>
              Save profile
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
