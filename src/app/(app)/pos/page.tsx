import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Plus, Minus, X, History, User } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const products = [
  { name: 'Leather Journal', price: 29.99, image: PlaceHolderImages[1] },
  { name: 'Desk Lamp', price: 75.5, image: PlaceHolderImages[2] },
  { name: 'Office Chair', price: 350.0, image: PlaceHolderImages[3] },
  { name: 'Wireless Keyboard', price: 120.0, image: PlaceHolderImages[4] },
  { name: '4K Monitor', price: 899.99, image: PlaceHolderImages[1] },
  { name: 'Mousepad', price: 15.0, image: PlaceHolderImages[2] },
  { name: 'USB-C Hub', price: 49.99, image: PlaceHolderImages[3] },
  { name: 'Laptop Stand', price: 45.0, image: PlaceHolderImages[4] },
];

const transactionItems = [
  { name: 'Leather Journal', price: 29.99, qty: 1 },
  { name: 'Desk Lamp', price: 75.5, qty: 2 },
];

export default function POSPage() {
  return (
    <main className="flex h-[calc(100vh-2rem)] m-2 bg-background">
      <div className="grid grid-cols-12 gap-4 flex-1">
        {/* Items Grid */}
        <div className="col-span-7 flex flex-col">
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-10 h-12 text-lg" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
              {products.map((product) => (
                <Card key={product.name} className="overflow-hidden cursor-pointer hover:border-accent transition-colors">
                  <div className="relative aspect-square w-full">
                    <Image
                      src={product.image.imageUrl}
                      alt={product.image.description}
                      data-ai-hint={product.image.imageHint}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">${product.price.toFixed(2)}</p>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Transaction Panel */}
        <div className="col-span-5 bg-card border rounded-lg flex flex-col">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Current Order</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon"><History className="h-4 w-4"/></Button>
              <Button variant="outline" size="icon"><User className="h-4 w-4"/></Button>
            </div>
          </CardHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-4">
              {transactionItems.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-6 w-6"><Minus className="h-3 w-3"/></Button>
                    <span>{item.qty}</span>
                    <Button variant="outline" size="icon" className="h-6 w-6"><Plus className="h-3 w-3"/></Button>
                  </div>
                  <p className="font-semibold w-20 text-right">${(item.price * item.qty).toFixed(2)}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"><X className="h-4 w-4"/></Button>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="p-6 mt-auto border-t">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>$180.99</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (10%)</span>
                <span>$18.10</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>$199.09</span>
              </div>
            </div>
            <Button className="w-full h-16 text-2xl font-bold bg-accent hover:bg-accent/90">
              Pay
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
