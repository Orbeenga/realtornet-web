"use client";

import { requestToasterMount } from "@/components/DeferredToaster";

type ToastLevel = "success" | "error" | "info";

function dispatchToast(level: ToastLevel, message: string) {
  requestToasterMount();

  void import("sonner").then(({ toast }) => {
    switch (level) {
      case "success":
        toast.success(message);
        break;
      case "error":
        toast.error(message);
        break;
      case "info":
        toast(message);
        break;
      default:
        break;
    }
  });
}

export const toast = {
  success: (message: string) => dispatchToast("success", message),
  error: (message: string) => dispatchToast("error", message),
  info: (message: string) => dispatchToast("info", message),
};

export function useToast() {
  return { toast };
}
