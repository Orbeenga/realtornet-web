import type { Metadata } from "next";
import { AgencyProfileClient } from "@/features/agencies/components";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  await params;

  return {
    title: "Agency Profile",
    description:
      "View listings, agents and contact details for this agency on RealtorNet.",
    openGraph: {
      title: "Agency Profile | RealtorNet",
      description:
        "View listings, agents and contact details for this agency on RealtorNet.",
      siteName: "RealtorNet",
      locale: "en_NG",
      type: "website",
    },
  };
}

export default async function AgencyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AgencyProfileClient id={id} />;
}
