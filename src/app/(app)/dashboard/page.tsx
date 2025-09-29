import {
  Boxes,
  BookCopy,
  UserCheck,
  ShoppingCart,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Module } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { summarizeInventoryData } from '@/ai/flows/summarize-inventory-data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';

const modules: Module[] = [
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
];

const sampleInventoryData = {
  items: [
    { id: '1', name: 'Laptop', quantity: 5, value: 1200 },
    { id: '2', name: 'Mouse', quantity: 2, value: 25 },
    { id: '3', name: 'Keyboard', quantity: 20, value: 75 },
    { id: '4', name: 'Monitor', quantity: 1, value: 300 },
  ],
};

async function AISummary() {
  const { summary } = await summarizeInventoryData({
    inventoryData: JSON.stringify(sampleInventoryData),
  });

  return (
    <Alert>
      <Sparkles className="h-4 w-4" />
      <AlertTitle>AI Inventory Summary</AlertTitle>
      <AlertDescription>{summary}</AlertDescription>
    </Alert>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back! Here's your business overview.
        </p>
      </header>

      <div className="mb-8">
        <AISummary />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map((mod) => (
          <Card
            key={mod.name}
            className="flex flex-col transition-all hover:shadow-lg hover:-translate-y-1"
          >
            <CardHeader className="flex-row items-start gap-4 space-y-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                {mod.icon}
              </div>
              <div className="flex-1">
                <CardTitle className="font-headline">{mod.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription>{mod.description}</CardDescription>
            </CardContent>
            <CardFooter>
              <Button asChild variant="ghost" className="w-full justify-start text-accent">
                <Link href={mod.href}>
                  Go to {mod.name.split(' ')[0]}
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
