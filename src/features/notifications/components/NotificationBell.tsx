"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/features/auth/AuthContext";
import {
  useUnreadCount,
  useNotificationList,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  timeAgo,
  type NotificationItem,
} from "@/features/notifications/hooks/useNotifications";

function notificationLink(item: NotificationItem): string {
  if (item.listing_id) {
    return `/account/properties`;
  }
  return "/account/properties";
}

function NotificationRow({
  item,
  onRead,
}: {
  item: NotificationItem;
  onRead: (id: number) => void;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (!item.is_read) {
      onRead(item.notification_id);
    }
    router.push(notificationLink(item));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
        item.is_read ? "" : "bg-blue-50 dark:bg-blue-950/30"
      }`}
    >
      <p className="text-gray-900 dark:text-white">{item.body_text}</p>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        {timeAgo(item.created_at)}
      </p>
    </button>
  );
}

export function NotificationBell() {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  const unreadQuery = useUnreadCount(isLoggedIn);
  const listQuery = useNotificationList(isLoggedIn);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = unreadQuery.data ?? 0;
  const notifications = listQuery.data ?? [];
  const hasUnread = unreadCount > 0;

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  const handleMarkRead = (id: number) => {
    markRead.mutate(id);
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
        <Bell className="h-5 w-5" />
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Notifications
          </h3>
          {hasUnread && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              You&apos;re up to date.
            </div>
          ) : (
            notifications.map((item) => (
              <NotificationRow
                key={item.notification_id}
                item={item}
                onRead={handleMarkRead}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
