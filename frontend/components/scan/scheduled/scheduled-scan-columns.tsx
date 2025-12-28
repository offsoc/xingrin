"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  MoreHorizontal,
  Trash2,
  Edit,
  Building2,
  Target,
} from "lucide-react"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"


import type { ScheduledScan } from "@/types/scheduled-scan.types"
import { CopyablePopoverContent } from "@/components/ui/copyable-popover-content"

/**
 * 解析 Cron 表达式为人类可读格式
 */
function parseCronExpression(cron: string): string {
  if (!cron) return '-'
  
  const parts = cron.split(' ')
  if (parts.length !== 5) return cron
  
  const [minute, hour, day, month, weekday] = parts
  
  // 每分钟
  if (minute === '*' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return '每分钟'
  }
  
  // 每N分钟
  if (minute.startsWith('*/') && hour === '*') {
    return `每 ${minute.slice(2)} 分钟`
  }
  
  // 每小时
  if (minute !== '*' && hour === '*' && day === '*') {
    return `每小时 ${minute}分`
  }
  
  // 每N小时
  if (hour.startsWith('*/')) {
    return `每 ${hour.slice(2)} 小时 ${minute}分`
  }
  
  // 每天
  if (day === '*' && month === '*' && weekday === '*') {
    return `每天 ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
  }
  
  // 每周
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  if (day === '*' && month === '*' && weekday !== '*') {
    const dayName = weekdays[parseInt(weekday)] || weekday
    return `每${dayName} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
  }
  
  // 每月
  if (day !== '*' && month === '*' && weekday === '*') {
    return `每月${day}号 ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
  }
  
  return cron
}

// 列创建函数的参数类型
interface CreateColumnsProps {
  formatDate: (dateString: string) => string
  handleEdit: (scan: ScheduledScan) => void
  handleDelete: (scan: ScheduledScan) => void
  handleToggleStatus: (scan: ScheduledScan, enabled: boolean) => void
}

/**
 * 定时扫描行操作组件
 */
function ScheduledScanRowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <MoreHorizontal />
          <span className="sr-only">打开菜单</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Edit />
          编辑任务
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * 创建定时扫描表格列定义
 */
export const createScheduledScanColumns = ({
  formatDate,
  handleEdit,
  handleDelete,
  handleToggleStatus,
}: CreateColumnsProps): ColumnDef<ScheduledScan>[] => [
  // 任务名称列
  {
    accessorKey: "name",
    size: 350,
    minSize: 250,
    meta: { title: "Task Name" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Task Name" />
    ),
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      if (!name) return <span className="text-muted-foreground text-sm">-</span>

      return (
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium break-all leading-relaxed whitespace-normal">
            {name}
          </span>
        </div>
      )
    },
  },

  // 扫描引擎列
  {
    accessorKey: "engineName",
    size: 120,
    minSize: 80,
    meta: { title: "Scan Engine" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Scan Engine" />
    ),
    cell: ({ row }) => {
      const engineName = row.getValue("engineName") as string
      return (
        <Badge variant="secondary">
          {engineName}
        </Badge>
      )
    },
  },

  // Cron 表达式列
  {
    accessorKey: "cronExpression",
    meta: { title: "Cron Expression" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cron Expression" />
    ),
    size: 150,
    minSize: 100,
    cell: ({ row }) => {
      const cron = row.original.cronExpression
      return (
        <div className="flex flex-col gap-1">
          <span className="text-sm">
            {parseCronExpression(cron)}
          </span>
          <code className="text-xs text-muted-foreground font-mono">
            {cron}
          </code>
        </div>
      )
    },
    enableSorting: false,
  },

  // 扫描范围列（用图标区分组织/目标）
  {
    accessorKey: "scanMode",
    meta: { title: "Scope" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Scope" />
    ),
    size: 200,
    minSize: 150,
    cell: ({ row }) => {
      const scanMode = row.original.scanMode
      const organizationName = row.original.organizationName
      const targetName = row.original.targetName
      
      // 组织扫描模式
      if (scanMode === 'organization' && organizationName) {
        return (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm truncate">{organizationName}</span>
          </div>
        )
      }
      
      // 目标扫描模式
      if (targetName) {
        return (
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-mono truncate">{targetName}</span>
          </div>
        )
      }
      
      return <span className="text-sm text-muted-foreground">-</span>
    },
    enableSorting: false,
  },

  // 启用状态列
  {
    accessorKey: "isEnabled",
    size: 100,
    minSize: 80,
    meta: { title: "Status" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const isEnabled = row.getValue("isEnabled") as boolean
      const scan = row.original
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked: boolean) =>
              handleToggleStatus(scan, checked)
            }
          />
          <span className="text-sm text-muted-foreground">
            {isEnabled ? "启用" : "禁用"}
          </span>
        </div>
      )
    },
  },

  // 下次执行时间列
  {
    accessorKey: "nextRunTime",
    size: 150,
    minSize: 120,
    meta: { title: "Next Run" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Next Run" />
    ),
    cell: ({ row }) => {
      const nextRunTime = row.getValue("nextRunTime") as string | undefined
      return (
        <div className="text-sm text-muted-foreground">
          {nextRunTime ? formatDate(nextRunTime) : "-"}
        </div>
      )
    },
  },

  // 执行次数列
  {
    accessorKey: "runCount",
    size: 80,
    minSize: 60,
    meta: { title: "Run Count" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Run Count" />
    ),
    cell: ({ row }) => {
      const count = row.getValue("runCount") as number
      return (
        <div className="text-sm text-muted-foreground font-mono">{count}</div>
      )
    },
  },

  // 上次执行时间列
  {
    accessorKey: "lastRunTime",
    size: 150,
    minSize: 120,
    meta: { title: "Last Run" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Run" />
    ),
    cell: ({ row }) => {
      const lastRunTime = row.getValue("lastRunTime") as string | undefined
      return (
        <div className="text-sm text-muted-foreground">
          {lastRunTime ? formatDate(lastRunTime) : "-"}
        </div>
      )
    },
  },

  // 操作列
  {
    id: "actions",
    size: 60,
    minSize: 60,
    maxSize: 60,
    enableResizing: false,
    cell: ({ row }) => (
      <ScheduledScanRowActions
        onEdit={() => handleEdit(row.original)}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
