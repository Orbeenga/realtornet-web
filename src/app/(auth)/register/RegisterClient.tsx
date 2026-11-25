"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/features/auth/AuthContext";
import { getPostSignupPath } from "@/features/auth/navigation";
import { useAcceptAgencyInvite } from "@/features/agencies/hooks";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/features/auth/schemas";

export default function RegisterClient() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const { signUp, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const emailParam = searchParams.get("email") ?? "";
  const inviteToken = searchParams.get("invite_token");
  const probeInvite = useAcceptAgencyInvite();
  const probeFiredRef = useRef(false);

  /* Invite-token probe (register-loop repair): resolve the token BEFORE
     signup — the endpoint is unauthenticated. registration_required yields
     the invite email for a locked prefill; accepted means the account
     appeared meanwhile (route to sign-in); 400 means the link is dead. */
  useEffect(() => {
    if (!inviteToken || loading || user || probeFiredRef.current) {
      return;
    }
    probeFiredRef.current = true;
    void probeInvite.mutateAsync({ invite_token: inviteToken });
  }, [inviteToken, loading, probeInvite, user]);

  const inviteEmail =
    probeInvite.data?.status === "registration_required"
      ? (probeInvite.data.email ?? null)
      : null;
  const inviteAccepted = probeInvite.data?.status === "accepted";
  const inviteInvalid = probeInvite.isError;
  const inviteSettled = probeInvite.isSuccess || probeInvite.isError;

  useEffect(() => {
    if (!loading && user) {
      router.push(getPostSignupPath({ inviteToken, role: user.user_role }));
    }
  }, [inviteToken, loading, router, user]);

  useEffect(() => {
    if (inviteToken && !user && inviteAccepted) {
      router.push(
        `/login?next=${encodeURIComponent(`/agencies/accept-invite?token=${inviteToken}`)}`,
      );
    }
  }, [inviteAccepted, inviteToken, router, user]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      user_role: "buyer",
      email: inviteToken ? "" : emailParam,
    },
  });

  useEffect(() => {
    if (inviteEmail) {
      setValue("email", inviteEmail, { shouldValidate: true });
    }
  }, [inviteEmail, setValue]);

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      setServerError(null);
      await signUp({
        email: values.email,
        password: values.password,
        firstName: values.first_name,
        lastName: values.last_name,
        role: values.user_role,
      });
    } catch (err: unknown) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.",
      );
    }
  };

  const tokenBlocking = inviteToken != null && (!inviteSettled || inviteAccepted);

  if (inviteToken && inviteInvalid) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Invite link invalid or expired</h1>
          <p className="mb-8 text-sm text-gray-500">
            This invite link is invalid or has expired. Ask the agency owner for a
            fresh invite, or continue with a regular signup.
          </p>
          <Link
            href="/register"
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Continue to regular signup
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Link
        href="/"
        className="absolute left-6 top-6 text-lg font-bold text-gray-950 transition-colors hover:text-blue-600"
      >
        RealtorNet
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Create account</h1>
        <p className="mb-8 text-sm text-gray-500">
          {emailParam && !inviteToken
            ? "Use the approved owner email to claim your agency workspace. "
            : null}
          {inviteToken && !inviteInvalid
            ? "Create your account to accept the agency invitation. "
            : null}
          Already registered?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              First name
            </label>
            <input
              type="text"
              {...register("first_name")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="First name"
            />
            {errors.first_name ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.first_name.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Last name
            </label>
            <input
              type="text"
              {...register("last_name")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Last name"
            />
            {errors.last_name ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.last_name.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              {...register("email")}
              readOnly={inviteEmail != null}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
              placeholder="you@example.com"
            />
            {inviteEmail ? (
              <p className="mt-1 text-xs text-gray-500">
                Locked to the invitation address.
              </p>
            ) : null}
            {errors.email ? (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              {...register("password")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="********"
            />
            {errors.password ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <input type="hidden" {...register("user_role")} value="buyer" />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Confirm password
            </label>
            <input
              type="password"
              {...register("confirmPassword")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="********"
            />
            {errors.confirmPassword ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.confirmPassword.message}
              </p>
            ) : null}
          </div>

          {serverError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {serverError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || tokenBlocking}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting
              ? "Creating account..."
              : tokenBlocking
                ? "Verifying invite..."
                : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
