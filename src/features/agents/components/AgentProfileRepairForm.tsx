"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, Card, CardBody, CardFooter, CardHeader } from "@/components";
import { Input } from "@/components/Input";
import { useUpdateUserMe } from "@/features/profile/hooks";
import { useUpdateAgentProfile } from "@/features/agents/hooks";
import {
  buildAgentProfileRepairPayload,
  buildUserMeRepairPayload,
} from "@/features/agents/lib/profile-completeness";
import { ApiError } from "@/lib/api/client";
import { notify } from "@/lib/toast";
import type { Agent, UserProfile } from "@/types";

interface RepairFormValues {
  first_name: string;
  last_name: string;
  phone_number: string;
  company_name: string;
  specialization: string;
}

const SERVER_ERROR_FIELDS: ReadonlyArray<keyof RepairFormValues> = [
  "first_name",
  "last_name",
  "phone_number",
  "company_name",
  "specialization",
];

function buildDefaults(user: UserProfile, agentProfile: Agent | null): RepairFormValues {
  return {
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    phone_number: user.phone_number ?? "",
    company_name: agentProfile?.company_name ?? "",
    specialization: agentProfile?.specialization ?? "",
  };
}

/**
 * B3 repair form (agent-only): edits the three completeness inputs the
 * submit-for-review gate reads — display name + phone via PUT /users/me,
 * company/specialization via PUT /agent-profiles/{id}. Only the dirty side
 * is sent; the B3 prompt clears on the next signal refetch.
 */
export function AgentProfileRepairForm({
  user,
  agentProfile,
}: {
  user: UserProfile;
  agentProfile: Agent | null;
}) {
  const updateUserMe = useUpdateUserMe();
  const updateAgentProfile = useUpdateAgentProfile();
  const form = useForm<RepairFormValues>({
    defaultValues: buildDefaults(user, agentProfile),
  });

  useEffect(() => {
    form.reset(buildDefaults(user, agentProfile));
  }, [form, user, agentProfile]);

  const handleSave = form.handleSubmit(async (values) => {
    const dirty = form.formState.dirtyFields;
    const userDirty = Boolean(dirty.first_name || dirty.last_name || dirty.phone_number);
    const profileDirty =
      agentProfile != null && Boolean(dirty.company_name || dirty.specialization);

    try {
      if (userDirty) {
        await updateUserMe.mutateAsync(buildUserMeRepairPayload(values));
      }
      if (profileDirty && agentProfile != null) {
        await updateAgentProfile.mutateAsync({
          profileId: agentProfile.profile_id,
          payload: buildAgentProfileRepairPayload(values),
        });
      }
      notify.success("Profile updated");
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        let mapped = false;
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (
            SERVER_ERROR_FIELDS.includes(field as keyof RepairFormValues) &&
            messages.length > 0
          ) {
            form.setError(field as keyof RepairFormValues, { message: messages[0] });
            mapped = true;
          }
        }
        if (mapped) {
          return;
        }
      }
      const detail = error instanceof ApiError ? error.detail : null;
      notify.error(typeof detail === "string" ? detail : "Could not update profile");
    }
  });

  const saving = updateUserMe.isPending || updateAgentProfile.isPending;
  const companyOrSpecializationRule = (
    value: string,
    formValues: RepairFormValues,
    self: "company_name" | "specialization",
  ) => {
    if (value.trim() !== "") {
      return true;
    }
    const other = self === "company_name" ? formValues.specialization : formValues.company_name;
    return other.trim() !== "" || "Enter a company name or a specialization.";
  };

  return (
    <Card>
      <form onSubmit={handleSave} noValidate>
        <CardHeader>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Complete your profile
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your display name, phone number, and company or specialization unblock
              submitting listings for review.
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="First name"
              placeholder="Your first name"
              autoComplete="given-name"
              error={form.formState.errors.first_name?.message}
              {...form.register("first_name", {
                validate: (value) =>
                  value.trim() !== "" || "First name is required",
              })}
            />
            <Input
              label="Last name"
              placeholder="Your last name"
              autoComplete="family-name"
              error={form.formState.errors.last_name?.message}
              {...form.register("last_name", {
                validate: (value) =>
                  value.trim() !== "" || "Last name is required",
              })}
            />
          </div>
          <Input
            label="Phone number"
            placeholder="+234 800 000 0000"
            autoComplete="tel"
            error={form.formState.errors.phone_number?.message}
            {...form.register("phone_number")}
          />
          {agentProfile != null ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Company name"
                placeholder="Your agency or company"
                autoComplete="organization"
                error={form.formState.errors.company_name?.message}
                {...form.register("company_name", {
                  validate: (value, formValues) =>
                    companyOrSpecializationRule(value, formValues, "company_name"),
                })}
              />
              <Input
                label="Specialization"
                placeholder="e.g. Residential sales"
                error={form.formState.errors.specialization?.message}
                {...form.register("specialization", {
                  validate: (value, formValues) =>
                    companyOrSpecializationRule(value, formValues, "specialization"),
                })}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Company and specialization are unavailable because this account has no
              agent profile yet.
            </p>
          )}
        </CardBody>
        <CardFooter className="flex justify-end">
          <Button type="submit" loading={saving} disabled={!form.formState.isDirty}>
            Save profile
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
