"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { UnifiedDataTable } from "@/components/ui/data-table"
import { PREDEFINED_FIELDS, type FilterField } from "@/components/common/smart-filter-input"
import type { IPAddress } from "@/types/ip-address.types"
import type { PaginationInfo } from "@/types/common.types"
import type { DownloadOption } from "@/types/data-table.types"

// IP 地址页面的过滤字段配置
const IP_ADDRESS_FILTER_FIELDS: FilterField[] = [
  PREDEFINED_FIELDS.ip,
  PREDEFINED_FIELDS.port,
  PREDEFINED_FIELDS.host,
]

// IP 地址页面的示例
const IP_ADDRESS_FILTER_EXAMPLES = [
  'ip="192.168.1.*" && port="80"',
  'port="443" || port="8443"',
  'host="api.example.com" && port!="22"',
]

interface IPAddressesDataTableProps {
  data: IPAddress[]
  columns: ColumnDef<IPAddress>[]
  filterValue?: string
  onFilterChange?: (value: string) => void
  pagination?: { pageIndex: number; pageSize: number }
  setPagination?: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>
  paginationInfo?: PaginationInfo
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  onBulkDelete?: () => void
  onSelectionChange?: (selectedRows: IPAddress[]) => void
  onDownloadAll?: () => void
  onDownloadSelected?: () => void
}

export function IPAddressesDataTable({
  data = [],
  columns,
  filterValue = "",
  onFilterChange,
  pagination,
  setPagination,
  paginationInfo,
  onPaginationChange,
  onBulkDelete,
  onSelectionChange,
  onDownloadAll,
  onDownloadSelected,
}: IPAddressesDataTableProps) {
  // 智能搜索处理
  const handleSmartSearch = (rawQuery: string) => {
    onFilterChange?.(rawQuery)
  }

  // 下载选项
  const downloadOptions: DownloadOption[] = []
  if (onDownloadAll) {
    downloadOptions.push({
      key: "all",
      label: "Download All IP Addresses",
      onClick: onDownloadAll,
    })
  }
  if (onDownloadSelected) {
    downloadOptions.push({
      key: "selected",
      label: "Download Selected IP Addresses",
      onClick: onDownloadSelected,
      disabled: (count) => count === 0,
    })
  }

  return (
    <UnifiedDataTable
      data={data}
      columns={columns}
      getRowId={(row) => row.ip}
      // 分页
      pagination={pagination}
      setPagination={setPagination}
      paginationInfo={paginationInfo}
      onPaginationChange={onPaginationChange}
      // 智能过滤
      searchMode="smart"
      searchValue={filterValue}
      onSearch={handleSmartSearch}
      filterFields={IP_ADDRESS_FILTER_FIELDS}
      filterExamples={IP_ADDRESS_FILTER_EXAMPLES}
      // 选择
      onSelectionChange={onSelectionChange}
      // 批量操作
      onBulkDelete={onBulkDelete}
      bulkDeleteLabel="Delete"
      showAddButton={false}
      // 下载
      downloadOptions={downloadOptions.length > 0 ? downloadOptions : undefined}
      // 空状态
      emptyMessage="暂无数据"
    />
  )
}
