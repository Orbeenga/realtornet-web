import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import type { Property } from '@/types'

type RejectPermanentInput = {
  propertyId: number
  reason: string
}

export const useRejectPermanent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ propertyId, reason }: RejectPermanentInput) => {
      const response = await apiClient<Property>(
        `/api/v1/properties/${propertyId}/reject-permanent`,
        {
          method: 'PATCH',
          body: JSON.stringify({ moderation_reason: reason }),
        },
      )
      return response
    },
    onSuccess: (property) => {
      const opts = { refetchType: "all" as const }
      queryClient.invalidateQueries({ queryKey: ["adminProperties"], ...opts })
      queryClient.invalidateQueries({ queryKey: ["adminRevocationHistory"], ...opts })
      queryClient.invalidateQueries({ queryKey: ["adminRejectionHistory"], ...opts })
      queryClient.invalidateQueries({ queryKey: ["property", property.property_id], ...opts })
    },
  })
}
