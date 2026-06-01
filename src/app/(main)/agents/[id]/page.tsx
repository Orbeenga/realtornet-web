import type { Metadata } from "next";
import { AgentProfileClient } from "@/features/agents/components";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  return {
    title: "Agent Profile",
    description:
      "View this agent's active listings and contact details on RealtorNet.",
    alternates: {
      canonical: `https://realtornet-web.vercel.app/agents/${id}/`,
    },
    openGraph: {
      title: "Agent Profile | RealtorNet",
      description:
        "View this agent's active listings and contact details on RealtorNet.",
      siteName: "RealtorNet",
      locale: "en_NG",
      type: "website",
    },
  };
}

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AgentProfileClient id={id} />;
}
