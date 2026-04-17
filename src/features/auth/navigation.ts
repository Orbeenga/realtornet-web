"use client";

export type AppRole = "seeker" | "agent" | "admin";

export function normalizeAppRole(role: string | null | undefined): AppRole | null {
  if (role === "buyer") {
    return "seeker";
  }

  if (role === "seeker" || role === "agent" || role === "admin") {
    return role;
  }

  return null;
}

export function getPostLoginPath(role: string | null | undefined) {
  const normalizedRole = normalizeAppRole(role);

  if (normalizedRole === "agent" || normalizedRole === "admin") {
    return "/account/listings";
  }

  return "/properties";
}

export function getRoleNavLinks(role: string | null | undefined) {
  const normalizedRole = normalizeAppRole(role);

  if (normalizedRole === "admin") {
    return [
      { href: "/properties", label: "Properties" },
      { href: "/account/listings", label: "Property moderation" },
    ];
  }

  if (normalizedRole === "agent") {
    return [
      { href: "/properties", label: "Properties" },
      { href: "/account/listings", label: "My Listings" },
      { href: "/account/inquiries", label: "Inquiries" },
      { href: "/account/favorites", label: "Favorites" },
    ];
  }

  if (normalizedRole === "seeker") {
    return [
      { href: "/properties", label: "Properties" },
      { href: "/account/favorites", label: "Favorites" },
      { href: "/account/saved-searches", label: "Saved searches" },
      { href: "/account/inquiries", label: "Inquiries" },
    ];
  }

  return [{ href: "/properties", label: "Properties" }];
}
