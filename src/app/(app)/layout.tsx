'use client';
import { AppSidebar, AppSidebarTrigger } from '@/components/shared/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { cookies } from 'next/headers';
import { usePathname } from 'next/navigation';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  // const layout = cookies().get('sidebar_state');
  // const defaultOpen = layout ? layout.value === 'true' : true;
  const defaultOpen = true;

  // Render POS page without the sidebar layout
  if (pathname === '/pos') {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <AppSidebarTrigger />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
