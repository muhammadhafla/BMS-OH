'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenuSub,
} from '@/components/ui/sidebar';
import {
  BarChart3,
  Package,
  Users,
  Building2,
  ClipboardList,
  Truck,
  FileText,
  MessageSquare,
  Clock,
  Settings,
  LogOut,
  Home,
  DollarSign,
  Folder,
  ChevronDown,
  ChevronRight,
  Plus,
  TrendingUp,
  Shield,
  Eye,
  Activity,
  Search,
} from 'lucide-react';

import { LucideIcon } from 'lucide-react';

interface NavigationItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
  children?: NavigationItem[];
}

const navigation: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Products',
    href: '/products',
    icon: Package,
  },
  {
    title: 'Categories',
    href: '/categories',
    icon: Folder,
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: DollarSign,
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: BarChart3,
    children: [
      {
        title: 'Overview',
        href: '/inventory',
        icon: Eye,
      },
      {
        title: 'Stock Movement',
        href: '/inventory/movement',
        icon: TrendingUp,
      },
      {
        title: 'Adjustments',
        href: '/inventory/adjustments',
        icon: Activity,
      },
      {
        title: 'Analytics',
        href: '/inventory/analytics',
        icon: BarChart3,
      },
      {
        title: 'Valuation',
        href: '/inventory/valuation',
        icon: DollarSign,
      },
      {
        title: 'Audit',
        href: '/inventory/audit',
        icon: Search,
      },
    ],
  },
  {
    title: 'Users',
    href: '/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    title: 'Suppliers',
    href: '/suppliers',
    icon: Truck,
  },
  {
    title: 'Purchase Orders',
    href: '/purchase-orders',
    icon: ClipboardList,
  },
  {
    title: 'Attendance',
    href: '/attendance',
    icon: Clock,
  },
  {
    title: 'Accounting',
    href: '/accounting',
    icon: FileText,
    roles: ['admin', 'manager'],
  },
  {
    title: 'Branches',
    href: '/branches',
    icon: Building2,
    roles: ['admin'],
  },
  {
    title: 'Messages',
    href: '/messages',
    icon: MessageSquare,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

interface AppSidebarProps {
  className?: string;
}

import { useSession } from 'next-auth/react';
import { useAuthContext } from '@/contexts/AuthContext';
import { LogoutButton } from '@/components/auth/LogoutButton';

// Filter navigation based on user role
const filterNavigationByRole = (navItems: NavigationItem[], userRole: string): NavigationItem[] => {
  return navItems.filter(item => {
    if (item.roles && !item.roles.includes(userRole.toLowerCase())) {
      return false;
    }
    
    if (item.children) {
      item.children = filterNavigationByRole(item.children, userRole);
      // Hide parent if all children are filtered out
      return item.children.length > 0;
    }
    
    return true;
  });
};

const SidebarNavigationItem = ({ item, level = 0 }: { item: NavigationItem; level?: number }) => {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = pathname === item.href;
  const Icon = item.icon;

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          className={cn(
            "w-full",
            level > 0 && "ml-4 text-sm",
            isActive && "bg-primary/10 text-primary"
          )}
          onClick={() => {
            if (hasChildren) {
              setIsExpanded(!isExpanded);
            }
          }}
        >
          <Link href={item.href} onClick={(e) => hasChildren && e.preventDefault()}>
            <Icon className={cn("h-4 w-4", level > 0 && "h-3 w-3")} />
            <span className="truncate">{item.title}</span>
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-6 w-6 p-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      
      {hasChildren && isExpanded && (
        <SidebarMenuSub>
          {item.children?.map((child) => (
            <SidebarNavigationItem
              key={child.href}
              item={child}
              level={level + 1}
            />
          ))}
        </SidebarMenuSub>
      )}
    </>
  );
};

export function AppSidebar({ className }: AppSidebarProps) {
  const { data: session } = useSession();
  const { user } = useAuthContext();
  const currentUser = user || session?.user;
  
  const userRole = currentUser?.role?.toLowerCase() || 'staff';
  const filteredNavigation = filterNavigationByRole(navigation, userRole);
  
  // Get user initials for avatar
  const userInitials = currentUser?.name
    ? currentUser.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : 'U';

  return (
    <Sidebar className={cn('border-r', className)}>
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">BMS</h2>
            <p className="text-xs text-muted-foreground">Business Management</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavigation.map((item) => (
                <SidebarNavigationItem key={item.href} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="w-full text-muted-foreground">
                  <Link href="/transactions/new">
                    <Plus className="h-4 w-4" />
                    <span>New Transaction</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="w-full text-muted-foreground">
                  <Link href="/products/new">
                    <Plus className="h-4 w-4" />
                    <span>Add Product</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="w-full text-muted-foreground">
                  <Link href="/purchase-orders/new">
                    <Plus className="h-4 w-4" />
                    <span>New Purchase Order</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Status */}
        <SidebarGroup>
          <SidebarGroupLabel>System Status</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Users Online</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">System Health</span>
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-green-600">Good</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Last Backup</span>
                <span className="font-medium">2h ago</span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              {userInitials}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{currentUser?.name || 'User'}</span>
              <div className="flex items-center space-x-1">
                <Shield className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {currentUser?.role ? currentUser.role.charAt(0) + currentUser.role.slice(1).toLowerCase() : 'User'}
                </span>
              </div>
              {currentUser?.branch && (
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-muted-foreground">{currentUser.branch.name}</span>
                </div>
              )}
            </div>
          </div>
          <LogoutButton variant="dropdown" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export { SidebarProvider, SidebarTrigger };