"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  ColumnSizingState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconLayoutColumns,
  IconPlus,
  IconDownload,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SmartFilterInput, type FilterField } from "@/components/common/smart-filter-input"
import type { Endpoint } from "@/types/endpoint.types"

// 端点页面的过滤字段配置
const ENDPOINT_FILTER_FIELDS: FilterField[] = [
  { key: "url", label: "URL", description: "Endpoint URL" },
  { key: "host", label: "Host", description: "Hostname" },
  { key: "title", label: "Title", description: "Page title" },
  { key: "status", label: "Status", description: "HTTP status code" },
]

// 端点页面的示例
const ENDPOINT_FILTER_EXAMPLES = [
  'url="/api/*" && status="200"',
  'host="api.example.com" || host="admin.example.com"',
  'title="Dashboard" && status!="404"',
]

interface EndpointsDataTableProps<TData extends { id: number | string }, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  // 智能过滤
  filterValue?: string
  onFilterChange?: (value: string) => void
  isSearching?: boolean
  onAddNew?: () => void
  addButtonText?: string
  onSelectionChange?: (selectedRows: TData[]) => void
  pagination?: { pageIndex: number; pageSize: number }
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  totalCount?: number
  totalPages?: number
  onDownloadAll?: () => void
  onDownloadSelected?: () => void
  onBulkAdd?: () => void
}

export function EndpointsDataTable<TData extends { id: number | string }, TValue>({
  columns,
  data,
  filterValue,
  onFilterChange,
  isSearching = false,
  onAddNew,
  addButtonText = "Add",
  onSelectionChange,
  pagination: externalPagination,
  onPaginationChange,
  totalCount,
  totalPages,
  onDownloadAll,
  onDownloadSelected,
  onBulkAdd,
}: EndpointsDataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [internalPagination, setInternalPagination] = React.useState<{ pageIndex: number, pageSize: number }>({
    pageIndex: 0,
    pageSize: 10,
  })

  // 处理智能过滤搜索
  const handleSmartSearch = (_filters: any[], rawQuery: string) => {
    if (onFilterChange) {
      onFilterChange(rawQuery)
    }
  }

  const pagination = externalPagination || internalPagination

  const handlePaginationChange = React.useCallback((updaterOrValue: { pageIndex: number; pageSize: number } | ((prev: { pageIndex: number; pageSize: number }) => { pageIndex: number; pageSize: number })) => {
    if (onPaginationChange) {
      if (typeof updaterOrValue === 'function') {
        const newPagination = updaterOrValue(pagination)
        onPaginationChange(newPagination)
      } else {
        onPaginationChange(updaterOrValue)
      }
    } else {
      setInternalPagination(updaterOrValue)
    }
  }, [onPaginationChange, pagination])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      columnSizing,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: externalPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: !!externalPagination,
    pageCount: totalPages,
  })

  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original)
      onSelectionChange(selectedRows)
    }
  }, [rowSelection, onSelectionChange, table])

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        {/* 智能过滤搜索框 */}
        <SmartFilterInput
          fields={ENDPOINT_FILTER_FIELDS}
          examples={ENDPOINT_FILTER_EXAMPLES}
          value={filterValue}
          onSearch={handleSmartSearch}
          className="flex-1 max-w-xl"
        />

        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                Columns
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" && column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id === "id" && "ID"}
                      {column.id === "url" && "URL"}
                      {column.id === "endpoint" && "Endpoint"}
                      {column.id === "method" && "Method"}
                      {column.id === "statusCode" && "Status"}
                      {column.id === "title" && "Title"}
                      {column.id === "contentLength" && "Size"}
                      {column.id === "contentType" && "Content Type"}
                      {column.id === "responseTime" && "Response time"}
                      {column.id === "tags" && "Tags"}
                      {column.id === "createdAt" && "Created At"}
                      {column.id === "updatedAt" && "Updated At"}
                      {!["id", "url", "endpoint", "method", "statusCode", "title", "contentLength", "contentType", "responseTime", "tags", "createdAt", "updatedAt"].includes(column.id) && column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          {(onDownloadAll || onDownloadSelected) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <IconDownload />
                  Download
                  <IconChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Download Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {onDownloadAll && (
                  <DropdownMenuItem onClick={onDownloadAll}>
                    <IconDownload className="h-4 w-4" />
                    Download All Endpoints
                  </DropdownMenuItem>
                )}
                {onDownloadSelected && (
                  <DropdownMenuItem
                    onClick={onDownloadSelected}
                    disabled={table.getFilteredSelectedRowModel().rows.length === 0}
                  >
                    <IconDownload className="h-4 w-4" />
                    Download Selected Endpoints
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {onBulkAdd && (
            <Button onClick={onBulkAdd} size="sm" variant="outline">
              <IconPlus />
              批量添加
            </Button>
          )}

          {onAddNew && (
            <Button onClick={onAddNew} size="sm">
              <IconPlus />
              {addButtonText}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table style={{ minWidth: table.getCenterTotalSize() }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead 
                      key={header.id} 
                      colSpan={header.colSpan}
                      style={{ width: header.getSize() }}
                      className="relative group"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onDoubleClick={() => header.column.resetSize()}
                          className="absolute -right-2.5 top-0 h-full w-5 cursor-col-resize select-none touch-none bg-transparent flex justify-center"
                        >
                          <div className="w-1.5 h-full bg-transparent group-hover:bg-border" />
                        </div>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {externalPagination ? totalCount : table.getFilteredRowModel().rows.length} row(s) selected
        </div>

        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[90px]" id="rows-per-page">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 50, 100, 200, 500, 1000].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {externalPagination ? totalPages : table.getPageCount()}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={externalPagination ? pagination.pageIndex === 0 : !table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={externalPagination ? pagination.pageIndex === 0 : !table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={externalPagination ? pagination.pageIndex >= (totalPages || 1) - 1 : !table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <IconChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex((totalPages || table.getPageCount()) - 1)}
              disabled={externalPagination ? pagination.pageIndex >= (totalPages || 1) - 1 : !table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
