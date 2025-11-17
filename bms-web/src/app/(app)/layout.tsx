'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from '@/components/ui/toast';
import { AppSidebar } from '@/components/shared/app-sidebar';
import Breadcrumb from '@/components/shared/Breadcrumb';
import { SidebarProvider } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Render POS page without the sidebar layout
  if (pathname === '/pos') {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className={cn(
          "flex-1 transition-all duration-300 ease-in-out",
          "ml-64" // Add margin for sidebar
        )}>
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-6 py-4">
              <Breadcrumb />
            </div>
          </div>
          {children}
        </main>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}