import { api } from "@/lib/api-client"
import type { SearchParams, SearchResponse } from "@/types/search.types"

/**
 * 资产搜索 API 服务
 */
export class SearchService {
  /**
   * 搜索资产
   * GET /api/assets/search/
   */
  static async search(params: SearchParams): Promise<SearchResponse> {
    // 构建查询参数，过滤空值
    const queryParams = new URLSearchParams()
    
    if (params.host) queryParams.append('host', params.host)
    if (params.title) queryParams.append('title', params.title)
    if (params.tech) queryParams.append('tech', params.tech)
    if (params.status) queryParams.append('status', params.status)
    if (params.body) queryParams.append('body', params.body)
    if (params.header) queryParams.append('header', params.header)
    if (params.url) queryParams.append('url', params.url)
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString())
    
    const response = await api.get<SearchResponse>(
      `/assets/search/?${queryParams.toString()}`
    )
    return response.data
  }
}
