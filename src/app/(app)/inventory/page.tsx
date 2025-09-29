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

const inventoryItems = [
  {
    name: 'Vintage Leather Journal',
    sku: 'BK-VLJ-001',
    stock: 25,
    price: 29.99,
    status: 'In Stock',
  },
  {
    name: 'Modern Desk Lamp',
    sku: 'DSK-MDL-012',
    stock: 10,
    price: 75.5,
    status: 'In Stock',
  },
  {
    name: 'Ergonomic Office Chair',
    sku: 'CHR-EOC-003',
    stock: 5,
    price: 350.0,
    status: 'Low Stock',
  },
  {
    name: 'Wireless Mechanical Keyboard',
    sku: 'KBD-WMK-007',
    stock: 0,
    price: 120.0,
    status: 'Out of Stock',
  },
  {
    name: 'Ultra-Wide 4K Monitor',
    sku: 'MON-UWK-004',
    stock: 8,
    price: 899.99,
    status: 'In Stock',
  },
];

export default function InventoryPage() {
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
              {inventoryItems.map((item) => (
                <TableRow key={item.sku}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === 'In Stock'
                          ? 'secondary'
                          : item.status === 'Low Stock'
                          ? 'outline'
                          : 'destructive'
                      }
                      className={
                        item.status === 'Low Stock' ? 'text-orange-500 border-orange-500' : ''
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.stock}</TableCell>
                  <TableCell className="text-right">
                    ${item.price.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
