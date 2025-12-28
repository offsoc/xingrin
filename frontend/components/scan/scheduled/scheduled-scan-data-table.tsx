"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { IconSearch, IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UnifiedDataTable } from "@/components/ui/data-table"
import type { ScheduledScan } from "@/types/scheduled-scan.types"
import type { PaginationInfo } from "@/types/common.types"

interface ScheduledScanDataTableProps {
  data: ScheduledScan[]
  columns: ColumnDef<ScheduledScan>[]
  onAddNew?: () => void
  searchPlaceholder?: string
  searchValue?: string
  onSearch?: (value: string) => void
  isSearching?: boolean
  addButtonText?: string
  // 服务端分页相关
  page?: number
  pageSize?: number
  total?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

/**
 * 定时扫描数据表格组件
 * 使用 UnifiedDataTable 统一组件
 */
export function ScheduledScanDataTable({
  data = [],
  columns,
  onAddNew,
  searchPlaceholder = "搜索任务名称...",
  searchValue,
  onSearch,
  isSearching = false,
  addButtonText = "新建定时扫描",
  page = 1,
  pageSize = 10,
  total = 0,
  totalPages = 1,
  onPageChange,
  onPageSizeChange,
}: ScheduledScanDataTableProps) {
  // 搜索本地状态
  const [localSearchValue, setLocalSearchValue] = React.useState(searchValue || "")

  React.useEffect(() => {
    setLocalSearchValue(searchValue || "")
  }, [searchValue])

  const handleSearchSubmit = () => {
    if (onSearch) {
      onSearch(localSearchValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchSubmit()
    }
  }

  // 转换为 UnifiedDataTable 需要的分页格式
  const pagination = { pageIndex: page - 1, pageSize }
  const paginationInfo: PaginationInfo = {
    total,
    totalPages,
    page,
    pageSize,
  }

  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    if (newPagination.pageSize !== pageSize && onPageSizeChange) {
      onPageSizeChange(newPagination.pageSize)
    }
    if (newPagination.pageIndex !== page - 1 && onPageChange) {
      onPageChange(newPagination.pageIndex + 1)
    }
  }

  return (
    <UnifiedDataTable
      data={data}
      columns={columns}
      getRowId={(row) => String(row.id)}
      // 分页
      pagination={pagination}
      paginationInfo={paginationInfo}
      onPaginationChange={handlePaginationChange}
      // 选择
      enableRowSelection={false}
      // 批量操作
      showBulkDelete={false}
      onAddNew={onAddNew}
      addButtonLabel={addButtonText}
      // 空状态
      emptyMessage="暂无数据"
      // 自定义搜索框
      toolbarLeft={
        <div className="flex items-center space-x-2">
          <Input
            placeholder={searchPlaceholder}
            value={localSearchValue}
            onChange={(e) => setLocalSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 max-w-sm"
          />
          <Button variant="outline" size="sm" onClick={handleSearchSubmit} disabled={isSearching}>
            {isSearching ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconSearch className="h-4 w-4" />
            )}
          </Button>
        </div>
      }
    />
  )
}
