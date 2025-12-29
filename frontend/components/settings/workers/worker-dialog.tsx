"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useCreateWorker, useUpdateWorker } from "@/hooks/use-workers"
import type { WorkerNode } from "@/types/worker.types"

// Explicitly define form type to resolve type inference issues
type FormValues = {
  name: string
  ipAddress: string
  sshPort: number
  username: string
  password?: string
}

interface WorkerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  worker?: WorkerNode | null
}

export function WorkerDialog({ open, onOpenChange, worker }: WorkerDialogProps) {
  const t = useTranslations("settings.workers")
  const tCommon = useTranslations("common.actions")
  const createWorker = useCreateWorker()
  const updateWorker = useUpdateWorker()
  const isEditing = !!worker

  // Form validation Schema - using translations
  const formSchema = z.object({
    name: z.string().min(1, t("form.nameRequired")).max(100, t("form.nameTooLong")),
    ipAddress: z.string()
      .min(1, t("form.ipRequired"))
      .regex(
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
        t("form.ipInvalid")
      ),
    sshPort: z.coerce.number().int().min(1).max(65535),
    username: z.string().min(1, t("form.usernameRequired")),
    password: z.string().optional(),
  })
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any, // Bypass type checking issue
    defaultValues: {
      name: "",
      ipAddress: "",
      sshPort: 22,
      username: "root",
      password: "",
    },
  })

  // Populate form data
  useEffect(() => {
    if (open && worker) {
      form.reset({
        name: worker.name,
        ipAddress: worker.ipAddress,
        sshPort: worker.sshPort,
        username: worker.username,
        password: "", // Don't show password when editing
      })
    } else if (open && !worker) {
      form.reset({
        name: "",
        ipAddress: "",
        sshPort: 22,
        username: "root",
        password: "",
      })
    }
  }, [open, worker, form])

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && worker) {
        await updateWorker.mutateAsync({
          id: worker.id,
          data: {
            name: values.name,
            sshPort: values.sshPort,
            username: values.username,
            password: values.password || undefined, // Don't send if empty
          }
        })
      } else {
        if (!values.password) {
          form.setError("password", { message: t("form.passwordRequired") })
          return
        }
        await createWorker.mutateAsync({
          name: values.name,
          ipAddress: values.ipAddress,
          sshPort: values.sshPort,
          username: values.username,
          password: values.password,
        })
      }
      form.reset()
      onOpenChange(false)
    } catch (error) {
      // Error already handled in hook
    }
  }

  const isPending = createWorker.isPending || updateWorker.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editWorker") : t("addWorkerTitle")}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? t("editWorkerDesc") 
              : t("addWorkerDesc")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.workerName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("form.workerNamePlaceholder")} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("form.workerNameDesc")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ipAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.hostIp")}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t("form.hostIpPlaceholder")} 
                      {...field} 
                      disabled={isEditing} // 编辑时 IP 禁用
                    />
                  </FormControl>
                  {isEditing && (
                    <FormDescription>{t("form.ipNotEditable")}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sshPort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.sshPort")}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.username")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("form.usernamePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.password")}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={isEditing ? t("form.passwordKeepEmpty") : t("form.passwordPlaceholder")} {...field} />
                  </FormControl>
                  <FormDescription>
                    {isEditing ? t("form.passwordEditHint") : t("form.passwordHint")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending 
                  ? (isEditing ? t("form.saving") : t("form.creating")) 
                  : (isEditing ? t("form.saveChanges") : t("form.createWorker"))}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
