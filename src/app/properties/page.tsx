"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { useProperties } from "@/features/properties/hooks";

export default function PropertiesPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const {
    data,
    isLoading,
    isError,
    error,
  } = useProperties({ page: 1, page_size: 5 });

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <main className="max-w-2xl p-8">
      <h1 className="mb-2 text-xl font-bold">Properties - D.3 smoke test</h1>
      <p className="mb-6 text-sm text-gray-500">Logged in as: {user?.email}</p>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading properties...</p>
      ) : null}

      {isError ? (
        <p className="text-sm text-red-600">
          Error: {error instanceof Error ? error.message : "Unknown error"}
        </p>
      ) : null}

      {data ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-green-700">
            Hook returned data successfully.
          </p>
          <pre className="overflow-auto rounded bg-gray-50 p-4 text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      ) : null}

      <button
        onClick={handleSignOut}
        className="mt-8 rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
      >
        Sign out
      </button>
    </main>
  );
}
