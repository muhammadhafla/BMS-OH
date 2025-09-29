import { AppSidebar, AppSidebarTrigger } from '@/components/shared/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { cookies } from 'next/headers';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const layout = cookies().get('sidebar_state');
  const defaultOpen = layout ? layout.value === 'true' : true;

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
