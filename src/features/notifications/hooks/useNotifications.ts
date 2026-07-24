"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface NotificationItem {
  notification_id: number;
  user_id: number;
  event_type: string;
  listing_id: number | null;
  body_text: string;
  is_read: boolean;
  created_at: string;
}

interface UnreadCountResponse {
  count: number;
}

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: ["notifications", "unreadCount"],
    queryFn: async () => {
      const data = await apiClient<UnreadCountResponse>(
        "/api/v1/notifications/unread-count",
      );
      return data.count;
    },
    enabled,
    refetchInterval: 60_000,
  });
}

export function useNotificationList(enabled = true) {
  return useQuery({
    queryKey: ["notifications", "list"],
    queryFn: async () => {
      return apiClient<NotificationItem[]>("/api/v1/notifications/", {
        method: "GET",
      });
    },
    enabled,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number) => {
      return apiClient<NotificationItem>(
        `/api/v1/notifications/${notificationId}/read`,
        { method: "PATCH" },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient<{ updated: number }>(
        "/api/v1/notifications/read-all",
        { method: "PATCH" },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });
}

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export { timeAgo };
