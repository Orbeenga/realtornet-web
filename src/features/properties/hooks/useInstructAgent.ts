import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import type { Property } from '@/types'

type InstructInput = {
  propertyId: number
  instructionText: string
}

export const useInstructAgent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ propertyId, instructionText }: InstructInput) => {
      const response = await apiClient<Property>(
        `/api/v1/properties/${propertyId}/instruct`,
        {
          method: 'PATCH',
          body: JSON.stringify({ instruction_text: instructionText }),
        },
      )
      return response
    },
    onSuccess: (property) => {
      const opts = { refetchType: "all" as const }
      queryClient.invalidateQueries({ queryKey: ["agencyOwnerListings"], ...opts })
      queryClient.invalidateQueries({ queryKey: ["ownerListings"], ...opts })
      queryClient.invalidateQueries({ queryKey: ["properties"], ...opts })
      queryClient.invalidateQueries({ queryKey: ["adminProperties"], ...opts })
      queryClient.invalidateQueries({ queryKey: ["property", property.property_id], ...opts })
    },
  })
}
