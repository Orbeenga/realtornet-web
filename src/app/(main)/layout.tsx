"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoadingState } from "@/components";
import { useAuth } from "@/features/auth/AuthContext";
import { Navbar } from "@/components/Navbar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isProtectedRoute = pathname.startsWith("/account");

  useEffect(() => {
    if (isProtectedRoute && !loading && !user) {
      router.replace("/login");
    }
  }, [isProtectedRoute, loading, router, user]);

  if (isProtectedRoute && loading) {
    return <LoadingState fullPage />;
  }

  if (isProtectedRoute && !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
