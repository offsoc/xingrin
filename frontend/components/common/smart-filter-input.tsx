"use client"

import * as React from "react"
import { IconSearch } from "@tabler/icons-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

// 可用的筛选字段定义
export interface FilterField {
  key: string
  label: string
  description: string
}

// 预定义的字段配置，各页面可以选择使用
export const PREDEFINED_FIELDS: Record<string, FilterField> = {
  ip: { key: "ip", label: "IP", description: "IP address" },
  port: { key: "port", label: "Port", description: "Port number" },
  host: { key: "host", label: "Host", description: "Hostname" },
  domain: { key: "domain", label: "Domain", description: "Domain name" },
  url: { key: "url", label: "URL", description: "Full URL" },
  status: { key: "status", label: "Status", description: "HTTP status code" },
  title: { key: "title", label: "Title", description: "Page title" },
  source: { key: "source", label: "Source", description: "Data source" },
  path: { key: "path", label: "Path", description: "URL path" },
  severity: { key: "severity", label: "Severity", description: "Vulnerability severity" },
  name: { key: "name", label: "Name", description: "Name" },
  type: { key: "type", label: "Type", description: "Type" },
}

// 默认字段（IP Addresses 页面）
const DEFAULT_FIELDS: FilterField[] = [
  PREDEFINED_FIELDS.ip,
  PREDEFINED_FIELDS.port,
  PREDEFINED_FIELDS.host,
]

// 解析筛选表达式 (FOFA 风格)
interface ParsedFilter {
  field: string
  operator: string
  value: string
  raw: string
}

function parseFilterExpression(input: string): ParsedFilter[] {
  const filters: ParsedFilter[] = []
  // 匹配 FOFA 风格: field="value", field=="value", field!="value"
  // == 精确匹配, = 模糊匹配, != 不等于
  // 支持逗号分隔多值: port="80,443,8080"
  const regex = /(\w+)(==|!=|=)"([^"]+)"/g
  let match

  while ((match = regex.exec(input)) !== null) {
    const [raw, field, operator, value] = match
    filters.push({ field, operator, value, raw })
  }

  return filters
}

interface SmartFilterInputProps {
  /** 可用的筛选字段，不传则使用默认字段 */
  fields?: FilterField[]
  /** 组合示例（使用逻辑运算符拼接的完整示例） */
  examples?: string[]
  placeholder?: string
  /** 受控模式：当前过滤值 */
  value?: string
  onSearch?: (filters: ParsedFilter[], rawQuery: string) => void
  className?: string
}

export function SmartFilterInput({
  fields = DEFAULT_FIELDS,
  examples,
  placeholder,
  value,
  onSearch,
  className,
}: SmartFilterInputProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value ?? "")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const savedScrollTop = React.useRef<number | null>(null)
  const hasInitialized = React.useRef(false)

  // 同步外部 value 变化
  React.useEffect(() => {
    if (value !== undefined) {
      setInputValue(value)
    }
  }, [value])

  // 当 Popover 打开时，恢复滚动位置（首次打开时滚动到顶部）
  React.useEffect(() => {
    if (open) {
      const restoreScroll = () => {
        if (listRef.current) {
          if (!hasInitialized.current) {
            // 首次打开，滚动到顶部
            listRef.current.scrollTop = 0
            hasInitialized.current = true
          } else if (savedScrollTop.current !== null) {
            // 之后恢复保存的滚动位置
            listRef.current.scrollTop = savedScrollTop.current
          }
        }
      }
      // 立即执行一次
      restoreScroll()
      // 延迟执行确保 Popover 动画完成
      const timer = setTimeout(restoreScroll, 50)
      return () => clearTimeout(timer)
    } else {
      // Popover 关闭时保存滚动位置
      if (listRef.current) {
        savedScrollTop.current = listRef.current.scrollTop
      }
    }
  }, [open])

  // 生成默认 placeholder（使用第一个示例或字段组合）
  const defaultPlaceholder = React.useMemo(() => {
    if (examples && examples.length > 0) {
      return examples[0]
    }
    // 使用字段生成简单示例
    return fields.slice(0, 2).map(f => `${f.key}="..."`).join(" && ")
  }, [fields, examples])

  // 解析当前输入
  const parsedFilters = parseFilterExpression(inputValue)

  // 获取当前正在输入的词
  const getCurrentWord = () => {
    const words = inputValue.split(/\s+/)
    return words[words.length - 1] || ""
  }

  const currentWord = getCurrentWord()

  // 判断是否显示字段建议 (FOFA 风格用 = 而不是 :)
  const showFieldSuggestions = !currentWord.includes("=")

  // 处理选择建议 (FOFA 风格: field="")，然后关闭弹窗
  const handleSelectSuggestion = (suggestion: string) => {
    const words = inputValue.split(/\s+/)
    words[words.length - 1] = suggestion
    const newValue = words.join(" ")
    setInputValue(newValue)
    setOpen(false)
    inputRef.current?.blur()
  }

  // 处理搜索
  const handleSearch = () => {
    onSearch?.(parsedFilters, inputValue)
    setOpen(false)
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
    if (e.key === "Escape") {
      setOpen(false)
    }
  }

  // 附加示例到输入框（而非覆盖），然后关闭弹窗
  const handleAppendExample = (example: string) => {
    const trimmed = inputValue.trim()
    const newValue = trimmed ? `${trimmed} ${example}` : example
    setInputValue(newValue)
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverAnchor asChild>
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                if (!open) setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onBlur={(e) => {
                // 如果焦点转移到 Popover 内部或输入框自身，不关闭
                const relatedTarget = e.relatedTarget as HTMLElement | null
                if (relatedTarget?.closest('[data-radix-popper-content-wrapper]')) {
                  return
                }
                // 延迟关闭，让 CommandItem 的 onSelect 先执行
                setTimeout(() => setOpen(false), 150)
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || defaultPlaceholder}
              className="h-8 w-full"
            />
            <Button variant="outline" size="sm" onClick={handleSearch}>
              <IconSearch className="h-4 w-4" />
            </Button>
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          side="bottom"
          sideOffset={4}
          collisionPadding={16}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            // 如果点击的是输入框，不关闭弹窗
            if (inputRef.current?.contains(e.target as Node)) {
              e.preventDefault()
            }
          }}
        >
          <Command>
            <CommandList ref={listRef}>
              {/* 已解析的筛选条件预览 */}
              {parsedFilters.length > 0 && (
                <CommandGroup heading="Active filters">
                  <div className="flex flex-wrap gap-1 px-2 py-1">
                    {parsedFilters.map((filter, i) => (
                      <Badge key={i} variant="secondary" className="text-xs font-mono">
                        {filter.raw}
                      </Badge>
                    ))}
                  </div>
                </CommandGroup>
              )}

              {/* 可用字段 */}
              {showFieldSuggestions && (
                <CommandGroup heading="Available fields">
                  <div className="flex flex-wrap gap-1 px-2 py-1">
                    {fields.filter(
                      (f) => !currentWord || f.key.startsWith(currentWord.toLowerCase())
                    ).map((field) => (
                      <Badge 
                        key={field.key} 
                        variant="outline" 
                        className="text-xs font-mono cursor-pointer hover:bg-accent"
                        onClick={() => handleSelectSuggestion(`${field.key}="`)}
                      >
                        {field.key}
                      </Badge>
                    ))}
                  </div>
                </CommandGroup>
              )}

              {/* 语法帮助 */}
              <CommandGroup heading="Syntax">
                <div className="px-2 py-1.5 text-xs text-muted-foreground space-y-2">
                  {/* 匹配操作符 */}
                  <div className="space-y-1">
                    <div className="font-medium text-foreground/80">Operators</div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                      <code className="bg-muted px-1 rounded">=</code>
                      <span>contains (fuzzy)</span>
                      <code className="bg-muted px-1 rounded">==</code>
                      <span>exact match</span>
                      <code className="bg-muted px-1 rounded">!=</code>
                      <span>not equals</span>
                    </div>
                  </div>
                  {/* 逻辑运算符 */}
                  <div className="space-y-1 pt-1 border-t border-muted">
                    <div className="font-medium text-foreground/80">Logic</div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                      <span><code className="bg-muted px-1 rounded">||</code> <code className="bg-muted px-1 rounded">or</code></span>
                      <span>match any</span>
                      <span><code className="bg-muted px-1 rounded">&&</code> <code className="bg-muted px-1 rounded">and</code> <code className="bg-muted px-1 rounded">space</code></span>
                      <span>match all</span>
                    </div>
                  </div>
                </div>
              </CommandGroup>

              {/* 示例 */}
              {examples && examples.length > 0 && (
                <CommandGroup heading="Examples">
                  {examples.map((example, i) => (
                    <CommandItem
                      key={i}
                      value={example}
                      onSelect={() => handleAppendExample(example)}
                    >
                      <code className="text-xs">{example}</code>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandEmpty>Type to filter...</CommandEmpty>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { parseFilterExpression, DEFAULT_FIELDS, type ParsedFilter }
