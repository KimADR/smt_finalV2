'use client'

import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-react'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-border/50 group-[.success]:bg-emerald-500 group-[.info]:bg-primary group-[.warning]:bg-yellow-500 group-[.destructive]:bg-destructive" />
            <div className="grid gap-1 pl-1">
              <div className="flex items-center gap-2">
                {props.className?.includes('success') && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {props.className?.includes('info') && <Info className="h-4 w-4 text-primary" />}
                {props.className?.includes('warning') && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                {props.className?.includes('destructive') && <XCircle className="h-4 w-4 text-destructive" />}
              </div>
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
