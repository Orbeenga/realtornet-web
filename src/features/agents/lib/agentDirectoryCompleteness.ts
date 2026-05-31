import type { Agent, AgentDirectoryResponse } from "@/types";

const GENERIC_DISPLAY_NAME = /^Agent\s*#?\d+$/i;
const GENERIC_SHORT_NAME = /^A#\d+$/i;

export function resolveAgentDisplayName(agent: Agent) {
  const extended = agent as Agent & { display_name?: string | null };
  const candidate = extended.display_name?.trim() || agent.company_name?.trim() || "";

  return candidate;
}

export function isGenericAgentDisplayName(name: string) {
  return GENERIC_DISPLAY_NAME.test(name) || GENERIC_SHORT_NAME.test(name);
}

export function isPublicDisplayableAgent(agent: Agent) {
  const displayName = resolveAgentDisplayName(agent);

  if (!displayName || isGenericAgentDisplayName(displayName)) {
    return false;
  }

  return true;
}

export function isPublicDisplayableAgentDirectory(agent: AgentDirectoryResponse) {
  return !isGenericAgentDisplayName(agent.display_name);
}
