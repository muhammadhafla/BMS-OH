import React from 'react';
import {
  Boxes,
  BookCopy,
  UserCheck,
  ShoppingCart,
  LayoutDashboard,
  Settings,
  Truck,
} from 'lucide-react';
import type { Module } from '@/lib/types';

export const modules: Module[] = [
  {
    name: 'Dashboard',
    description: "Lihat gambaran umum kinerja bisnis Anda.",
    href: '/dashboard',
    icon: <LayoutDashboard className="size-8 text-primary" />,
  },
  {
    name: 'Manajemen Inventaris',
    description: 'Lacak stok, proses struk dengan OCR, dan kelola item.',
    href: '/inventory',
    icon: <Boxes className="size-8 text-primary" />,
  },
  {
    name: 'Pembelian',
    description: 'Catat pembelian barang dan perbarui stok secara otomatis.',
    href: '/purchases',
    icon: <Truck className="size-8 text-primary" />,
  },
  {
    name: 'Akuntansi',
    description: 'Kelola entri jurnal dan hasilkan laporan keuangan.',
    href: '/accounting',
    icon: <BookCopy className="size-8 text-primary" />,
  },
  {
    name: 'Absensi',
    description: 'Catat absensi karyawan dengan geolokasi dan selfie.',
    href: '/attendance',
    icon: <UserCheck className="size-8 text-primary" />,
  },
  {
    name: 'Point of Sale (POS)',
    description: 'POS yang dioptimalkan untuk desktop demi kelancaran transaksi.',
    href: '/pos/auth',
    icon: <ShoppingCart className="size-8 text-primary" />,
  },
  {
    name: 'Pengaturan',
    description: 'Kelola pengaturan aplikasi dan peran pengguna.',
    href: '/settings',
    icon: <Settings className="size-8 text-primary" />,
  },
];
