
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
import { getAllProducts, addProduct } from '@/lib/services/product';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';


const AddItemDialog = ({ isOpen, onClose, onProductAdded }: { isOpen: boolean, onClose: () => void, onProductAdded: (newProduct: Product) => void }) => {
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [unit, setUnit] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const newProductData: Omit<Product, 'id'> = {
                name,
                sku,
                price: parseFloat(price) || 0,
                stock: { main: parseInt(stock, 10) || 0 }, // Assuming 'main' is the default branch
                unit,
            };
            const newProduct = await addProduct(newProductData);
            onProductAdded(newProduct);
            toast({
                title: "Produk Ditambahkan",
                description: `${newProduct.name} telah berhasil ditambahkan ke inventaris.`,
            });
            onClose();
        } catch (error) {
            console.error("Failed to add product:", error);
            toast({
                variant: "destructive",
                title: "Gagal Menambahkan Produk",
                description: "Terjadi kesalahan saat menyimpan produk baru.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setName('');
            setSku('');
            setPrice('');
            setStock('');
            setUnit('');
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tambah Item Baru</DialogTitle>
                    <DialogDescription>
                        Isi detail produk baru di bawah ini.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Nama</Label>
                            <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="sku" className="text-right">SKU</Label>
                            <Input id="sku" value={sku} onChange={e => setSku(e.target.value)} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">Harga</Label>
                            <Input id="price" type="number" value={price} onChange={e => setPrice(e.target.value)} className="col-span-3" required />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="stock" className="text-right">Stok</Label>
                            <Input id="stock" type="number" value={stock} onChange={e => setStock(e.target.value)} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="unit" className="text-right">Satuan</Label>
                            <Input id="unit" value={unit} onChange={e => setUnit(e.target.value)} className="col-span-3" placeholder="e.g., pcs, kg, box" required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Batal</Button>
                        <Button type="submit" className="bg-accent hover:bg-accent/90" disabled={isSubmitting}>
                            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};


export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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

  const handleProductAdded = (newProduct: Product) => {
    setInventoryItems(prevItems => [...prevItems, newProduct]);
  };

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
          <Button className="bg-accent hover:bg-accent/90" onClick={() => setIsAddDialogOpen(true)}>
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
      <AddItemDialog 
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onProductAdded={handleProductAdded}
      />
    </div>
  );
}
