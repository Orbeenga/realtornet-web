import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Create an Account",
  description:
    "Join RealtorNet to save properties, send inquiries and connect with agents.",
  openGraph: {
    title: "Create an Account | RealtorNet",
    description:
      "Join RealtorNet to save properties, send inquiries and connect with agents.",
    url: "/register",
    siteName: "RealtorNet",
    locale: "en_NG",
    type: "website",
  },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
