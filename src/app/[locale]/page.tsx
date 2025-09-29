'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components'
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <h1 className="text-xl font-semibold">BMS</h1>
        <LanguageSwitcher />
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>
                Manage your products and stock levels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Current stock: 1,234 units</p>
            </CardContent>
            <CardFooter>
              <Button>View Inventory</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sales</CardTitle>
              <CardDescription>
                Track your sales and revenue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Today's revenue: $1,234.56</p>
            </CardContent>
            <CardFooter>
              <Button>View Sales</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
              <CardDescription>
                Manage your customer relationships.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>New customers today: 12</p>
            </CardContent>
            <CardFooter>
              <Button>View Customers</Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}