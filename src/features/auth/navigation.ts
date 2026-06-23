"use client";

export type AppRole = "seeker" | "agent" | "agency_owner" | "admin";
export type InquiryAccountMode = "sent" | "received" | "admin";

interface InquiryNavigationConfig {
  mode: InquiryAccountMode;
  navLabel: string;
  canSendInquiry: boolean;
}

interface FavoritesPageCopy {
  savedTitle: string;
  savedDescription: string;
  emptyTitle: string;
  emptyDescription: string;
}

export const publicNavLinks = [
  { href: "/properties", label: "Properties" },
  { href: "/agencies", label: "Agencies" },
  { href: "/agents", label: "Agents" },
] as const;

export const authNavLinks = [
  { href: "/login", label: "Login" },
  { href: "/register", label: "Register" },
] as const;

export function normalizeAppRole(role: string | null | undefined): AppRole | null {
  if (role === "buyer") {
    return "seeker";
  }

  if (
    role === "seeker" ||
    role === "agent" ||
    role === "agency_owner" ||
    role === "admin"
  ) {
    return role;
  }

  return null;
}

export function getPostLoginPath(role: string | null | undefined) {
  const normalizedRole = normalizeAppRole(role);

  if (normalizedRole === "agency_owner") {
    return "/account/agency";
  }

  if (normalizedRole === "admin") {
    return "/account/admin/properties";
  }

  if (normalizedRole === "agent") {
    return "/account/listings";
  }

  return "/properties";
}

export function getInquiryNavigationConfig(
  role: string | null | undefined,
): InquiryNavigationConfig {
  const normalizedRole = normalizeAppRole(role);

  if (normalizedRole === "agent" || normalizedRole === "agency_owner") {
    return {
      mode: "received",
      navLabel: "My Inquiries",
      canSendInquiry: false,
    };
  }

  if (normalizedRole === "admin") {
    return {
      mode: "admin",
      navLabel: "Inquiries",
      canSendInquiry: false,
    };
  }

  return {
    mode: "sent",
    navLabel: "My Inquiries",
    canSendInquiry: normalizedRole === "seeker",
  };
}

export function getAccountDropdownLinks(role: string | null | undefined) {
  const normalizedRole = normalizeAppRole(role);
  const inquiryConfig = getInquiryNavigationConfig(normalizedRole);
  const settingsLink = { href: "/account/profile", label: "Settings" };

  if (normalizedRole === "admin") {
    return [
      { href: "/account/admin/properties", label: "Property Moderation" },
      { href: "/account/admin/agencies", label: "Agencies" },
      { href: "/account/users", label: "User Management" },
      { href: "/account/admin/analytics", label: "Analytics" },
      settingsLink,
    ];
  }

  if (normalizedRole === "agency_owner") {
    return [
      { href: "/account/listings", label: "My Listings" },
      { href: "/account/stats", label: "My Stats" },
      { href: "/account/agency", label: "Agency Dashboard" },
      { href: "/account/agency/members", label: "Agency Members" },
      { href: "/account/inquiries", label: inquiryConfig.navLabel },
      { href: "/account/favorites", label: "My Favorites" },
      { href: "/account/reviews", label: "My Reviews" },
      settingsLink,
    ];
  }

  if (normalizedRole === "agent") {
    return [
      { href: "/account/listings", label: "My Listings" },
      { href: "/account/stats", label: "My Stats" },
      { href: "/account/join-requests", label: "My Agencies" },
      { href: "/account/inquiries", label: inquiryConfig.navLabel },
      { href: "/account/favorites", label: "My Favorites" },
      { href: "/account/reviews", label: "My Reviews" },
      settingsLink,
    ];
  }

  if (normalizedRole === "seeker") {
    return [
      { href: "/account/favorites", label: "My Favorites" },
      { href: "/account/saved-searches", label: "Saved Searches" },
      { href: "/account/inquiries", label: inquiryConfig.navLabel },
      { href: "/account/reviews", label: "My Reviews" },
      { href: "/account/join-requests", label: "Join Requests" },
      settingsLink,
    ];
  }

  return [];
}

/** @deprecated Use publicNavLinks + getAccountDropdownLinks for navigation UI. */
export function getRoleNavLinks(role: string | null | undefined) {
  const normalizedRole = normalizeAppRole(role);

  return [...publicNavLinks, ...getAccountDropdownLinks(normalizedRole)];
}

export function getFavoritesPageCopy(
  role: string | null | undefined,
): FavoritesPageCopy {
  const normalizedRole = normalizeAppRole(role);

  if (normalizedRole === "agent" || normalizedRole === "agency_owner") {
    return {
      savedTitle: "Saved listings",
      savedDescription: "Keep track of listings you want to revisit or share later.",
      emptyTitle: "You haven't saved any listings yet",
      emptyDescription:
        "Browse listings and use the heart button to keep the ones you want to revisit.",
    };
  }

  return {
    savedTitle: "Saved properties",
    savedDescription:
      "Your saved listings stay here. Use the heart button on any card to remove it.",
    emptyTitle: "You haven't saved any properties yet",
    emptyDescription:
      "Browse listings and tap the heart icon to save properties here.",
  };
}
