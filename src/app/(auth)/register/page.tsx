"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/features/auth/AuthContext";
import { getPostLoginPath } from "@/features/auth/navigation";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/features/auth/schemas";

export default function RegisterPage() {
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

  useEffect(() => {
    if (!loading && user) {
      router.push(getPostLoginPath(user.user_role));
    }
  }, [loading, router, user]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      user_role: "buyer",
      email: emailParam,
    },
  });

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
          {emailParam
            ? "Use the approved owner email to claim your agency workspace. "
            : null}
          Already registered?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-5"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              First name
            </label>
            <input
              type="text"
              {...register("first_name")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Apine"
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
              placeholder="Orbeenga"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="you@example.com"
            />
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
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
