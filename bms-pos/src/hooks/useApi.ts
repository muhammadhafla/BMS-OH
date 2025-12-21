import { useToast } from './useToast'
import { useCallback, useEffect, useRef, useState } from 'react'
import axios, { AxiosError, AxiosRequestConfig } from 'axios'

// API fetcher function
const fetcher = async (url: string, config?: AxiosRequestConfig) => {
  const response = await axios({
    url,
    method: 'GET',
    ...config,
  })
  return response.data
}

// API Hook Response
export interface ApiResponse<T> {
  data: T | null
  error: AxiosError | null
  isLoading: boolean
  isValidating: boolean
  mutate: () => Promise<void>
}

// API Hook Options
export interface UseApiOptions<T = any> {
  onError?: (error: AxiosError) => void
  onSuccess?: (data: T) => void
  showErrorToast?: boolean
  showSuccessToast?: boolean
  errorMessage?: string
  successMessage?: string
  refreshInterval?: number
  dedupingInterval?: number
}

// Generic API hook
export const useApi = <T = any>(
  url: string | null,
  options: UseApiOptions<T> = {},
): ApiResponse<T> => {
  const {
    onError,
    onSuccess,
    showErrorToast = true,
    showSuccessToast = false,
    errorMessage,
    successMessage,
    refreshInterval,
    dedupingInterval,
  } = options

  const { showError, showSuccess } = useToast()
  
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<AxiosError | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isValidating, setIsValidating] = useState<boolean>(false)
  
  const lastFetchTimeRef = useRef<number>(0)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async (showToast: boolean = true) => {
    if (!url) {
      setData(null)
      setError(null)
      return
    }

    // Check deduping interval
    const now = Date.now()
    const shouldDedupe = dedupingInterval && (now - lastFetchTimeRef.current) < dedupingInterval
    
    if (!isLoading && shouldDedupe && data) {
      return // Skip fetch due to deduping
    }

    try {
      setIsLoading(true)
      setIsValidating(true)
      lastFetchTimeRef.current = now

      const result = await fetcher(url)
      setData(result)
      setError(null)
      
      if (showToast && showSuccessToast && successMessage) {
        showSuccess(successMessage)
      }
      onSuccess?.(result)
    } catch (err) {
      const axiosError = err as AxiosError
      setError(axiosError)
      
      if (showToast && showErrorToast) {
        showError(errorMessage || (axiosError.response as any)?.data?.message || 'An error occurred')
      }
      onError?.(axiosError)
    } finally {
      setIsLoading(false)
      setIsValidating(false)
    }
  }, [
    url, 
    showErrorToast, 
    showSuccessToast, 
    errorMessage, 
    successMessage, 
    onError, 
    onSuccess, 
    dedupingInterval,
    data,
    isLoading,
    showSuccess,
    showError,
  ])

  const mutate = useCallback(async () => {
    await fetchData(false)
  }, [fetchData])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refresh interval
  useEffect(() => {
    if (refreshInterval) {
      refreshTimeoutRef.current = setInterval(() => {
        fetchData(false)
      }, refreshInterval)
      
      return () => {
        if (refreshTimeoutRef.current) {
          clearInterval(refreshTimeoutRef.current)
        }
      }
    }
  }, [refreshInterval, fetchData])

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  }
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
  } = {},
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
          showError((axiosError.response as any)?.data?.message || 'An error occurred')
        }
        
        onError?.(axiosError, variables)
        throw error
      }
    },
    [mutationFn, showSuccess, showError, showSuccessToast, showErrorToast, successMessage, onSuccess, onError],
  )

  return { mutate }
}

// Specific API hooks for common entities
export const useProducts = (search?: string) => {
  const url = search ? `/api/products?search=${encodeURIComponent(search)}` : '/api/products'
  
  return useApi<any[]>(url, {
    dedupingInterval: 60000, // 1 minute
  })
}

export const useCustomers = (query?: string) => {
  const url = query ? `/api/customers?query=${encodeURIComponent(query)}` : '/api/customers'
  
  return useApi<any[]>(url, {
    dedupingInterval: 60000,
  })
}

export const useTransactions = (limit?: number) => {
  const url = limit ? `/api/transactions?limit=${limit}` : '/api/transactions'
  
  return useApi<any[]>(url, {
    refreshInterval: 30000, // 30 seconds
  })
}

export const useInventory = () => {
  return useApi<any[]>('/api/inventory', {
    refreshInterval: 60000, // 1 minute
  })
}

// Export utility functions
export { fetcher }