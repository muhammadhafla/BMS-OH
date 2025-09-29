import {
  Boxes,
  BookCopy,
  UserCheck,
  ShoppingCart,
  LayoutDashboard,
  Settings,
} from 'lucide-react';
import type { Module } from '@/lib/types';

export const modules: Module[] = [
  {
    name: 'Dashboard',
    description: "View an overview of your business's performance.",
    href: '/dashboard',
    icon: <LayoutDashboard className="size-8 text-primary" />,
  },
  {
    name: 'Inventory Management',
    description: 'Track stock, process receipts with OCR, and manage items.',
    href: '/inventory',
    icon: <Boxes className="size-8 text-primary" />,
  },
  {
    name: 'Accounting',
    description: 'Manage journal entries and generate financial reports.',
    href: '/accounting',
    icon: <BookCopy className="size-8 text-primary" />,
  },
  {
    name: 'Attendance',
    description: 'Record employee attendance with geolocation and selfies.',
    href: '/attendance',
    icon: <UserCheck className="size-8 text-primary" />,
  },
  {
    name: 'Point of Sale',
    description: 'A desktop-optimized POS for seamless transactions.',
    href: '/pos',
    icon: <ShoppingCart className="size-8 text-primary" />,
  },
  {
    name: 'Pengaturan',
    description: 'Manage application settings and user roles.',
    href: '/settings',
    icon: <Settings className="size-8 text-primary" />,
  },
];
