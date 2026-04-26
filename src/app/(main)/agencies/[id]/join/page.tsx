import { AgencyJoinRequestForm } from "@/features/agencies/components";

export default async function AgencyJoinRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-3xl">
      <AgencyJoinRequestForm agencyId={id} />
    </div>
  );
}
