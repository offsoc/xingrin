"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import { UnifiedDataTable } from "@/components/ui/data-table"

interface CommandsDataTableProps<TData extends { id: number }> {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  onBulkDelete?: (selectedIds: number[]) => void
  onAdd?: () => void
}

export function CommandsDataTable<TData extends { id: number }>({
  columns,
  data,
  onBulkDelete,
  onAdd,
}: CommandsDataTableProps<TData>) {
  // 本地搜索状态
  const [searchValue, setSearchValue] = React.useState("")
  const [selectedRows, setSelectedRows] = React.useState<TData[]>([])

  // 过滤数据（本地过滤）
  const filteredData = React.useMemo(() => {
    if (!searchValue) return data
    return data.filter((item) => {
      const displayName = (item as any).displayName || ""
      return displayName.toLowerCase().includes(searchValue.toLowerCase())
    })
  }, [data, searchValue])

  // 处理批量删除
  const handleBulkDelete = () => {
    if (onBulkDelete && selectedRows.length > 0) {
      const selectedIds = selectedRows.map((row) => row.id)
      onBulkDelete(selectedIds)
    }
  }

  return (
    <UnifiedDataTable
      data={filteredData}
      columns={columns}
      getRowId={(row) => String(row.id)}
      onSelectionChange={setSelectedRows}
      onBulkDelete={onBulkDelete ? handleBulkDelete : undefined}
      onAddNew={onAdd}
      addButtonLabel="Add"
      bulkDeleteLabel="Delete"
      emptyMessage="暂无数据"
      toolbarLeft={
        <Input
          placeholder="搜索命令名称..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="max-w-sm h-8"
        />
      }
    />
  )
}
