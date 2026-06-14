import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import type { PropertyList } from '@/types'

export const useAdminRevocationHistory = (isEnabled: boolean, page = 0, pageSize = 20) => {
  return useQuery({
    queryKey: ['adminRevocationHistory', page, pageSize],
    queryFn: async () => {
      const response = await apiClient<{ items?: PropertyList } | PropertyList>(
        `/api/v1/admin/properties/revocation-history/?skip=${page * pageSize}&limit=${pageSize}`,
      )
      if (Array.isArray(response)) {
        return response
      }
      return response.items ?? []
    },
    enabled: isEnabled,
    staleTime: 30_000,
  })
}
