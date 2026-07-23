import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import type { PropertyList } from '@/types'

export const useAdminRejectionHistory = (isEnabled: boolean, page = 0, pageSize = 20) => {
  return useQuery({
    queryKey: ['adminRejectionHistory', page, pageSize],
    queryFn: async () => {
      const response = await apiClient<{ items?: PropertyList } | PropertyList>(
        `/api/v1/admin/properties/rejection-history?skip=${page * pageSize}&limit=${pageSize}`,
      )
      if (Array.isArray(response)) {
        return response
      }
      return response.items ?? []
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled: isEnabled,
  })
}
