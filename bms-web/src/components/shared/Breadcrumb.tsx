'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

// Route mapping for better display names
const routeNames: { [key: string]: string } = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/categories': 'Categories',
  '/transactions': 'Transactions',
  '/inventory': 'Inventory',
  '/users': 'Users',
  '/suppliers': 'Suppliers',
  '/purchase-orders': 'Purchase Orders',
  '/attendance': 'Attendance',
  '/accounting': 'Accounting',
  '/branches': 'Branches',
  '/messages': 'Messages',
  '/settings': 'Settings',
  '/inventory/movement': 'Stock Movement',
  '/inventory/adjustments': 'Adjustments',
  '/inventory/analytics': 'Analytics',
  '/inventory/valuation': 'Valuation',
  '/inventory/audit': 'Audit',
  '/new': 'New',
  '/edit': 'Edit',
  '/view': 'View',
};

// Generate breadcrumb items from current pathname
const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  if (pathname === '/') {
    return [{ label: 'Dashboard', href: '/' }];
  }

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Always add home
  breadcrumbs.push({ label: 'Dashboard', href: '/' });

  // Build breadcrumbs from path segments
  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    
    // Skip if this is a dashboard route that we already covered
    if (currentPath === '/dashboard') continue;
    
    const displayName = routeNames[currentPath] || 
                       segment.split('-').map(word => 
                         word.charAt(0).toUpperCase() + word.slice(1)
                       ).join(' ');
    
    breadcrumbs.push({
      label: displayName,
      href: currentPath,
    });
  }

  return breadcrumbs;
};

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  const pathname = usePathname();
  const breadcrumbItems = items || generateBreadcrumbs(pathname);

  if (breadcrumbItems.length <= 1) {
    return null; // Don't show breadcrumbs for root level
  }

  return (
    <nav 
      className={cn("flex items-center space-x-2 text-sm text-muted-foreground", className)}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-2">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const isFirst = index === 0;

          return (
            <li key={item.href} className="flex items-center">
              {!isFirst && (
                <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
              )}
              
              {isLast ? (
                <span className="flex items-center text-foreground font-medium">
                  {isFirst && <Home className="h-4 w-4 mr-1" />}
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  {isFirst && <Home className="h-4 w-4 mr-1" />}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;