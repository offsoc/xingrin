"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"
import type { GobyFingerprint } from "@/types/fingerprint.types"

// Translation type definitions
export interface GobyFingerprintTranslations {
  columns: {
    name: string
    logic: string
    rules: string
    ruleDetails: string
    created: string
  }
  actions: {
    selectAll: string
    selectRow: string
    expand: string
    collapse: string
  }
}

interface ColumnOptions {
  formatDate: (date: string) => string
  t: GobyFingerprintTranslations
}

/**
 * Rule details cell component - displays raw JSON data
 */
function RuleDetailsCell({ rules, t }: { rules: any[]; t: GobyFingerprintTranslations }) {
  const [expanded, setExpanded] = React.useState(false)
  
  if (!rules || rules.length === 0) return <span className="text-muted-foreground">-</span>
  
  const displayRules = expanded ? rules : rules.slice(0, 2)
  const hasMore = rules.length > 2
  
  return (
    <div className="flex flex-col gap-1">
      <div className="font-mono text-xs space-y-0.5">
        {displayRules.map((r, idx) => (
          <div key={idx} className={expanded ? "break-all" : "truncate"}>
            {JSON.stringify(r)}
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline self-start"
        >
          {expanded ? t.actions.collapse : t.actions.expand}
        </button>
      )}
    </div>
  )
}

/**
 * Create Goby fingerprint table column definitions
 */
export function createGobyFingerprintColumns({
  formatDate,
  t,
}: ColumnOptions): ColumnDef<GobyFingerprint>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t.actions.selectAll}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t.actions.selectRow}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      size: 40,
    },
    {
      accessorKey: "name",
      meta: { title: t.columns.name },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.name} />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
      enableResizing: true,
      size: 200,
    },
    {
      accessorKey: "logic",
      meta: { title: t.columns.logic },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.logic} />
      ),
      cell: ({ row }) => {
        const logic = row.getValue("logic") as string
        return <span className="font-mono text-xs">{logic}</span>
      },
      enableResizing: false,
      size: 100,
    },
    {
      accessorKey: "rule",
      meta: { title: t.columns.rules },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.rules} />
      ),
      cell: ({ row }) => {
        const rules = row.getValue("rule") as any[]
        return <span>{rules?.length || 0}</span>
      },
      enableResizing: false,
      size: 80,
    },
    {
      id: "ruleDetails",
      meta: { title: t.columns.ruleDetails },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.ruleDetails} />
      ),
      cell: ({ row }) => <RuleDetailsCell rules={row.original.rule || []} t={t} />,
      enableResizing: true,
      size: 300,
    },
    {
      accessorKey: "createdAt",
      meta: { title: t.columns.created },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.created} />
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string
        return (
          <div className="text-sm text-muted-foreground">
            {formatDate(date)}
          </div>
        )
      },
      enableResizing: false,
      size: 160,
    },
  ]
}
