"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"
import type { Subdomain } from "@/types/subdomain.types"

// 列创建函数的参数类型
interface CreateColumnsProps {
  formatDate: (dateString: string) => string
}

/**
 * 创建目标域名表格列定义
 */
export const createSubdomainColumns = ({
  formatDate,
}: CreateColumnsProps): ColumnDef<Subdomain>[] => [
  // 选择列
  {
    id: "select",
    size: 40,
    minSize: 40,
    maxSize: 40,
    enableResizing: false,
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  // 子域名列
  {
    accessorKey: "name",
    size: 350,
    minSize: 250,
    meta: { title: "Subdomain" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Subdomain" />
    ),
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      return (
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium font-mono break-all leading-relaxed whitespace-normal">
            {name}
          </span>
        </div>
      )
    },
  },

  // 创建时间列
  {
    accessorKey: "createdAt",
    size: 150,
    minSize: 120,
    maxSize: 200,
    meta: { title: "Created At" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" />
    ),
    cell: ({ getValue }) => {
      const value = getValue<string | undefined>()
      return value ? formatDate(value) : "-"
    },
  },
]
