
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { summarizeInventoryData } from '@/ai/flows/summarize-inventory-data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { modules } from '@/lib/modules.tsx';
import { getAllProducts } from '@/lib/services/product';
import type { Product } from '@/lib/types';


async function AISummary({ inventoryPromise }: { inventoryPromise: Promise<Product[]> }) {
  let inventoryData: Product[];
  try {
    inventoryData = await inventoryPromise;
  } catch (error) {
    console.error("AI Summary - Failed to fetch inventory data:", error);
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Gagal Memuat Data Inventaris</AlertTitle>
        <AlertDescription>
          Tidak dapat mengambil data inventaris untuk ringkasan AI karena terjadi error. Mungkin kuota database Anda telah terlampaui. Silakan coba lagi nanti.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (inventoryData.length === 0) {
    return (
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>Ringkasan Inventaris AI</AlertTitle>
        <AlertDescription>
          Belum ada data inventaris untuk dianalisis. Tambahkan produk terlebih dahulu.
        </AlertDescription>
      </Alert>
    );
  }

  try {
    const { summary } = await summarizeInventoryData({
      inventoryData: JSON.stringify(inventoryData),
    });

    return (
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>Ringkasan Inventaris AI</AlertTitle>
        <AlertDescription>{summary}</AlertDescription>
      </Alert>
    );
  } catch (error) {
    console.error("AI Summary Generation Error:", error);
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Ringkasan AI Tidak Tersedia</AlertTitle>
        <AlertDescription>
          Ringkasan inventaris yang didukung AI untuk sementara tidak tersedia karena terjadi kesalahan pada layanan AI. Silakan
          coba lagi nanti.
        </AlertDescription>
      </Alert>
    );
  }
}

export default async function DashboardPage() {
  const otherModules = modules.filter(mod => mod.href !== '/dashboard');
  const inventoryPromise = getAllProducts();


  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Selamat datang kembali! Berikut adalah gambaran umum bisnis Anda.
        </p>
      </header>

      <div className="mb-8">
        <AISummary inventoryPromise={inventoryPromise} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {otherModules.map((mod) => (
          <Card key={mod.href}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-xl">{mod.name}</CardTitle>
                <CardDescription>{mod.description}</CardDescription>
              </div>
              {mod.icon}
            </CardHeader>
            <CardFooter>
              <Button asChild variant="outline">
                <Link href={mod.href}>
                  Buka Modul <ArrowRight />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

    </div>
  );
}
