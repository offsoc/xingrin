"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { YamlEditor } from "@/components/ui/yaml-editor"
import { LoadingSpinner } from "@/components/loading-spinner"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Zap, Settings2, AlertCircle, ChevronRight, ChevronLeft, Target, Server } from "lucide-react"
import { quickScan } from "@/services/scan.service"
import { CAPABILITY_CONFIG, getEngineIcon, parseEngineCapabilities, mergeEngineConfigurations } from "@/lib/engine-config"
import { TargetValidator } from "@/lib/target-validator"
import { useEngines } from "@/hooks/use-engines"

interface QuickScanDialogProps {
  trigger?: React.ReactNode
}

export function QuickScanDialog({ trigger }: QuickScanDialogProps) {
  const t = useTranslations("quickScan")
  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [step, setStep] = React.useState(1)
  
  const [targetInput, setTargetInput] = React.useState("")
  const [selectedEngineIds, setSelectedEngineIds] = React.useState<number[]>([])
  
  // Configuration state management
  const [configuration, setConfiguration] = React.useState("")
  const [isConfigEdited, setIsConfigEdited] = React.useState(false)
  const [isYamlValid, setIsYamlValid] = React.useState(true)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = React.useState(false)
  const [pendingEngineChange, setPendingEngineChange] = React.useState<{ engineId: number; checked: boolean } | null>(null)
  
  const { data: engines, isLoading, error } = useEngines()
  
  const lineNumbersRef = React.useRef<HTMLDivElement | null>(null)
  
  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop
    }
  }
  
  const validationResults = React.useMemo(() => {
    const lines = targetInput.split('\n')
    return TargetValidator.validateInputBatch(lines)
  }, [targetInput])
  
  const validInputs = validationResults.filter(r => r.isValid && !r.isEmptyLine)
  const invalidInputs = validationResults.filter(r => !r.isValid)
  const hasErrors = invalidInputs.length > 0
  
  const selectedEngines = React.useMemo(() => {
    if (!selectedEngineIds.length || !engines) return []
    return engines.filter(e => selectedEngineIds.includes(e.id))
  }, [selectedEngineIds, engines])
  
  const selectedCapabilities = React.useMemo(() => {
    if (!selectedEngines.length) return []
    const allCaps = new Set<string>()
    selectedEngines.forEach((engine) => {
      parseEngineCapabilities(engine.configuration || "").forEach((cap) => allCaps.add(cap))
    })
    return Array.from(allCaps)
  }, [selectedEngines])
  
  // Update configuration when engines change (if not manually edited)
  const updateConfigurationFromEngines = React.useCallback((engineIds: number[]) => {
    if (!engines) return
    const selectedEngs = engines.filter(e => engineIds.includes(e.id))
    const mergedConfig = mergeEngineConfigurations(selectedEngs.map(e => e.configuration || ""))
    setConfiguration(mergedConfig)
  }, [engines])
  
  const resetForm = () => {
    setTargetInput("")
    setSelectedEngineIds([])
    setConfiguration("")
    setIsConfigEdited(false)
    setStep(1)
  }
  
  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) resetForm()
  }
  
  const applyEngineChange = (engineId: number, checked: boolean) => {
    let newEngineIds: number[]
    if (checked) {
      newEngineIds = [...selectedEngineIds, engineId]
    } else {
      newEngineIds = selectedEngineIds.filter((id) => id !== engineId)
    }
    setSelectedEngineIds(newEngineIds)
    updateConfigurationFromEngines(newEngineIds)
    setIsConfigEdited(false)
  }
  
  const handleEngineToggle = (engineId: number, checked: boolean) => {
    if (isConfigEdited) {
      // User has edited config, show confirmation
      setPendingEngineChange({ engineId, checked })
      setShowOverwriteConfirm(true)
    } else {
      applyEngineChange(engineId, checked)
    }
  }
  
  const handleOverwriteConfirm = () => {
    if (pendingEngineChange) {
      applyEngineChange(pendingEngineChange.engineId, pendingEngineChange.checked)
    }
    setShowOverwriteConfirm(false)
    setPendingEngineChange(null)
  }
  
  const handleOverwriteCancel = () => {
    setShowOverwriteConfirm(false)
    setPendingEngineChange(null)
  }
  
  const handleConfigurationChange = (value: string) => {
    setConfiguration(value)
    setIsConfigEdited(true)
  }
  
  const handleYamlValidationChange = (isValid: boolean) => {
    setIsYamlValid(isValid)
  }
  
  const canProceedToStep2 = validInputs.length > 0 && !hasErrors
  const canSubmit = selectedEngineIds.length > 0 && configuration.trim().length > 0 && isYamlValid
  
  const handleNext = () => {
    if (step === 1 && canProceedToStep2) setStep(2)
  }
  
  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }
  
  const steps = [
    { id: 1, title: t("step1Title"), icon: Target },
    { id: 2, title: t("step2Title"), icon: Server },
  ]
  
  const handleSubmit = async () => {
    if (validInputs.length === 0) {
      toast.error(t("toast.noValidTarget"))
      return
    }
    if (hasErrors) {
      toast.error(t("toast.hasInvalidInputs", { count: invalidInputs.length }))
      return
    }
    if (selectedEngineIds.length === 0) {
      toast.error(t("toast.selectEngine"))
      return
    }
    if (!configuration.trim()) {
      toast.error(t("toast.emptyConfig"))
      return
    }
    
    const targets = validInputs.map(r => r.originalInput)
    
    setIsSubmitting(true)
    try {
      const response = await quickScan({
        targets: targets.map(name => ({ name })),
        configuration,
        engineIds: selectedEngineIds,
        engineNames: selectedEngines.map(e => e.name),
      })
      
      const { targetStats, scans, count } = response
      const scanCount = scans?.length || count || 0
      
      toast.success(t("toast.createSuccess", { count: scanCount }), {
        description: targetStats.failed > 0 
          ? t("toast.createSuccessDesc", { created: targetStats.created, failed: targetStats.failed })
          : undefined
      })
      handleClose(false)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { code?: string; message?: string }; detail?: string } } }
      toast.error(err?.response?.data?.detail || err?.response?.data?.error?.message || t("toast.createFailed"))
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger || (
          <div className="relative group">
            <div className="absolute -inset-[1px] rounded-md overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent animate-border-flow" />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 relative bg-background border-primary/20">
              <Zap className="h-4 w-4 text-primary" />
              {t("title")}
            </Button>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] sm:max-w-[900px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                {t("title")}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {t("description")}
              </DialogDescription>
            </div>
            {/* Step indicator */}
            <div className="flex items-center gap-2 mr-8">
              {steps.map((s, index) => (
                <React.Fragment key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (s.id < step) setStep(s.id)
                      else if (s.id === 2 && canProceedToStep2) setStep(2)
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors",
                      step === s.id
                        ? "bg-primary text-primary-foreground"
                        : step > s.id
                          ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                          : "bg-muted text-muted-foreground"
                    )}
                    disabled={s.id > step && !(s.id === 2 && canProceedToStep2)}
                  >
                    <s.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{s.title}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "w-8 h-[2px]",
                      step > s.id ? "bg-primary/50" : "bg-muted"
                    )} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="border-t h-[480px] overflow-hidden">
          {/* Step 1: Target input */}
          {step === 1 && (
            <div className="flex flex-col h-full">
              <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
                <h3 className="text-sm leading-6">
                  <span className="font-medium">{t("scanTargets")}</span>
                  <span className="text-muted-foreground">：{t("supportedFormats")}</span>
                </h3>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 flex overflow-hidden">
                  <div className="flex-shrink-0 w-10 bg-muted/30">
                    <div ref={lineNumbersRef} className="py-3 px-2 text-right font-mono text-xs text-muted-foreground leading-[1.5] h-full overflow-y-auto scrollbar-hide">
                      {Array.from({ length: Math.max(targetInput.split('\n').length, 20) }, (_, i) => (
                        <div key={i + 1} className="h-[21px]">{i + 1}</div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <Textarea 
                      value={targetInput} 
                      onChange={(e) => setTargetInput(e.target.value)} 
                      onScroll={handleTextareaScroll} 
                      placeholder={t("targetPlaceholder")} 
                      className="font-mono h-full overflow-y-auto resize-none border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm py-3 px-3" 
                      style={{ lineHeight: '21px' }} 
                      autoFocus 
                    />
                  </div>
                </div>
                {hasErrors && (
                  <div className="px-3 py-2 border-t bg-destructive/5 max-h-[60px] overflow-y-auto">
                    {invalidInputs.slice(0, 2).map((r) => (
                      <div key={r.lineNumber} className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{t("lineError", { lineNumber: r.lineNumber, error: r.error || "" })}</span>
                      </div>
                    ))}
                    {invalidInputs.length > 2 && <div className="text-xs text-muted-foreground">{t("moreErrors", { count: invalidInputs.length - 2 })}</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Select engines */}
          {step === 2 && (
            <div className="flex h-full">
              <div className="w-[320px] border-r flex flex-col shrink-0">
                <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
                  <h3 className="text-sm font-medium">{t("selectEngine")}</h3>
                  {selectedEngineIds.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("selectedCount", { count: selectedEngineIds.length })}
                    </p>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="p-2">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner />
                        <span className="ml-2 text-sm text-muted-foreground">{t("loading")}</span>
                      </div>
                    ) : error ? (
                      <div className="py-8 text-center text-sm text-destructive">{t("loadFailed")}</div>
                    ) : !engines?.length ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">{t("noEngines")}</div>
                    ) : (
                      <div className="space-y-1">
                        {engines.map((engine) => {
                          const capabilities = parseEngineCapabilities(engine.configuration || "")
                          const EngineIcon = getEngineIcon(capabilities)
                          const primaryCap = capabilities[0]
                          const iconConfig = primaryCap ? CAPABILITY_CONFIG[primaryCap] : null
                          const isSelected = selectedEngineIds.includes(engine.id)

                          return (
                            <label
                              key={engine.id}
                              htmlFor={`quick-engine-${engine.id}`}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                                isSelected
                                  ? "bg-primary/10 border border-primary/30"
                                  : "hover:bg-muted/50 border border-transparent"
                              )}
                            >
                              <Checkbox
                                id={`quick-engine-${engine.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => handleEngineToggle(engine.id, checked as boolean)}
                                disabled={isSubmitting}
                              />
                              <div
                                className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-md shrink-0",
                                  iconConfig?.color || "bg-muted text-muted-foreground"
                                )}
                              >
                                <EngineIcon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{engine.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {capabilities.length > 0 ? t("capabilities", { count: capabilities.length }) : t("noConfig")}
                                </div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {selectedEngines.length > 0 ? (
                  <>
                    <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2 shrink-0">
                      <Settings2 className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium truncate">
                        {selectedEngines.map((e) => e.name).join(", ")}
                      </h3>
                      {isConfigEdited && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {t("configEdited")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
                      {selectedCapabilities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 shrink-0">
                          {selectedCapabilities.map((capKey) => {
                            const config = CAPABILITY_CONFIG[capKey]
                            return (
                              <Badge key={capKey} variant="outline" className={cn("text-xs", config?.color)}>
                                {config?.label || capKey}
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                      <div className="flex-1 bg-muted/50 rounded-lg border overflow-hidden min-h-0">
                        <YamlEditor
                          value={configuration}
                          onChange={handleConfigurationChange}
                          disabled={isSubmitting}
                          onValidationChange={handleYamlValidationChange}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2 shrink-0">
                      <Settings2 className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium">{t("configTitle")}</h3>
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden p-4">
                      <div className="flex-1 bg-muted/50 rounded-lg border overflow-hidden min-h-0">
                        <YamlEditor
                          value={configuration}
                          onChange={handleConfigurationChange}
                          disabled={isSubmitting}
                          onValidationChange={handleYamlValidationChange}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        <DialogFooter className="px-4 py-4 border-t !flex !items-center !justify-between">
          <div className="text-sm">
            {step === 1 && validInputs.length > 0 && (
              <span className="text-primary">{t("validTargets", { count: validInputs.length })}</span>
            )}
            {step === 1 && hasErrors && (
              <span className="text-destructive ml-2">{t("invalidTargets", { count: invalidInputs.length })}</span>
            )}
            {step === 2 && selectedEngineIds.length > 0 && (
              <span className="text-primary">{t("selectedCount", { count: selectedEngineIds.length })}</span>
            )}
          </div>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t("back")}
              </Button>
            )}
            {step === 1 ? (
              <Button 
                onClick={handleNext} 
                disabled={!canProceedToStep2}
              >
                {t("next")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoadingSpinner />
                    {t("creating")}
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    {t("startScan")}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
      
      {/* Overwrite confirmation dialog */}
      <AlertDialog open={showOverwriteConfirm} onOpenChange={setShowOverwriteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("overwriteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("overwriteConfirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleOverwriteCancel}>
              {t("overwriteConfirm.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleOverwriteConfirm}>
              {t("overwriteConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
