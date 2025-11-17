import { toast as sonnerToast } from "sonner"
import { useCallback } from "react"

export type ToastType = "success" | "error" | "warning" | "info" | "loading"

export interface ToastOptions {
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  description?: string
}

export interface ToastOptionsWithId extends ToastOptions {
  id: string
}

export const useToast = () => {
  const showToast = useCallback(
    (type: ToastType, title: string, options?: ToastOptions) => {
      switch (type) {
        case "success":
          return sonnerToast.success(title, options)
        case "error":
          return sonnerToast.error(title, options)
        case "warning":
          return sonnerToast.warning(title, options)
        case "info":
          return sonnerToast.info(title, options)
        case "loading":
          return sonnerToast.loading(title, options)
        default:
          return sonnerToast(title, options)
      }
    },
    []
  )

  const dismiss = useCallback((toastId?: string | number) => {
    sonnerToast.dismiss(toastId)
  }, [])

  const showSuccess = useCallback(
    (title: string, options?: ToastOptions) => showToast("success", title, options),
    [showToast]
  )

  const showError = useCallback(
    (title: string, options?: ToastOptions) => showToast("error", title, options),
    [showToast]
  )

  const showWarning = useCallback(
    (title: string, options?: ToastOptions) => showToast("warning", title, options),
    [showToast]
  )

  const showInfo = useCallback(
    (title: string, options?: ToastOptions) => showToast("info", title, options),
    [showToast]
  )

  const showLoading = useCallback(
    (title: string, options?: ToastOptions) => showToast("loading", title, options),
    [showToast]
  )

  const showPromise = useCallback(
    <T>(
      promise: Promise<T>,
      {
        loading,
        success,
        error,
        ...options
      }: {
        loading: string
        success: string | ((data: T) => string)
        error: string | ((error: any) => string)
      } & Omit<ToastOptions, "description">
    ) => {
      return sonnerToast.promise(promise, {
        loading,
        success,
        error,
        ...options,
      })
    },
    []
  )

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    showPromise,
    dismiss,
  }
}

export default useToast