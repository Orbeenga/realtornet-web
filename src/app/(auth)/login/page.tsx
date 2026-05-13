import { Suspense } from "react";
import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your RealtorNet account.",
  openGraph: {
    title: "Sign In | RealtorNet",
    description: "Sign in to your RealtorNet account.",
    url: "/login",
    siteName: "RealtorNet",
    locale: "en_NG",
    type: "website",
  },
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
