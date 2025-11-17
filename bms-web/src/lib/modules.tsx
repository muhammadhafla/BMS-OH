import React from 'react';
import {
  Boxes,
  BookCopy,
  UserCheck,
  ShoppingCart,
  LayoutDashboard,
  Settings,
  Truck,
  Wallet,
  MessageSquare,
  Users,
  Building2,
  TrendingUp,
} from 'lucide-react';

export interface Module {
  name: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

export const modules: Module[] = [
  {
    name: 'Dashboard',
    description: 'Lihat gambaran umum kinerja bisnis Anda.',
    href: '/dashboard',
    icon: <LayoutDashboard className="size-8 text-primary" />,
  },
  {
    name: 'Manajemen Inventaris',
    description: 'Lacak stok, kelola item, dan monitoring produk.',
    href: '/inventory',
    icon: <Boxes className="size-8 text-primary" />,
  },
  {
    name: 'Produk',
    description: 'Kelola data produk, harga, dan kategori barang.',
    href: '/products',
    icon: <TrendingUp className="size-8 text-primary" />,
  },
  {
    name: 'Transaksi',
    description: 'Lihat dan kelola semua transaksi penjualan.',
    href: '/transactions',
    icon: <ShoppingCart className="size-8 text-primary" />,
  },
  {
    name: 'Pembelian',
    description: 'Catat pembelian barang dan perbarui stok secara otomatis.',
    href: '/purchases',
    icon: <Truck className="size-8 text-primary" />,
  },
  {
    name: 'Pemasok',
    description: 'Kelola data pemasok dan relasi bisnis.',
    href: '/suppliers',
    icon: <Building2 className="size-8 text-primary" />,
  },
  {
    name: 'Pengguna',
    description: 'Kelola akun pengguna dan hak akses sistem.',
    href: '/users',
    icon: <Users className="size-8 text-primary" />,
  },
  {
    name: 'Cabang',
    description: 'Kelola data cabang dan lokasi bisnis.',
    href: '/branches',
    icon: <Building2 className="size-8 text-primary" />,
  },
  {
    name: 'Absensi',
    description: 'Catat absensi karyawan dengan geolokasi dan selfie.',
    href: '/attendance',
    icon: <UserCheck className="size-8 text-primary" />,
  },
  {
    name: 'Pesan Internal',
    description: 'Berkomunikasi dengan anggota tim lain secara internal.',
    href: '/messaging',
    icon: <MessageSquare className="size-8 text-primary" />,
  },
  {
    name: 'Penggajian',
    description: 'Hitung dan kelola gaji karyawan berdasarkan data absensi.',
    href: '/payroll',
    icon: <Wallet className="size-8 text-primary" />,
  },
  {
    name: 'Akuntansi',
    description: 'Kelola entri jurnal dan hasilkan laporan keuangan.',
    href: '/accounting',
    icon: <BookCopy className="size-8 text-primary" />,
  },
  {
    name: 'Pengaturan',
    description: 'Kelola pengaturan aplikasi dan peran pengguna.',
    href: '/settings',
    icon: <Settings className="size-8 text-primary" />,
  },
];