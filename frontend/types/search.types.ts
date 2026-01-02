// 搜索结果类型
export interface SearchResult {
  url: string
  host: string
  title: string
  technologies: string[]
  statusCode: number | null
  responseHeaders: Record<string, string>
  responseBody: string
  vulnerabilities: Vulnerability[]
}

export interface Vulnerability {
  name: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  source: string
  vulnType: string
  url?: string
}

// 搜索状态
export type SearchState = 'initial' | 'searching' | 'results'

// 搜索响应类型
export interface SearchResponse {
  results: SearchResult[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 搜索参数类型
export interface SearchParams {
  host?: string
  title?: string
  tech?: string
  status?: string
  body?: string
  header?: string
  url?: string
  page?: number
  pageSize?: number
}
