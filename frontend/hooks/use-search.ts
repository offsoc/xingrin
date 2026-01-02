import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { SearchService } from '@/services/search.service'
import type { SearchParams, SearchResponse } from '@/types/search.types'

/**
 * 资产搜索 Hook
 * 
 * @param params 搜索参数
 * @param options 查询选项
 * @returns 搜索结果
 */
export function useAssetSearch(
  params: SearchParams,
  options?: { enabled?: boolean }
) {
  // 检查是否有有效的搜索条件
  const hasSearchParams = !!(
    params.host ||
    params.title ||
    params.tech ||
    params.status ||
    params.body ||
    params.header ||
    params.url
  )

  return useQuery<SearchResponse>({
    queryKey: ['asset-search', params],
    queryFn: () => SearchService.search(params),
    enabled: (options?.enabled ?? true) && hasSearchParams,
    placeholderData: keepPreviousData,
    staleTime: 30000, // 30 秒内不重新请求
  })
}
