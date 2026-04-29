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

  if (normalizedRole === "agent" || normalizedRole === "admin") {
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
      navLabel: "Inquiries",
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

export function getRoleNavLinks(role: string | null | undefined) {
  const normalizedRole = normalizeAppRole(role);
  const inquiryConfig = getInquiryNavigationConfig(normalizedRole);

  if (normalizedRole === "admin") {
    return [
      { href: "/properties", label: "Properties" },
      { href: "/agencies", label: "Agencies" },
      { href: "/account/listings", label: "Property moderation" },
      { href: "/account/users", label: "Users" },
      { href: "/account/inquiries", label: inquiryConfig.navLabel },
      { href: "/account/admin/agencies", label: "Agencies admin" },
      { href: "/account/admin/analytics", label: "Analytics" },
    ];
  }

  if (normalizedRole === "agency_owner") {
    return [
      { href: "/agencies", label: "Agencies" },
      { href: "/properties", label: "Properties" },
      { href: "/account/listings", label: "My Listings" },
      { href: "/account/inquiries", label: inquiryConfig.navLabel },
      { href: "/account/favorites", label: "Favorites" },
      { href: "/account/agency", label: "Agency dashboard" },
    ];
  }

  if (normalizedRole === "agent") {
    return [
      { href: "/agencies", label: "Agencies" },
      { href: "/properties", label: "Properties" },
      { href: "/account/join-requests", label: "My Agencies" },
      { href: "/account/listings", label: "My Listings" },
      { href: "/account/inquiries", label: inquiryConfig.navLabel },
      { href: "/account/favorites", label: "Favorites" },
    ];
  }

  if (normalizedRole === "seeker") {
    return [
      { href: "/agencies", label: "Agencies" },
      { href: "/properties", label: "Properties" },
      { href: "/account/join-requests", label: "My Agencies" },
      { href: "/account/favorites", label: "Favorites" },
      { href: "/account/saved-searches", label: "Saved searches" },
      { href: "/account/inquiries", label: inquiryConfig.navLabel },
    ];
  }

  return [
    { href: "/agencies", label: "Agencies" },
    { href: "/properties", label: "Properties" },
  ];
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
