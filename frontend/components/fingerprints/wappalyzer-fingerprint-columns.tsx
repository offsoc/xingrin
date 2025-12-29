"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"
import { ExpandableCell } from "@/components/ui/data-table/expandable-cell"
import type { WappalyzerFingerprint } from "@/types/fingerprint.types"

// Translation type definitions
export interface WappalyzerFingerprintTranslations {
  columns: {
    name: string
    cats: string
    rules: string
    implies: string
    description: string
    website: string
    cpe: string
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
  t: WappalyzerFingerprintTranslations
}

interface RuleItem {
  key: string
  value: any
}

/**
 * Extract all rules from fingerprint (keeping original format)
 */
function extractRules(fp: WappalyzerFingerprint): RuleItem[] {
  const rules: RuleItem[] = []
  const ruleKeys = ['cookies', 'headers', 'scriptSrc', 'js', 'meta', 'html'] as const
  
  for (const key of ruleKeys) {
    const value = fp[key]
    if (value && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0)) {
      rules.push({ key, value })
    }
  }
  
  return rules
}

/**
 * Rules list cell - displays raw JSON format
 */
function RulesCell({ fp, t }: { fp: WappalyzerFingerprint; t: WappalyzerFingerprintTranslations }) {
  const [expanded, setExpanded] = React.useState(false)
  const rules = extractRules(fp)
  
  if (rules.length === 0) {
    return <span className="text-muted-foreground">-</span>
  }
  
  const displayRules = expanded ? rules : rules.slice(0, 2)
  const hasMore = rules.length > 2
  
  return (
    <div className="flex flex-col gap-1">
      <div className="font-mono text-xs space-y-0.5">
        {displayRules.map((rule, idx) => (
          <div key={idx} className={expanded ? "break-all" : "truncate"}>
            "{rule.key}": {JSON.stringify(rule.value)}
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
 * Create Wappalyzer fingerprint table column definitions
 */
export function createWappalyzerFingerprintColumns({
  formatDate,
  t,
}: ColumnOptions): ColumnDef<WappalyzerFingerprint>[] {
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
      size: 180,
    },
    {
      accessorKey: "cats",
      meta: { title: t.columns.cats },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.cats} />
      ),
      cell: ({ row }) => {
        const cats = row.getValue("cats") as number[]
        if (!cats || cats.length === 0) return "-"
        return <span className="font-mono text-xs">{JSON.stringify(cats)}</span>
      },
      enableResizing: true,
      size: 100,
    },
    {
      id: "rules",
      meta: { title: t.columns.rules },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.rules} />
      ),
      cell: ({ row }) => <RulesCell fp={row.original} t={t} />,
      enableResizing: true,
      size: 350,
    },
    {
      accessorKey: "implies",
      meta: { title: t.columns.implies },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.implies} />
      ),
      cell: ({ row }) => {
        const implies = row.getValue("implies") as string[]
        if (!implies || implies.length === 0) return "-"
        return <span className="font-mono text-xs">{implies.join(", ")}</span>
      },
      enableResizing: true,
      size: 150,
    },
    {
      accessorKey: "description",
      meta: { title: t.columns.description },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.description} />
      ),
      cell: ({ row }) => <ExpandableCell value={row.getValue("description")} maxLines={2} />,
      enableResizing: true,
      size: 250,
    },
    {
      accessorKey: "website",
      meta: { title: t.columns.website },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.website} />
      ),
      cell: ({ row }) => <ExpandableCell value={row.getValue("website")} variant="url" maxLines={1} />,
      enableResizing: true,
      size: 180,
    },
    {
      accessorKey: "cpe",
      meta: { title: t.columns.cpe },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t.columns.cpe} />
      ),
      cell: ({ row }) => {
        const cpe = row.getValue("cpe") as string
        return cpe ? <span className="font-mono text-xs">{cpe}</span> : "-"
      },
      enableResizing: true,
      size: 150,
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
