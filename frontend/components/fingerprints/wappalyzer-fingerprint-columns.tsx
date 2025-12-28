"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"
import type { WappalyzerFingerprint } from "@/types/fingerprint.types"

interface ColumnOptions {
  formatDate: (date: string) => string
}

/**
 * 可展开文本单元格组件
 */
function ExpandableTextCell({ value, maxLength = 80 }: { value: string | null | undefined; maxLength?: number }) {
  const [expanded, setExpanded] = useState(false)
  
  if (!value) return <span className="text-muted-foreground">-</span>
  
  const needsExpand = value.length > maxLength
  
  return (
    <div className="flex flex-col gap-1 overflow-hidden w-full">
      <div 
        className={`text-sm text-muted-foreground break-words cursor-pointer hover:text-foreground transition-colors ${!expanded ? 'line-clamp-2' : ''}`}
        onClick={() => needsExpand && setExpanded(!expanded)}
        title={needsExpand ? (expanded ? "点击收起" : "点击展开") : undefined}
      >
        {value}
      </div>
      {needsExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline self-start"
        >
          {expanded ? "收起" : "展开"}
        </button>
      )}
    </div>
  )
}

/**
 * 可展开链接单元格组件
 */
function ExpandableLinkCell({ value, maxLength = 50 }: { value: string | null | undefined; maxLength?: number }) {
  const [expanded, setExpanded] = useState(false)
  
  if (!value) return <span className="text-muted-foreground">-</span>
  
  const needsExpand = value.length > maxLength
  
  return (
    <div className="flex flex-col gap-1 overflow-hidden w-full">
      <div 
        className={`text-sm text-muted-foreground break-words ${!expanded ? 'line-clamp-1' : ''}`}
      >
        {value}
      </div>
      {needsExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline self-start"
        >
          {expanded ? "收起" : "展开"}
        </button>
      )}
    </div>
  )
}

/**
 * 创建 Wappalyzer 指纹表格列定义
 */
export function createWappalyzerFingerprintColumns({
  formatDate,
}: ColumnOptions): ColumnDef<WappalyzerFingerprint>[] {
  return [
    // 选择列
    {
      id: "select",
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
      enableResizing: false,
      size: 40,
    },
    // 应用名称
    {
      accessorKey: "name",
      meta: { title: "Name" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
      enableResizing: true,
      size: 180,
    },
    // 分类
    {
      accessorKey: "cats",
      meta: { title: "Categories" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Categories" />
      ),
      cell: ({ row }) => {
        const cats = row.getValue("cats") as number[]
        if (!cats || cats.length === 0) return "-"
        return (
          <div className="flex flex-wrap gap-1">
            {cats.slice(0, 3).map((cat) => (
              <Badge key={cat} variant="secondary" className="text-xs">
                {cat}
              </Badge>
            ))}
            {cats.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{cats.length - 3}
              </Badge>
            )}
          </div>
        )
      },
      enableResizing: true,
      size: 120,
    },
    // 描述
    {
      accessorKey: "description",
      meta: { title: "Description" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => <ExpandableTextCell value={row.getValue("description")} />,
      enableResizing: true,
      size: 250,
    },
    // 官网
    {
      accessorKey: "website",
      meta: { title: "Website" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Website" />
      ),
      cell: ({ row }) => <ExpandableLinkCell value={row.getValue("website")} />,
      enableResizing: true,
      size: 200,
    },
    // 检测方式数量
    {
      id: "detectionMethods",
      meta: { title: "Detection" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Detection" />
      ),
      cell: ({ row }) => {
        const fp = row.original
        const methods: string[] = []
        if (fp.cookies && Object.keys(fp.cookies).length > 0) methods.push("cookies")
        if (fp.headers && Object.keys(fp.headers).length > 0) methods.push("headers")
        if (fp.scriptSrc && fp.scriptSrc.length > 0) methods.push("script")
        if (fp.js && fp.js.length > 0) methods.push("js")
        if (fp.meta && Object.keys(fp.meta).length > 0) methods.push("meta")
        if (fp.html && fp.html.length > 0) methods.push("html")
        
        if (methods.length === 0) return "-"
        return (
          <div className="flex flex-wrap gap-1">
            {methods.map((m) => (
              <Badge key={m} variant="outline" className="text-xs">
                {m}
              </Badge>
            ))}
          </div>
        )
      },
      enableResizing: true,
      size: 180,
    },
    // 创建时间
    {
      accessorKey: "createdAt",
      meta: { title: "Created" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string
        return (
          <div className="text-sm text-muted-foreground">
            {formatDate(date)}
          </div>
        )
      },
      enableResizing: true,
      size: 160,
    },
  ]
}
