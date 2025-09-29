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

const sampleInventoryData = {
  items: [
    { id: '1', name: 'Laptop', quantity: 5, value: 1200 },
    { id: '2', name: 'Mouse', quantity: 2, value: 25 },
    { id: '3', name: 'Keyboard', quantity: 20, value: 75 },
    { id: '4', name: 'Monitor', quantity: 1, value: 300 },
  ],
};

async function AISummary() {
  try {
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
  } catch (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>AI Summary Unavailable</AlertTitle>
        <AlertDescription>
          The AI-powered inventory summary is temporarily unavailable. Please
          try again later.
        </AlertDescription>
      </Alert>
    );
  }
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

    </div>
  );
}
