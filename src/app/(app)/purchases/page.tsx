
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PurchaseItem } from '@/lib/types';
import { recordPurchase } from '@/lib/services/purchase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function PurchasesPage() {
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAddItem = () => {
    const newItem: PurchaseItem = {
      id: `new-${Date.now()}`,
      productName: '',
      quantity: 1,
      purchasePrice: 0,
      total: 0,
      unit: 'pcs',
    };
    setItems([...items, newItem]);
  };

  const handleItemChange = (id: string, field: keyof PurchaseItem, value: string | number) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'purchasePrice') {
            const qty = field === 'quantity' ? Number(value) : item.quantity;
            const price = field === 'purchasePrice' ? Number(value) : item.purchasePrice;
            updatedItem.total = qty * price;
          }
          return updatedItem;
        }
        return item;
      });
      return newItems;
    });
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };
  
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.total, 0);
  }, [items]);

  const resetForm = () => {
    setItems([]);
    setSupplier('');
    setNotes('');
  }

  const handleSubmitPurchase = async () => {
    if (!supplier) {
        toast({ variant: 'destructive', title: 'Validasi Gagal', description: 'Nama pemasok harus diisi.' });
        return;
    }
    if (items.length === 0) {
        toast({ variant: 'destructive', title: 'Validasi Gagal', description: 'Tambahkan setidaknya satu item pembelian.' });
        return;
    }
    if (items.some(item => !item.productName || item.quantity <= 0 || item.purchasePrice <= 0)) {
        toast({ variant: 'destructive', title: 'Validasi Gagal', description: 'Pastikan semua detail item (Nama, Kuantitas, Harga) diisi dengan benar.' });
        return;
    }
    
    setIsSubmitting(true);
    try {
        const result = await recordPurchase({
            supplier,
            notes,
            items
        });

        if (result.success) {
            toast({ title: 'Pembelian Berhasil', description: `Pembelian dari ${supplier} telah berhasil dicatat.` });
            resetForm();
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error("Gagal mencatat pembelian:", error);
        toast({
            variant: "destructive",
            title: "Gagal Mencatat Pembelian",
            description: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };


  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Catat Pembelian
          </h1>
          <p className="text-muted-foreground">
            Rekam pembelian baru untuk memperbarui stok dan harga beli.
          </p>
        </div>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Detail Pembelian</CardTitle>
           <CardDescription>
            Masukkan informasi pemasok dan daftar barang yang dibeli.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="supplier">Nama Pemasok</Label>
                    <Input 
                        id="supplier" 
                        placeholder="Contoh: PT Sumber Rejeki" 
                        value={supplier}
                        onChange={(e) => setSupplier(e.target.value)}
                        required
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="notes">Catatan (Opsional)</Label>
                    <Textarea 
                        id="notes" 
                        placeholder="Contoh: Faktur #12345"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>
            </div>
            
            <div>
              <Label className="text-lg font-medium">Item Pembelian</Label>
              <div className="mt-2 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Nama Produk</TableHead>
                      <TableHead>Kuantitas</TableHead>
                      <TableHead>Harga Beli</TableHead>
                      <TableHead>Satuan</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-[50px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length > 0 ? items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            placeholder="Nama barang..."
                            value={item.productName}
                            onChange={e => handleItemChange(item.id!, 'productName', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={e => handleItemChange(item.id!, 'quantity', Number(e.target.value))}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.purchasePrice}
                            onChange={e => handleItemChange(item.id!, 'purchasePrice', Number(e.target.value))}
                            className="w-32"
                          />
                        </TableCell>
                         <TableCell>
                          <Input
                            placeholder="pcs"
                            value={item.unit}
                            onChange={e => handleItemChange(item.id!, 'unit', e.target.value)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          Rp{item.total.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id!)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                Belum ada item. Klik "Tambah Item" untuk memulai.
                            </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
               <Button variant="outline" size="sm" className="mt-4" onClick={handleAddItem}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Tambah Item
                </Button>
            </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center bg-muted/50 p-4 rounded-b-lg">
          <div className="text-lg font-bold">
            Total Pembelian: <span className="text-primary">Rp{totalAmount.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isSubmitting || items.length === 0}>
                    Batal
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Batalkan Pencatatan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini akan menghapus semua item yang telah Anda masukkan di formulir ini. Apakah Anda yakin?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Tidak</AlertDialogCancel>
                  <AlertDialogAction onClick={resetForm}>Ya, Batalkan</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleSubmitPurchase} disabled={isSubmitting || items.length === 0} className="bg-accent hover:bg-accent/90">
                <Save className="mr-2 h-4 w-4" /> {isSubmitting ? 'Menyimpan...' : 'Simpan Pembelian'}
            </Button>
          </div>
        </CardFooter>
      </Card>

    </div>
  );
}
