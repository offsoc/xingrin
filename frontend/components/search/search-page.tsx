"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, AlertCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { SmartFilterInput, type FilterField } from "@/components/common/smart-filter-input"
import { SearchResultCard } from "./search-result-card"
import { SearchPagination } from "./search-pagination"
import { useAssetSearch } from "@/hooks/use-search"
import type { SearchParams, SearchState } from "@/types/search.types"
import { Alert, AlertDescription } from "@/components/ui/alert"

// 搜索示例
const SEARCH_FILTER_EXAMPLES = [
  'host="example.com"',
  'title="后台管理"',
  'tech="nginx"',
  'status="200"',
  'body="password"',
  'header="Server: nginx"',
]

// 解析搜索查询字符串为参数对象
function parseSearchQuery(query: string): SearchParams {
  const params: SearchParams = {}
  
  // 匹配 key="value" 或 key=value 格式
  const regex = /(\w+)\s*=\s*"?([^"&]+)"?/g
  let match
  
  while ((match = regex.exec(query)) !== null) {
    const [, key, value] = match
    const trimmedValue = value.trim()
    
    switch (key.toLowerCase()) {
      case 'host':
        params.host = trimmedValue
        break
      case 'url':
        params.url = trimmedValue
        break
      case 'title':
        params.title = trimmedValue
        break
      case 'tech':
        params.tech = trimmedValue
        break
      case 'status':
        params.status = trimmedValue
        break
      case 'body':
        params.body = trimmedValue
        break
      case 'header':
        params.header = trimmedValue
        break
    }
  }
  
  // 如果没有匹配到任何字段，尝试作为 host 搜索
  if (Object.keys(params).length === 0 && query.trim()) {
    params.host = query.trim()
  }
  
  return params
}

export function SearchPage() {
  const t = useTranslations('search')
  const [searchState, setSearchState] = useState<SearchState>("initial")
  const [query, setQuery] = useState("")
  const [searchParams, setSearchParams] = useState<SearchParams>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // 搜索过滤字段配置
  const SEARCH_FILTER_FIELDS: FilterField[] = [
    { key: "host", label: "Host", description: t('fields.host') },
    { key: "url", label: "URL", description: t('fields.url') },
    { key: "title", label: "Title", description: t('fields.title') },
    { key: "tech", label: "Tech", description: t('fields.tech') },
    { key: "status", label: "Status", description: t('fields.status') },
    { key: "body", label: "Body", description: t('fields.body') },
    { key: "header", label: "Header", description: t('fields.header') },
  ]

  // 使用搜索 Hook
  const { data, isLoading, error, isFetching } = useAssetSearch(
    { ...searchParams, page, pageSize },
    { enabled: searchState === "results" || searchState === "searching" }
  )

  const handleSearch = useCallback((_filters: unknown, rawQuery: string) => {
    if (!rawQuery.trim()) return

    setQuery(rawQuery)
    const params = parseSearchQuery(rawQuery)
    setSearchParams(params)
    setPage(1) // 重置页码
    setSearchState("searching")
  }, [])

  // 当数据加载完成时更新状态
  if (searchState === "searching" && data && !isLoading) {
    setSearchState("results")
  }

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setPage(1) // 重置页码
  }, [])

  return (
    <div className="flex-1 w-full flex flex-col">
      <AnimatePresence mode="wait">
        {searchState === "initial" && (
          <motion.div
            key="initial"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center px-4 -mt-50"
          >
            <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
              <h1 className="text-3xl font-semibold text-foreground flex items-center gap-3">
                <Search className="h-8 w-8" />
                {t('title')}
              </h1>

              <SmartFilterInput
                fields={SEARCH_FILTER_FIELDS}
                examples={SEARCH_FILTER_EXAMPLES}
                placeholder='host="example.com" title="后台"'
                value={query}
                onSearch={handleSearch}
                className="w-full [&_input]:h-12 [&_input]:text-base [&_button]:h-12 [&_button]:w-12 [&_button]:p-0"
              />

              <p className="text-sm text-muted-foreground">
                {t('hint')}
              </p>
            </div>
          </motion.div>
        )}

        {searchState === "searching" && isLoading && (
          <motion.div
            key="searching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full flex flex-col items-center justify-center"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="text-muted-foreground">{t('searching')}</span>
            </div>
          </motion.div>
        )}

        {(searchState === "results" || (searchState === "searching" && !isLoading)) && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="h-full flex flex-col"
          >
            {/* 顶部搜索栏 */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3"
            >
              <div className="flex items-center gap-3 max-w-4xl mx-auto">
                <SmartFilterInput
                  fields={SEARCH_FILTER_FIELDS}
                  examples={SEARCH_FILTER_EXAMPLES}
                  placeholder='host="example.com" title="后台"'
                  value={query}
                  onSearch={handleSearch}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {isFetching ? t('loading') : t('resultsCount', { count: data?.total ?? 0 })}
                </span>
              </div>
            </motion.div>

            {/* 错误提示 */}
            {error && (
              <div className="p-4 max-w-4xl mx-auto w-full">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t('error')}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* 空结果提示 */}
            {!error && data?.results.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('noResults')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('noResultsHint')}
                  </p>
                </div>
              </div>
            )}

            {/* 搜索结果列表 */}
            {!error && data && data.results.length > 0 && (
              <>
                <div className="flex-1 overflow-auto p-4">
                  <div className="max-w-4xl mx-auto space-y-4">
                    {data.results.map((result, index) => (
                      <motion.div
                        key={`${result.url}-${index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <SearchResultCard result={result} />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* 分页控制 */}
                <div className="border-t px-4 py-3">
                  <div className="max-w-4xl mx-auto">
                    <SearchPagination
                      page={page}
                      pageSize={pageSize}
                      total={data.total}
                      totalPages={data.totalPages}
                      onPageChange={handlePageChange}
                      onPageSizeChange={handlePageSizeChange}
                    />
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
