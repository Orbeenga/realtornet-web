import { AgencyProfileClient } from "@/features/agencies/components";

export default async function AgencyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AgencyProfileClient id={id} />;
}
