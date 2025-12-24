/**
 * Directory 相关类型定义
 */

export interface Directory {
  id: number
  url: string
  status: number | null
  contentLength: number | null  // 后端返回 contentLength
  words: number | null
  lines: number | null
  contentType: string
  duration: number | null
  websiteUrl: string  // 后端返回 websiteUrl
  createdAt: string  // 后端返回 createdAt
}

export interface DirectoryFilters {
  url?: string
  status?: number
  contentType?: string
}

export interface DirectoryListResponse {
  results: Directory[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
