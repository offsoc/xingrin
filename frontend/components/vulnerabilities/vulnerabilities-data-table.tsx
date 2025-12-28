"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { UnifiedDataTable } from "@/components/ui/data-table"
import { PREDEFINED_FIELDS, type FilterField } from "@/components/common/smart-filter-input"
import type { Vulnerability } from "@/types/vulnerability.types"
import type { PaginationInfo } from "@/types/common.types"
import type { DownloadOption } from "@/types/data-table.types"

// 漏洞页面的过滤字段
const VULNERABILITY_FILTER_FIELDS: FilterField[] = [
  { key: "type", label: "Type", description: "Vulnerability type" },
  PREDEFINED_FIELDS.severity,
  { key: "source", label: "Source", description: "Scanner source" },
  PREDEFINED_FIELDS.url,
]

// 漏洞页面的示例
const VULNERABILITY_FILTER_EXAMPLES = [
  'type="xss" || type="sqli"',
  'severity="critical" || severity="high"',
  'source="nuclei" && severity="high"',
  'type="xss" && url="/api/*"',
]

interface VulnerabilitiesDataTableProps {
  data: Vulnerability[]
  columns: ColumnDef<Vulnerability>[]
  filterValue?: string
  onFilterChange?: (value: string) => void
  pagination?: { pageIndex: number; pageSize: number }
  setPagination?: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>
  paginationInfo?: PaginationInfo
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  onBulkDelete?: () => void
  onSelectionChange?: (selectedRows: Vulnerability[]) => void
  onDownloadAll?: () => void
  onDownloadSelected?: () => void
  hideToolbar?: boolean
}

export function VulnerabilitiesDataTable({
  data = [],
  columns,
  filterValue,
  onFilterChange,
  pagination,
  setPagination,
  paginationInfo,
  onPaginationChange,
  onBulkDelete,
  onSelectionChange,
  onDownloadAll,
  onDownloadSelected,
  hideToolbar = false,
}: VulnerabilitiesDataTableProps) {
  // 处理智能过滤搜索
  const handleFilterSearch = (rawQuery: string) => {
    onFilterChange?.(rawQuery)
  }

  // 下载选项
  const downloadOptions: DownloadOption[] = []
  if (onDownloadAll) {
    downloadOptions.push({
      key: "all",
      label: "Download All Vulnerabilities",
      onClick: onDownloadAll,
    })
  }
  if (onDownloadSelected) {
    downloadOptions.push({
      key: "selected",
      label: "Download Selected Vulnerabilities",
      onClick: onDownloadSelected,
      disabled: (count) => count === 0,
    })
  }

  return (
    <UnifiedDataTable
      data={data}
      columns={columns}
      getRowId={(row) => String(row.id)}
      // 分页
      pagination={pagination}
      setPagination={setPagination}
      paginationInfo={paginationInfo}
      onPaginationChange={onPaginationChange}
      // 智能过滤
      searchMode="smart"
      searchValue={filterValue}
      onSearch={handleFilterSearch}
      filterFields={VULNERABILITY_FILTER_FIELDS}
      filterExamples={VULNERABILITY_FILTER_EXAMPLES}
      // 选择
      onSelectionChange={onSelectionChange}
      // 批量操作
      onBulkDelete={onBulkDelete}
      bulkDeleteLabel="Delete"
      showAddButton={false}
      // 下载
      downloadOptions={downloadOptions.length > 0 ? downloadOptions : undefined}
      // 工具栏
      hideToolbar={hideToolbar}
      // 空状态
      emptyMessage="暂无数据"
    />
  )
}
