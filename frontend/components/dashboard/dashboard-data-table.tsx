"use client"

import * as React from "react"
import { IconBug, IconRadar } from "@tabler/icons-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { UnifiedDataTable } from "@/components/ui/data-table"
import { useAllVulnerabilities } from "@/hooks/use-vulnerabilities"
import { useScans } from "@/hooks/use-scans"
import { VulnerabilityDetailDialog } from "@/components/vulnerabilities/vulnerability-detail-dialog"
import { createVulnerabilityColumns } from "@/components/vulnerabilities/vulnerabilities-columns"
import { createScanHistoryColumns } from "@/components/scan/history/scan-history-columns"
import { ScanProgressDialog, buildScanProgressData, type ScanProgressData } from "@/components/scan/scan-progress-dialog"
import { getScan } from "@/services/scan.service"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { deleteScan, stopScan } from "@/services/scan.service"
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
import type { Vulnerability } from "@/types/vulnerability.types"
import type { ScanRecord } from "@/types/scan.types"
import type { PaginationInfo } from "@/types/common.types"

export function DashboardDataTable() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = React.useState("scans")
  
  // 漏洞详情弹窗
  const [selectedVuln, setSelectedVuln] = React.useState<Vulnerability | null>(null)
  const [vulnDialogOpen, setVulnDialogOpen] = React.useState(false)
  
  // 扫描进度弹窗
  const [progressData, setProgressData] = React.useState<ScanProgressData | null>(null)
  const [progressDialogOpen, setProgressDialogOpen] = React.useState(false)
  
  // 删除确认弹窗
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [scanToDelete, setScanToDelete] = React.useState<ScanRecord | null>(null)
  
  // 停止确认弹窗
  const [stopDialogOpen, setStopDialogOpen] = React.useState(false)
  const [scanToStop, setScanToStop] = React.useState<ScanRecord | null>(null)
  
  // 分页状态
  const [vulnPagination, setVulnPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const [scanPagination, setScanPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  // 获取漏洞数据
  const vulnQuery = useAllVulnerabilities({
    page: vulnPagination.pageIndex + 1,
    pageSize: vulnPagination.pageSize,
  })
  
  // 获取扫描数据
  const scanQuery = useScans({
    page: scanPagination.pageIndex + 1,
    pageSize: scanPagination.pageSize,
  })

  // 删除扫描的 mutation
  const deleteMutation = useMutation({
    mutationFn: deleteScan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] })
    },
  })

  // 停止扫描的 mutation
  const stopMutation = useMutation({
    mutationFn: stopScan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] })
    },
  })

  const vulnerabilities = vulnQuery.data?.vulnerabilities ?? []
  const scans = scanQuery.data?.results ?? []

  // 格式化日期
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  // 点击漏洞行
  const handleVulnRowClick = React.useCallback((vuln: Vulnerability) => {
    setSelectedVuln(vuln)
    setVulnDialogOpen(true)
  }, [])

  // 漏洞列定义
  const vulnColumns = React.useMemo(
    () => createVulnerabilityColumns({
      formatDate,
      handleViewDetail: handleVulnRowClick,
    }),
    [handleVulnRowClick]
  )

  // 扫描进度查看
  const handleViewProgress = React.useCallback(async (scan: ScanRecord) => {
    try {
      const fullScan = await getScan(scan.id)
      const data = buildScanProgressData(fullScan)
      setProgressData(data)
      setProgressDialogOpen(true)
    } catch (error) {
      console.error("获取扫描详情失败:", error)
    }
  }, [])

  // 处理删除扫描
  const handleDelete = React.useCallback((scan: ScanRecord) => {
    setScanToDelete(scan)
    setDeleteDialogOpen(true)
  }, [])

  // 确认删除
  const confirmDelete = async () => {
    if (!scanToDelete) return
    setDeleteDialogOpen(false)
    try {
      await deleteMutation.mutateAsync(scanToDelete.id)
      toast.success(`已删除扫描记录: ${scanToDelete.targetName}`)
    } catch (error) {
      toast.error("删除失败，请重试")
      console.error('删除失败:', error)
    } finally {
      setScanToDelete(null)
    }
  }

  // 处理停止扫描
  const handleStop = React.useCallback((scan: ScanRecord) => {
    setScanToStop(scan)
    setStopDialogOpen(true)
  }, [])

  // 确认停止
  const confirmStop = async () => {
    if (!scanToStop) return
    setStopDialogOpen(false)
    try {
      await stopMutation.mutateAsync(scanToStop.id)
      toast.success(`已停止扫描任务: ${scanToStop.targetName}`)
    } catch (error) {
      toast.error("停止失败，请重试")
      console.error('停止扫描失败:', error)
    } finally {
      setScanToStop(null)
    }
  }

  // 扫描列定义
  const scanColumns = React.useMemo(
    () => createScanHistoryColumns({
      formatDate,
      navigate: (path: string) => router.push(path),
      handleDelete,
      handleStop,
      handleViewProgress,
    }),
    [router, handleViewProgress, handleDelete, handleStop]
  )

  // 漏洞分页信息
  const vulnPaginationInfo: PaginationInfo = {
    total: vulnQuery.data?.pagination?.total ?? 0,
    page: vulnPagination.pageIndex + 1,
    pageSize: vulnPagination.pageSize,
    totalPages: vulnQuery.data?.pagination?.totalPages ?? 1,
  }

  // 扫描分页信息
  const scanPaginationInfo: PaginationInfo = {
    total: scanQuery.data?.total ?? 0,
    page: scanPagination.pageIndex + 1,
    pageSize: scanPagination.pageSize,
    totalPages: scanQuery.data?.totalPages ?? 1,
  }

  return (
    <>
      <VulnerabilityDetailDialog
        vulnerability={selectedVuln}
        open={vulnDialogOpen}
        onOpenChange={setVulnDialogOpen}
      />
      {progressData && (
        <ScanProgressDialog
          open={progressDialogOpen}
          onOpenChange={setProgressDialogOpen}
          data={progressData}
        />
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除扫描记录 &quot;{scanToDelete?.targetName}&quot; 及其相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 停止扫描确认对话框 */}
      <AlertDialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认停止扫描</AlertDialogTitle>
            <AlertDialogDescription>
              确定要停止扫描任务 &quot;{scanToStop?.targetName}&quot; 吗？扫描将会中止，已收集的数据将会保留。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmStop} 
              className="bg-chart-2 text-white hover:bg-chart-2/90"
            >
              停止扫描
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* 漏洞表格 */}
        <TabsContent value="vulnerabilities" className="mt-0">
          {vulnQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <UnifiedDataTable
              data={vulnerabilities}
              columns={vulnColumns}
              getRowId={(row) => String(row.id)}
              enableRowSelection={false}
              pagination={vulnPagination}
              onPaginationChange={setVulnPagination}
              paginationInfo={vulnPaginationInfo}
              emptyMessage="暂无漏洞数据"
              toolbarLeft={
                <TabsList>
                  <TabsTrigger value="scans" className="gap-1.5">
                    <IconRadar className="h-4 w-4" />
                    扫描历史
                  </TabsTrigger>
                  <TabsTrigger value="vulnerabilities" className="gap-1.5">
                    <IconBug className="h-4 w-4" />
                    漏洞
                  </TabsTrigger>
                </TabsList>
              }
              showAddButton={false}
              showBulkDelete={false}
            />
          )}
        </TabsContent>

        {/* 扫描历史表格 */}
        <TabsContent value="scans" className="mt-0">
          {scanQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <UnifiedDataTable
              data={scans}
              columns={scanColumns}
              getRowId={(row) => String(row.id)}
              enableRowSelection={false}
              pagination={scanPagination}
              onPaginationChange={setScanPagination}
              paginationInfo={scanPaginationInfo}
              emptyMessage="暂无扫描记录"
              toolbarLeft={
                <TabsList>
                  <TabsTrigger value="scans" className="gap-1.5">
                    <IconRadar className="h-4 w-4" />
                    扫描历史
                  </TabsTrigger>
                  <TabsTrigger value="vulnerabilities" className="gap-1.5">
                    <IconBug className="h-4 w-4" />
                    漏洞
                  </TabsTrigger>
                </TabsList>
              }
              showAddButton={false}
              showBulkDelete={false}
            />
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}
