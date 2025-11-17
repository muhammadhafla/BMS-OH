import useSWR, { SWRConfiguration, SWRResponse } from "swr"
import { useToast } from "./useToast"
import { useCallback } from "react"
import axios, { AxiosError, AxiosRequestConfig } from "axios"

// SWR fetcher function
const fetcher = async (url: string, config?: AxiosRequestConfig) => {
  const response = await axios({
    url,
    method: "GET",
    ...config,
  })
  return response.data
}

// API Hook Options
export interface UseApiOptions<T = any> extends SWRConfiguration {
  onError?: (error: AxiosError) => void
  onSuccess?: (data: T) => void
  showErrorToast?: boolean
  showSuccessToast?: boolean
  errorMessage?: string
  successMessage?: string
}

// Generic API hook
export const useApi = <T = any>(
  url: string | null,
  options: UseApiOptions<T> = {}
): SWRResponse<T, AxiosError> => {
  const {
    onError,
    onSuccess,
    showErrorToast = true,
    showSuccessToast = false,
    errorMessage,
    successMessage,
    ...swrOptions
  } = options

  const { showError, showSuccess } = useToast()

  const swrResponse = useSWR<T, AxiosError>(url, fetcher, {
    ...swrOptions,
    onError: useCallback(
      (error: AxiosError, key?: string, config?: any) => {
        if (showErrorToast) {
          showError(errorMessage || (error.response as any)?.data?.message || "An error occurred")
        }
        onError?.(error)
        ;(swrOptions as any).onError?.(error, key, config)
      },
      [showErrorToast, showError, errorMessage, onError, swrOptions]
    ),
    onSuccess: useCallback(
      (data: T, key?: string, config?: any) => {
        if (showSuccessToast && successMessage) {
          showSuccess(successMessage)
        }
        onSuccess?.(data)
        ;(swrOptions as any).onSuccess?.(data, key, config)
      },
      [showSuccessToast, showSuccess, successMessage, onSuccess, swrOptions]
    ),
  })

  return swrResponse
}

// Mutation function for POST/PUT/PATCH/DELETE
export const useMutation = <TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: AxiosError, variables: TVariables) => void
    showSuccessToast?: boolean
    showErrorToast?: boolean
    successMessage?: string
  } = {}
) => {
  const { showSuccess, showError } = useToast()
  const { onSuccess, onError, showSuccessToast, showErrorToast, successMessage } = options

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | undefined> => {
      try {
        const data = await mutationFn(variables)
        
        if (showSuccessToast && successMessage) {
          showSuccess(successMessage)
        }
        
        onSuccess?.(data, variables)
        return data
      } catch (error) {
        const axiosError = error as AxiosError
        
        if (showErrorToast) {
          showError((axiosError.response as any)?.data?.message || "An error occurred")
        }
        
        onError?.(axiosError, variables)
        throw error
      }
    },
    [mutationFn, showSuccess, showError, showSuccessToast, showErrorToast, successMessage, onSuccess, onError]
  )

  return { mutate }
}

// Specific API hooks for common entities
export const useProducts = (search?: string) => {
  const url = search ? `/api/products?search=${encodeURIComponent(search)}` : "/api/products"
  
  return useApi<any[]>(url, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  })
}

export const useCustomers = (query?: string) => {
  const url = query ? `/api/customers?query=${encodeURIComponent(query)}` : "/api/customers"
  
  return useApi<any[]>(url, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })
}

export const useTransactions = (limit?: number) => {
  const url = limit ? `/api/transactions?limit=${limit}` : "/api/transactions"
  
  return useApi<any[]>(url, {
    revalidateOnFocus: true,
    refreshInterval: 30000, // 30 seconds
  })
}

export const useInventory = () => {
  return useApi<any[]>("/api/inventory", {
    revalidateOnFocus: true,
    refreshInterval: 60000, // 1 minute
  })
}

// Export utility functions
export { fetcher }
export type { AxiosError, AxiosRequestConfig }