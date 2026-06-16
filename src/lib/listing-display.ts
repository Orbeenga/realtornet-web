import type { ModerationStatus } from '@/types'

export const resolveListingDisplayName = (
  status: ModerationStatus,
  ownerDisplayName: string | null | undefined,
  agencyName: string | null | undefined,
  tabIsPublicContext: boolean,
): string => {
  const showAgencyName = status === 'admin_review' || tabIsPublicContext
  return showAgencyName
    ? (agencyName ?? 'Agency')
    : (ownerDisplayName ?? 'Agent')
}
