"use client"

import React from "react"
import { useTranslations } from "next-intl"
import { ScheduledScanDataTable } from "@/components/scan/scheduled/scheduled-scan-data-table"
import { createScheduledScanColumns } from "@/components/scan/scheduled/scheduled-scan-columns"
import { CreateScheduledScanDialog } from "@/components/scan/scheduled/create-scheduled-scan-dialog"
import { EditScheduledScanDialog } from "@/components/scan/scheduled/edit-scheduled-scan-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  useScheduledScans, 
  useDeleteScheduledScan, 
  useToggleScheduledScan 
} from "@/hooks/use-scheduled-scans"
import type { ScheduledScan } from "@/types/scheduled-scan.types"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"

/**
 * 定时扫描页面
 * 管理定时扫描任务配置
 */
export default function ScheduledScanPage() {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [editingScheduledScan, setEditingScheduledScan] = React.useState<ScheduledScan | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deletingScheduledScan, setDeletingScheduledScan] = React.useState<ScheduledScan | null>(null)
  
  // 国际化
  const tColumns = useTranslations("columns")
  const tCommon = useTranslations("common")
  const tScan = useTranslations("scan")
  const tConfirm = useTranslations("common.confirm")

  // 构建翻译对象
  const translations = React.useMemo(() => ({
    columns: {
      taskName: tColumns("scheduledScan.taskName"),
      scanEngine: tColumns("scheduledScan.scanEngine"),
      cronExpression: tColumns("scheduledScan.cronExpression"),
      scope: tColumns("scheduledScan.scope"),
      status: tColumns("common.status"),
      nextRun: tColumns("scheduledScan.nextRun"),
      runCount: tColumns("scheduledScan.runCount"),
      lastRun: tColumns("scheduledScan.lastRun"),
    },
    actions: {
      editTask: tScan("editTask"),
      delete: tCommon("actions.delete"),
      openMenu: tCommon("actions.openMenu"),
    },
    status: {
      enabled: tCommon("status.enabled"),
      disabled: tCommon("status.disabled"),
    },
    cron: {
      everyMinute: tScan("cron.everyMinute"),
      everyNMinutes: tScan("cron.everyNMinutes"),
      everyHour: tScan("cron.everyHour"),
      everyNHours: tScan("cron.everyNHours"),
      everyDay: tScan("cron.everyDay"),
      everyWeek: tScan("cron.everyWeek"),
      everyMonth: tScan("cron.everyMonth"),
      weekdays: tScan.raw("cron.weekdays") as string[],
    },
  }), [tColumns, tCommon, tScan])
  
  // 分页状态
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)

  // 搜索状态
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isSearching, setIsSearching] = React.useState(false)

  const handleSearchChange = (value: string) => {
    setIsSearching(true)
    setSearchQuery(value)
    setPage(1)
  }
  
  // 使用实际 API
  const { data, isLoading, isFetching, refetch } = useScheduledScans({ page, pageSize, search: searchQuery || undefined })

  // 当请求完成时重置搜索状态
  React.useEffect(() => {
    if (!isFetching && isSearching) {
      setIsSearching(false)
    }
  }, [isFetching, isSearching])
  const { mutate: deleteScheduledScan } = useDeleteScheduledScan()
  const { mutate: toggleScheduledScan } = useToggleScheduledScan()

  const scheduledScans = data?.results || []
  const total = data?.total || 0
  const totalPages = data?.totalPages || 1

  // 格式化日期
  const formatDate = React.useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [])

  // 编辑任务
  const handleEdit = React.useCallback((scan: ScheduledScan) => {
    setEditingScheduledScan(scan)
    setEditDialogOpen(true)
  }, [])

  // 删除任务（打开确认弹窗）
  const handleDelete = React.useCallback((scan: ScheduledScan) => {
    setDeletingScheduledScan(scan)
    setDeleteDialogOpen(true)
  }, [])

  // 确认删除任务
  const confirmDelete = React.useCallback(() => {
    if (deletingScheduledScan) {
      deleteScheduledScan(deletingScheduledScan.id)
      setDeleteDialogOpen(false)
      setDeletingScheduledScan(null)
    }
  }, [deletingScheduledScan, deleteScheduledScan])

  // 切换任务启用状态
  const handleToggleStatus = React.useCallback((scan: ScheduledScan, enabled: boolean) => {
    toggleScheduledScan({ id: scan.id, isEnabled: enabled })
  }, [toggleScheduledScan])

  // 页码变化处理
  const handlePageChange = React.useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  // 每页数量变化处理
  const handlePageSizeChange = React.useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setPage(1) // 重置到第一页
  }, [])

  // 添加新任务
  const handleAddNew = React.useCallback(() => {
    setCreateDialogOpen(true)
  }, [])

  // 创建列定义
  const columns = React.useMemo(
    () =>
      createScheduledScanColumns({
        formatDate,
        handleEdit,
        handleDelete,
        handleToggleStatus,
        t: translations,
      }),
    [formatDate, handleEdit, handleDelete, handleToggleStatus, translations]
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div>
            <h1 className="text-3xl font-bold">{tScan("scheduled.title")}</h1>
            <p className="text-muted-foreground mt-1">{tScan("scheduled.description")}</p>
          </div>
        </div>
        <DataTableSkeleton
          toolbarButtonCount={2}
          rows={5}
          columns={6}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* 页面标题 */}
      <div className="px-4 lg:px-6">
        <div>
          <h1 className="text-3xl font-bold">{tScan("scheduled.title")}</h1>
          <p className="text-muted-foreground mt-1">{tScan("scheduled.description")}</p>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="px-4 lg:px-6">
        <ScheduledScanDataTable
          data={scheduledScans}
          columns={columns}
          onAddNew={handleAddNew}
          searchPlaceholder={tScan("scheduled.searchPlaceholder")}
          searchValue={searchQuery}
          onSearch={handleSearchChange}
          isSearching={isSearching}
          addButtonText={tScan("scheduled.createTitle")}
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      {/* 新建定时扫描对话框 */}
      <CreateScheduledScanDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => refetch()}
      />

      {/* 编辑定时扫描对话框 */}
      <EditScheduledScanDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        scheduledScan={editingScheduledScan}
        onSuccess={() => refetch()}
      />

      {/* 删除确认弹窗 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tConfirm("deleteScheduledScanMessage", { name: deletingScheduledScan?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tCommon("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
