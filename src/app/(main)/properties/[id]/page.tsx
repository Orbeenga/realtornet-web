import type { Metadata } from "next";
import { PropertyDetailClient } from "@/features/properties/components";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  await params;

  return {
    title: "Property Listing",
    description:
      "View property details, photos, price and agent contact on RealtorNet.",
    openGraph: {
      title: "Property Listing | RealtorNet",
      description:
        "View property details, photos, price and agent contact on RealtorNet.",
      siteName: "RealtorNet",
      locale: "en_NG",
      type: "website",
    },
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PropertyDetailClient id={id} />;
}
