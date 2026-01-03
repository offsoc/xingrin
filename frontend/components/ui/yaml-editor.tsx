"use client"

import React, { useState, useCallback } from "react"
import Editor from "@monaco-editor/react"
import * as yaml from "js-yaml"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { useColorTheme } from "@/hooks/use-color-theme"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface YamlEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  height?: string
  className?: string
  showValidation?: boolean
  onValidationChange?: (isValid: boolean, error?: { message: string; line?: number; column?: number }) => void
}

/**
 * YAML Editor component with Monaco Editor
 * Provides VSCode-level editing experience with syntax highlighting and validation
 */
export function YamlEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  height = "100%",
  className,
  showValidation = true,
  onValidationChange,
}: YamlEditorProps) {
  const t = useTranslations("common.yamlEditor")
  const { currentTheme } = useColorTheme()
  const [isEditorReady, setIsEditorReady] = useState(false)
  const [yamlError, setYamlError] = useState<{ message: string; line?: number; column?: number } | null>(null)

  // Validate YAML syntax
  const validateYaml = useCallback((content: string) => {
    if (!content.trim()) {
      setYamlError(null)
      onValidationChange?.(true)
      return true
    }

    try {
      yaml.load(content)
      setYamlError(null)
      onValidationChange?.(true)
      return true
    } catch (error) {
      const yamlException = error as yaml.YAMLException
      const errorInfo = {
        message: yamlException.message,
        line: yamlException.mark?.line ? yamlException.mark.line + 1 : undefined,
        column: yamlException.mark?.column ? yamlException.mark.column + 1 : undefined,
      }
      setYamlError(errorInfo)
      onValidationChange?.(false, errorInfo)
      return false
    }
  }, [onValidationChange])

  // Handle editor content change
  const handleEditorChange = useCallback((newValue: string | undefined) => {
    const content = newValue || ""
    onChange(content)
    validateYaml(content)
  }, [onChange, validateYaml])

  // Handle editor mount
  const handleEditorDidMount = useCallback(() => {
    setIsEditorReady(true)
    // Validate initial content
    validateYaml(value)
  }, [validateYaml, value])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Validation status */}
      {showValidation && (
        <div className="flex items-center justify-end px-2 py-1 border-b bg-muted/30">
          {value.trim() && (
            yamlError ? (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{t("syntaxError")}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{t("syntaxValid")}</span>
              </div>
            )
          )}
        </div>
      )}

      {/* Monaco Editor */}
      <div className={cn("flex-1 overflow-hidden", yamlError ? 'border-destructive' : '')}>
        <Editor
          height={height}
          defaultLanguage="yaml"
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme={currentTheme.isDark ? "vs-dark" : "light"}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: "on",
            wordWrap: "off",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            folding: true,
            foldingStrategy: "indentation",
            showFoldingControls: "mouseover",
            bracketPairColorization: {
              enabled: true,
            },
            padding: {
              top: 8,
              bottom: 8,
            },
            readOnly: disabled,
            placeholder: placeholder,
          }}
          loading={
            <div className="flex items-center justify-center h-full bg-muted/30">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-xs text-muted-foreground">{t("loading")}</p>
              </div>
            </div>
          }
        />
      </div>

      {/* Error message display */}
      {yamlError && (
        <div className="flex items-start gap-2 p-2 bg-destructive/10 border-t border-destructive/20">
          <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-xs">
            <p className="font-medium text-destructive">
              {yamlError.line && yamlError.column
                ? t("errorLocation", { line: yamlError.line, column: yamlError.column })
                : t("syntaxError")}
            </p>
            <p className="text-muted-foreground truncate">{yamlError.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}
