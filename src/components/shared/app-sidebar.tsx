'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { Logo } from './logo';
import { cn } from '@/lib/utils';
import { modules } from '@/lib/modules.tsx';
import React from 'react';

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar
      className="border-r"
      collapsible="icon"
      variant="sidebar"
      side="left"
    >
      <SidebarHeader>
        <div
          className={cn(
            'flex items-center gap-2 overflow-hidden p-2 transition-all duration-300',
            'group-data-[collapsible=icon]:w-12'
          )}
        >
          <Logo />
          <span className="font-bold text-lg text-sidebar-foreground group-data-[collapsible=icon]:opacity-0">
            BMS
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {modules.map((mod) => (
            <SidebarMenuItem key={mod.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === mod.href || (mod.href !== '/dashboard' && pathname.startsWith(mod.href))}
                tooltip={{ children: mod.name, side: 'right' }}
                className="justify-start"
              >
                <Link href={mod.href}>
                  {React.cloneElement(mod.icon as React.ReactElement, { className: "shrink-0"})}
                  <span>{mod.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 p-2 overflow-hidden">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden group-data-[collapsible=icon]:opacity-0 transition-opacity duration-200">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">Admin User</p>
            <p className="text-xs text-muted-foreground truncate">admin@bms.app</p>
          </div>
          <Button variant="ghost" size="icon" className="group-data-[collapsible=icon]:hidden">
            <LogOut />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppSidebarTrigger() {
  return <SidebarTrigger className="fixed top-3 left-3 z-20 md:hidden" />;
}
