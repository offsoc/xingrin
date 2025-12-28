"use client"

import type { Header } from "@tanstack/react-table"
import { cn } from "@/lib/utils"

interface ColumnResizerProps<TData> {
  header: Header<TData, unknown>
  className?: string
}

/**
 * 统一的列宽调整手柄组件
 * 
 * 设计规范：
 * - 可点击区域宽度：16px (w-4)，符合桌面端交互需求
 * - 视觉指示线宽度：2px (w-0.5)，符合行业标准
 * - 高度：100% 填满表头
 * - 支持 mouse 和 touch 事件
 * - 双击重置列宽
 * - hover 时显示背景和高亮指示线
 * 
 * 参考标准：
 * - WCAG 2.5.5 建议触摸目标至少 44x44px（移动端）
 * - 桌面端 8-16px 是常见实践（AG Grid, Material UI 等）
 * - TanStack Table 官方示例使用 8px
 */
export function ColumnResizer<TData>({ header, className }: ColumnResizerProps<TData>) {
  if (!header.column.getCanResize()) {
    return null
  }

  const resizeHandler = header.getResizeHandler()

  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        resizeHandler(e)
      }}
      onTouchStart={(e) => {
        e.stopPropagation()
        resizeHandler(e)
      }}
      onDoubleClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        header.column.resetSize()
      }}
      className={cn(
        // 可点击区域：16px 宽，100% 高
        "group absolute right-0 top-0 h-full w-4 cursor-col-resize select-none touch-none z-10",
        "flex items-center justify-center",
        // 拖动时显示背景，hover 时显示淡背景
        header.column.getIsResizing() ? "bg-primary/20" : "hover:bg-muted/50",
        className
      )}
    >
      {/* 视觉指示线：2px 宽，80% 高，仅在 hover 或拖动时显示 */}
      <div 
        className={cn(
          "w-0.5 h-4/5 rounded-full transition-all",
          header.column.getIsResizing() 
            ? "bg-primary opacity-100" 
            : "bg-primary/50 opacity-0 group-hover:opacity-100"
        )} 
      />
    </div>
  )
}
