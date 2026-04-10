import { Spinner } from "./Spinner";

interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
}

export function LoadingState({
  message = "Loading...",
  fullPage,
}: LoadingStateProps) {
  if (fullPage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Spinner size="md" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
