"use client"

import React, { useState, useMemo } from "react"
import { AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import { useTarget } from "@/hooks/use-targets"
import {
  useTargetSubdomains,
  useScanSubdomains
} from "@/hooks/use-subdomains"
import { SubdomainsDataTable } from "./subdomains-data-table"
import { createSubdomainColumns } from "./subdomains-columns"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
import { SubdomainService } from "@/services/subdomain.service"
import { BulkAddSubdomainsDialog } from "./bulk-add-subdomains-dialog"
import { getDateLocale } from "@/lib/date-utils"
import type { Subdomain } from "@/types/subdomain.types"

/**
 * Subdomain detail view component
 * Supports two modes:
 * 1. targetId: Display all subdomains under a target
 * 2. scanId: Display subdomains from scan history
 */
export function SubdomainsDetailView({
  targetId,
  scanId
}: {
  targetId?: number
  scanId?: number
}) {
  const [selectedSubdomains, setSelectedSubdomains] = useState<Subdomain[]>([])

  // Internationalization
  const tColumns = useTranslations("columns")
  const tCommon = useTranslations("common")
  const tSubdomains = useTranslations("subdomains")
  const locale = useLocale()

  // Build translation object
  const translations = useMemo(() => ({
    columns: {
      subdomain: tColumns("subdomain.subdomain"),
      createdAt: tColumns("common.createdAt"),
    },
    actions: {
      selectAll: tCommon("actions.selectAll"),
      selectRow: tCommon("actions.selectRow"),
    },
  }), [tColumns, tCommon])

  // Bulk add dialog state
  const [bulkAddOpen, setBulkAddOpen] = useState(false)

  // Pagination state
  const [pagination, setPagination] = useState({
    pageIndex: 0,  // 0-based for react-table
    pageSize: 10,
  })

  // Filter state (smart filter syntax)
  const [filterQuery, setFilterQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const handleFilterChange = (value: string) => {
    setIsSearching(true)
    setFilterQuery(value)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  // Fetch subdomain data based on targetId or scanId (with pagination and filter params)
  const targetSubdomainsQuery = useTargetSubdomains(
    targetId || 0,
    {
      page: pagination.pageIndex + 1, // 转换为 1-based
      pageSize: pagination.pageSize,
      filter: filterQuery || undefined,
    },
    { enabled: !!targetId }
  )
  const scanSubdomainsQuery = useScanSubdomains(
    scanId || 0,
    {
      page: pagination.pageIndex + 1, // 转换为 1-based
      pageSize: pagination.pageSize,
      filter: filterQuery || undefined,
    },
    { enabled: !!scanId }
  )

  // Select the active query result
  const activeQuery = targetId ? targetSubdomainsQuery : scanSubdomainsQuery
  const { data: subdomainsData, isLoading, isFetching, error, refetch } = activeQuery

  // Reset search state when request completes
  React.useEffect(() => {
    if (!isFetching && isSearching) {
      setIsSearching(false)
    }
  }, [isFetching, isSearching])

  // Get target info (only in targetId mode)
  const { data: targetData } = useTarget(targetId || 0)

  // Helper function - format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString(getDateLocale(locale), {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  // Navigation function
  const router = useRouter()
  const navigate = (path: string) => {
    router.push(path)
  }

  // Handle pagination change
  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }

  // 格式化日期为 YYYY-MM-DD HH:MM:SS（与后端一致）
  const formatDateForCSV = (dateString: string): string => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  // CSV 转义
  const escapeCSV = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  // 生成 CSV 内容
  const generateCSV = (items: Subdomain[]): string => {
    const BOM = '\ufeff'
    const headers = ['name', 'created_at']
    
    const rows = items.map(item => [
      escapeCSV(item.name),
      escapeCSV(formatDateForCSV(item.createdAt))
    ].join(','))
    
    return BOM + [headers.join(','), ...rows].join('\n')
  }

  // 处理下载所有子域名
  const handleDownloadAll = async () => {
    try {
      let blob: Blob | null = null

      if (scanId) {
        const data = await SubdomainService.exportSubdomainsByScanId(scanId)
        blob = data
      } else if (targetId) {
        const data = await SubdomainService.exportSubdomainsByTargetId(targetId)
        blob = data
      } else {
        if (!subdomains || subdomains.length === 0) {
          return
        }
        const csvContent = generateCSV(subdomains)
        blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
      }

      if (!blob) return

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const prefix = scanId ? `scan-${scanId}` : targetId ? `target-${targetId}` : "subdomains"
      a.href = url
      a.download = `${prefix}-subdomains-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("下载子域名失败", error)
    }
  }

  // 处理下载选中的子域名
  const handleDownloadSelected = () => {
    if (selectedSubdomains.length === 0) {
      return
    }
    const csvContent = generateCSV(selectedSubdomains)
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `subdomains-selected-${scanId ?? targetId ?? "all"}-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 创建列定义
  const subdomainColumns = useMemo(
    () =>
      createSubdomainColumns({
        formatDate,
        t: translations,
      }),
    [formatDate, translations]
  )

  // 转换后端数据格式为前端 Subdomain 类型（必须在条件渲染之前调用）
  // 注意：后端使用 djangorestframework-camel-case 自动转换字段名为 camelCase
  const subdomains: Subdomain[] = useMemo(() => {
    if (!subdomainsData?.results) return []
    return subdomainsData.results.map((item: any) => ({
      id: item.id,
      name: item.name,
      createdAt: item.createdAt,  // 创建时间（后端已转换为 camelCase）
    }))
  }, [subdomainsData])

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{tSubdomains("loadFailed")}</h3>
        <p className="text-muted-foreground text-center mb-4">
          {error.message || tSubdomains("loadError")}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          {tSubdomains("reload")}
        </button>
      </div>
    )
  }

  // 加载状态（仅首次加载时显示骨架屏，搜索时不显示）
  if (isLoading && !subdomainsData) {
    return (
      <DataTableSkeleton
        toolbarButtonCount={2}
        rows={6}
        columns={5}
      />
    )
  }

  return (
    <>
      <SubdomainsDataTable
        data={subdomains}
        columns={subdomainColumns}
        onSelectionChange={setSelectedSubdomains}
        filterValue={filterQuery}
        onFilterChange={handleFilterChange}
        isSearching={isSearching}
        onDownloadAll={handleDownloadAll}
        onDownloadSelected={handleDownloadSelected}
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={{
          total: subdomainsData?.total || 0,
          page: subdomainsData?.page || 1,
          pageSize: subdomainsData?.pageSize || 10,
          totalPages: subdomainsData?.totalPages || 1,
        }}
        onPaginationChange={handlePaginationChange}
        onBulkAdd={targetId ? () => setBulkAddOpen(true) : undefined}
      />
      
      {/* 批量添加子域名弹窗 */}
      {targetId && (
        <BulkAddSubdomainsDialog
          targetId={targetId}
          targetName={targetData?.name}
          open={bulkAddOpen}
          onOpenChange={setBulkAddOpen}
          onSuccess={() => refetch()}
        />
      )}
    </>
  )
}
