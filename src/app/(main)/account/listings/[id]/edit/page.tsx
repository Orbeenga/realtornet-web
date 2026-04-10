import { EditListingClient } from "@/features/properties/components";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <EditListingClient id={id} />;
}
