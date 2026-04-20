"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function ToastIcon({
  children,
  className = "size-4",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      icons={{
        success: (
          <ToastIcon>
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
            <circle cx="12" cy="12" r="9" />
          </ToastIcon>
        ),
        info: (
          <ToastIcon>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h.01" />
          </ToastIcon>
        ),
        warning: (
          <ToastIcon>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.29 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
          </ToastIcon>
        ),
        error: (
          <ToastIcon>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.86 2.58h2.28a2 2 0 0 1 1.41.58l6.29 6.29a2 2 0 0 1 .58 1.41v2.28a2 2 0 0 1-.58 1.41l-6.29 6.29a2 2 0 0 1-1.41.58h-2.28a2 2 0 0 1-1.41-.58l-6.29-6.29a2 2 0 0 1-.58-1.41v-2.28a2 2 0 0 1 .58-1.41l6.29-6.29a2 2 0 0 1 1.41-.58Z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 6 6" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m15 9-6 6" />
          </ToastIcon>
        ),
        loading: (
          <ToastIcon className="size-4 animate-spin">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a9 9 0 1 1-2.64-6.36"
            />
          </ToastIcon>
        ),
      }}
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
