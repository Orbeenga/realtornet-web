import { PropertyDetailClient } from "@/features/properties/components";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PropertyDetailClient id={id} />;
}
