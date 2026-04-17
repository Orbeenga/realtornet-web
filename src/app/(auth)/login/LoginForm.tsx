"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/features/auth/AuthContext";
import { getPostLoginPath } from "@/features/auth/navigation";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas";

export default function LoginForm() {
  const { signIn, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.push(getPostLoginPath(user.user_role));
    }
  }, [loading, router, user]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setServerError(null);
      await signIn(values.email, values.password);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
          Welcome Back
        </p>
        <h1 className="mb-2 text-4xl font-bold tracking-tight text-gray-900">
          Sign in to manage your search
        </h1>
        <p className="mb-8 text-sm text-gray-500">
          Access saved searches, favorites, inquiries, and listing tools from one
          dashboard.
        </p>
        {searchParams.get("registered") === "true" ? (
          <p className="mb-5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Account created. Sign in to continue.
          </p>
        ) : null}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              aria-invalid={errors.email ? "true" : "false"}
              aria-describedby={errors.email ? "email-error" : undefined}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="you@example.com"
              autoComplete="email"
            />
            {errors.email ? (
              <p id="email-error" className="mt-1 text-xs text-red-600" role="alert">
                {errors.email.message}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register("password")}
              aria-invalid={errors.password ? "true" : "false"}
              aria-describedby={errors.password ? "password-error" : undefined}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="********"
              autoComplete="current-password"
            />
            {errors.password ? (
              <p id="password-error" className="mt-1 text-xs text-red-600" role="alert">
                {errors.password.message}
              </p>
            ) : null}
          </div>
          {serverError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
              {serverError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-sm text-gray-500">
          New here?{" "}
          <Link href="/register" className="font-medium text-blue-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
