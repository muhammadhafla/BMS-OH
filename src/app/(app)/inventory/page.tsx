
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, FileUp, ImageUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Product } from '@/lib/types';
import { getAllProducts } from '@/lib/services/product';

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const products = await getAllProducts();
        setInventoryItems(products);
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
        // Optionally, show a toast or error message to the user
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const getStatus = (stock: number) => {
    if (stock === 0) return 'Out of Stock';
    if (stock <= 10) return 'Low Stock'; // Assuming 10 is the threshold for low stock
    return 'In Stock';
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'In Stock':
        return 'secondary';
      case 'Low Stock':
        return 'outline';
      case 'Out of Stock':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Inventory
          </h1>
          <p className="text-muted-foreground">
            Manage your products and stock levels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <ImageUp />
            Scan Receipt (OCR)
          </Button>
          <Button variant="outline">
            <FileUp />
            Import from CSV
          </Button>
          <Button className="bg-accent hover:bg-accent/90">
            <PlusCircle />
            Add Item
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>
            A list of all products in your inventory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    Loading inventory...
                  </TableCell>
                </TableRow>
              ) : inventoryItems.length > 0 ? (
                inventoryItems.map((item) => {
                  // Assuming we show stock from a 'main' branch for now
                  const stock = item.stock['main'] || 0;
                  const status = getStatus(stock);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusVariant(status)}
                          className={
                            status === 'Low Stock' ? 'text-orange-500 border-orange-500' : ''
                          }
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>{stock}</TableCell>
                      <TableCell className="text-right">
                        ${item.price.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                 <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No products found. Add a new item to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
