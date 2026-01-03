"use client"

import { useMemo } from "react"
import { useTranslations, useFormatter } from "next-intl"
import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader, UnifiedDataTable } from "@/components/ui/data-table"
import { ExpandableCell, ExpandableTagList } from "@/components/ui/data-table/expandable-cell"
import type { SearchResult, AssetType, Vulnerability, EndpointSearchResult } from "@/types/search.types"

interface SearchResultsTableProps {
  results: SearchResult[]
  assetType: AssetType
  onViewVulnerability?: (vuln: Vulnerability) => void
}

export function SearchResultsTable({ results, assetType }: SearchResultsTableProps) {
  const t = useTranslations('search.table')
  const format = useFormatter()

  const formatDate = (dateString: string) => {
    return format.dateTime(new Date(dateString), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 基础列定义（Website 和 Endpoint 共用）
  const baseColumns: ColumnDef<SearchResult, unknown>[] = useMemo(() => [
    {
      id: "url",
      accessorKey: "url",
      meta: { title: t('url') },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('url')} />
      ),
      size: 350,
      minSize: 200,
      maxSize: 600,
      cell: ({ row }) => (
        <ExpandableCell value={row.getValue("url")} />
      ),
    },
    {
      id: "host",
      accessorKey: "host",
      meta: { title: t('host') },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('host')} />
      ),
      size: 180,
      minSize: 100,
      maxSize: 250,
      cell: ({ row }) => (
        <ExpandableCell value={row.getValue("host")} />
      ),
    },
    {
      id: "title",
      accessorKey: "title",
      meta: { title: t('title') },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('title')} />
      ),
      size: 150,
      minSize: 100,
      maxSize: 300,
      cell: ({ row }) => (
        <ExpandableCell value={row.getValue("title")} />
      ),
    },
    {
      id: "statusCode",
      accessorKey: "statusCode",
      meta: { title: t('status') },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('status')} />
      ),
      size: 80,
      minSize: 60,
      maxSize: 100,
      cell: ({ row }) => {
        const statusCode = row.getValue("statusCode") as number | null
        if (!statusCode) return <span className="text-muted-foreground">-</span>
        
        let variant: "default" | "secondary" | "destructive" | "outline" = "outline"
        if (statusCode >= 200 && statusCode < 300) {
          variant = "outline"
        } else if (statusCode >= 300 && statusCode < 400) {
          variant = "secondary"
        } else if (statusCode >= 400 && statusCode < 500) {
          variant = "default"
        } else if (statusCode >= 500) {
          variant = "destructive"
        }
        
        return <Badge variant={variant} className="font-mono">{statusCode}</Badge>
      },
    },
    {
      id: "technologies",
      accessorKey: "technologies",
      meta: { title: t('technologies') },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('technologies')} />
      ),
      size: 180,
      minSize: 120,
      cell: ({ row }) => {
        const tech = row.getValue("technologies") as string[] | null
        if (!tech || tech.length === 0) return <span className="text-muted-foreground">-</span>
        return <ExpandableTagList items={tech} maxLines={2} variant="outline" />
      },
    },
    {
      id: "contentLength",
      accessorKey: "contentLength",
      meta: { title: t('contentLength') },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('contentLength')} />
      ),
      size: 100,
      minSize: 80,
      maxSize: 150,
      cell: ({ row }) => {
        const len = row.getValue("contentLength") as number | null
        if (len === null || len === undefined) return <span className="text-muted-foreground">-</span>
        return <span className="font-mono tabular-nums">{new Intl.NumberFormat().format(len)}</span>
      },
    },
    {
      id: "location",
      accessorKey: "location",
      meta: { title: t('location') },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('location')} />
      ),
      size: 150,
      minSize: 100,
      maxSize: 300,
      cell: ({ row }) => (
        <ExpandableCell value={row.getValue("location")} />
      ),
    },
    {
      id: "webserver",
      accessorKey: "webserver",
      meta: { title: t('webserver') },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('webserver')} />
      ),
      size: 120,
      minSize: 80,
      maxSize: 200,
      cell: ({ row }) => (
        <ExpandableCell value={row.getValue("webserver")} />
      ),
    },
    {
      id: "contentType",
      accessorKey: "contentType",
      meta: { title: t('contentType') },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('contentType')} />
      ),
      size: 120,
      minSize: 80,
      maxSize: 200,
      cell: ({ row }) => (
        <ExpandableCell value={row.getValue("contentType")} />
      ),
    },
    {
      id: "responseBody",
      accessorKey: "responseBody",
      meta: { title: t('responseBody') },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('responseBody')} />
      ),
      size: 300,
      minSize: 200,
      cell: ({ row }) => (
        <ExpandableCell value={row.getValue("responseBody")} maxLines={3} />
      ),
    },
    {
      id: "responseHeaders",
      accessorKey: "responseHeaders",
      meta: { title: t('responseHeaders') },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('responseHeaders')} />
      ),
      size: 250,
      minSize: 150,
      maxSize: 400,
      cell: ({ row }) => {
        const headers = row.getValue("responseHeaders") as Record<string, string> | null
        if (!headers || Object.keys(headers).length === 0) {
          return <span className="text-muted-foreground">-</span>
        }
        const headersStr = Object.entries(headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')
        return <ExpandableCell value={headersStr} maxLines={3} />
      },
    },
    {
      id: "vhost",
      accessorKey: "vhost",
      meta: { title: t('vhost') },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('vhost')} />
      ),
      size: 80,
      minSize: 60,
      maxSize: 100,
      cell: ({ row }) => {
        const vhost = row.getValue("vhost") as boolean | null
        if (vhost === null || vhost === undefined) return <span className="text-muted-foreground">-</span>
        return <span className="font-mono text-sm">{vhost ? "true" : "false"}</span>
      },
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      meta: { title: t('createdAt') },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('createdAt')} />
      ),
      size: 150,
      minSize: 120,
      maxSize: 200,
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as string | null
        if (!createdAt) return <span className="text-muted-foreground">-</span>
        return <span className="text-sm">{formatDate(createdAt)}</span>
      },
    },
  ], [t, formatDate])

  // Endpoint 特有列
  const endpointColumns: ColumnDef<SearchResult, unknown>[] = useMemo(() => [
    {
      id: "matchedGfPatterns",
      accessorKey: "matchedGfPatterns",
      meta: { title: t('gfPatterns') },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('gfPatterns')} />
      ),
      size: 150,
      minSize: 100,
      maxSize: 250,
      cell: ({ row }) => {
        const patterns = (row.original as EndpointSearchResult).matchedGfPatterns
        if (!patterns || patterns.length === 0) return <span className="text-muted-foreground">-</span>
        return <ExpandableTagList items={patterns} maxLines={2} variant="secondary" />
      },
    },
  ], [t])

  // 根据资产类型组合列
  const columns = useMemo(() => {
    if (assetType === 'endpoint') {
      // 在 technologies 后面插入 gfPatterns
      const techIndex = baseColumns.findIndex(col => col.id === 'technologies')
      const cols = [...baseColumns]
      cols.splice(techIndex + 1, 0, ...endpointColumns)
      return cols
    }
    return baseColumns
  }, [assetType, baseColumns, endpointColumns])

  return (
    <UnifiedDataTable
      columns={columns}
      data={results}
      getRowId={(row) => String(row.id)}
      hideToolbar
      hidePagination
      enableRowSelection={false}
    />
  )
}
