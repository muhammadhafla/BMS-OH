'use client'

import * as React from "react"
import { SWRConfig } from 'swr'
import { SessionProvider } from 'next-auth/react'
import { AuthStoreProvider } from '@/stores/authStore'
import { AuthProvider } from '@/contexts/AuthContext'

const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <SessionProvider>
      <SWRConfig value={swrConfig}>
        <AuthProvider>
          <AuthStoreProvider>
            {children}
          </AuthStoreProvider>
        </AuthProvider>
      </SWRConfig>
    </SessionProvider>
  )
}