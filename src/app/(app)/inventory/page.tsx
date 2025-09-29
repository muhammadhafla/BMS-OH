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
import { PlusCircle, FileUp, ImageUp, Edit } from 'lucide-react';
import { useEffect, useState, useRef, useMemo } from 'react';
import type { Product } from '@/lib/types';
import { addProduct, importProductsFromCSV, updateProduct } from '@/lib/services/product';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client'; // Import client-side firestore
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'; // Import firestore functions
import Papa from 'papaparse';
import { ScrollArea } from '@/components/ui/scroll-area';

const AddItemDialog = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
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
                stock: { main: parseInt(stock, 10) || 0 },
                unit,
            };
            const newProduct = await addProduct(newProductData);
            toast({
                title: "Produk Ditambahkan",
                description: `${newProduct.name} telah berhasil ditambahkan ke inventaris.`,
            });
            onClose();
        } catch (error) {
            console.error("Gagal menambahkan produk:", error);
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
                            <Input id="unit" value={unit} onChange={e => setUnit(e.target.value)} className="col-span-3" placeholder="cth: pcs, kg, box" required />
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

const EditItemDialog = ({ isOpen, onClose, product }: { isOpen: boolean, onClose: () => void, product: Product | null }) => {
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [unit, setUnit] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (product) {
            setName(product.name);
            setSku(product.sku);
            setPrice(String(product.price));
            setStock(String(product.stock['main'] || 0));
            setUnit(product.unit);
        }
    }, [product, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        setIsSubmitting(true);
        try {
            const updatedData: Partial<Product> = {
                name,
                sku,
                price: parseFloat(price) || 0,
                stock: { ...product.stock, main: parseInt(stock, 10) || 0 },
                unit,
            };
            await updateProduct(product.id!, updatedData);
            toast({
                title: "Produk Diperbarui",
                description: `${name} telah berhasil diperbarui.`,
            });
            onClose();
        } catch (error) {
            console.error("Gagal memperbarui produk:", error);
            toast({
                variant: "destructive",
                title: "Gagal Memperbarui Produk",
                description: "Terjadi kesalahan saat menyimpan perubahan.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Item</DialogTitle>
                    <DialogDescription>
                        Perbarui detail produk di bawah ini.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right">Nama</Label>
                            <Input id="edit-name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-sku" className="text-right">SKU</Label>
                            <Input id="edit-sku" value={sku} onChange={e => setSku(e.target.value)} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-price" className="text-right">Harga</Label>
                            <Input id="edit-price" type="number" value={price} onChange={e => setPrice(e.target.value)} className="col-span-3" required />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-stock" className="text-right">Stok</Label>
                            <Input id="edit-stock" type="number" value={stock} onChange={e => setStock(e.target.value)} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-unit" className="text-right">Satuan</Label>
                            <Input id="edit-unit" value={unit} onChange={e => setUnit(e.target.value)} className="col-span-3" placeholder="cth: pcs, kg, box" required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Batal</Button>
                        <Button type="submit" className="bg-accent hover:bg-accent/90" disabled={isSubmitting}>
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};


const databaseColumns = [
    { value: 'name', label: 'Nama Produk' },
    { value: 'sku', label: 'SKU' },
    { value: 'price', label: 'Harga' },
    { value: 'stock', label: 'Stok' },
    { value: 'unit', label: 'Satuan' },
];

type ColumnMapping = Record<string, keyof Omit<Product, 'id'> | 'ignore'>;

const ImportMappingDialog = ({ 
  isOpen, 
  onClose, 
  csvHeaders, 
  csvPreview,
  fileContent
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  csvHeaders: string[], 
  csvPreview: Record<string, string>[],
  fileContent: string
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const { toast } = useToast();

  useEffect(() => {
    // Auto-map based on header name similarity
    const initialMapping: ColumnMapping = {};
    csvHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase();
      if (lowerHeader.includes('nama') || lowerHeader.includes('barang')) {
        initialMapping[header] = 'name';
      } else if (lowerHeader.includes('sku') || lowerHeader.includes('kode')) {
        initialMapping[header] = 'sku';
      } else if (lowerHeader.includes('harga')) {
        initialMapping[header] = 'price';
      } else if (lowerHeader.includes('stok') || lowerHeader.includes('qty')) {
        initialMapping[header] = 'stock';
      } else if (lowerHeader.includes('unit') || lowerHeader.includes('satuan')) {
        initialMapping[header] = 'unit';
      } else {
        initialMapping[header] = 'ignore';
      }
    });
    setMapping(initialMapping);
  }, [csvHeaders]);

  const handleMappingChange = (csvHeader: string, dbColumn: keyof Product | 'ignore') => {
    setMapping(prev => ({ ...prev, [csvHeader]: dbColumn }));
  };
  
  const handleImport = async () => {
    const requiredColumns: (keyof Product)[] = ['name', 'sku', 'price', 'stock', 'unit'];
    const mappedDbColumns = Object.values(mapping);

    const missingColumns = requiredColumns.filter(
        col => !mappedDbColumns.includes(col)
    );

    if (missingColumns.length > 0 && !missingColumns.every(m => m === 'unit')) { // Make unit optional for now
         toast({
            variant: "destructive",
            title: "Pemetaan Tidak Lengkap",
            description: `Kolom berikut harus dipetakan: ${missingColumns.join(', ')}`,
        });
        return;
    }

    setIsSubmitting(true);
    const toastId = toast({
      title: 'Mengimpor Produk',
      description: 'Harap tunggu sementara produk sedang diproses...',
    });

    try {
        const result = await importProductsFromCSV({
            csvContent: fileContent,
            columnMapping: mapping
        });

        if (result.success) {
            toast({
                id: toastId.id,
                title: 'Impor Berhasil',
                description: `${result.count} produk berhasil diimpor.`,
            });
            onClose();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Gagal mengimpor CSV:', error);
        toast({
            id: toastId.id,
            variant: "destructive",
            title: "Impor Gagal",
            description: error instanceof Error ? error.message : "Terjadi kesalahan saat mengimpor file.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  // Create preview data based on current mapping
  const previewData = csvPreview.map(row => {
    const newRow: Partial<Product> = {};
    for (const csvHeader in mapping) {
        const dbColumn = mapping[csvHeader];
        if (dbColumn !== 'ignore') {
            (newRow as any)[dbColumn] = row[csvHeader];
        }
    }
    return newRow;
  });


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Petakan Kolom CSV</DialogTitle>
                <DialogDescription>
                    Definisikan setiap kolom dari file CSV Anda ke kolom database yang sesuai.
                </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <h3 className="font-semibold mb-2">Pemetaan Kolom</h3>
                    <ScrollArea className="h-64 border rounded-md">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Kolom Sumber (dari CSV)</TableHead>
                                    <TableHead>Definisikan ke Kolom</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {csvHeaders.map(header => (
                                    <TableRow key={header}>
                                        <TableCell className="font-medium">{header}</TableCell>
                                        <TableCell>
                                            <Select 
                                                value={mapping[header]}
                                                onValueChange={(value) => handleMappingChange(header, value as any)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih kolom..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ignore">Abaikan</SelectItem>
                                                    {databaseColumns.map(col => (
                                                        <SelectItem key={col.value} value={col.value}>{col.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
                <div>
                     <h3 className="font-semibold mb-2">Pratinjau Data (5 Baris Pertama)</h3>
                     <ScrollArea className="h-64 border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {databaseColumns.map(col => {
                                        if (Object.values(mapping).includes(col.value)) {
                                            return <TableHead key={col.value}>{col.label}</TableHead>
                                        }
                                        return null;
                                    })}
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {previewData.map((row, index) => (
                                    <TableRow key={index}>
                                       {databaseColumns.map(col => {
                                           if (Object.values(mapping).includes(col.value)) {
                                               return <TableCell key={col.value}>{(row as any)[col.value]}</TableCell>
                                           }
                                           return null;
                                       })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </ScrollArea>
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Batal</Button>
                <Button onClick={handleImport} className="bg-accent hover:bg-accent/90" disabled={isSubmitting}>
                    {isSubmitting ? 'Mengimpor...' : 'Mulai Impor'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
};


export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // State for import mapping
  const [isImportMappingDialogOpen, setIsImportMappingDialogOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvFileContent, setCsvFileContent] = useState('');

  // State for search
  const [searchQuery, setSearchQuery] = useState('');

  // State for editing
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    setLoading(true);
    const productsQuery = query(collection(firestore, 'products'), orderBy('name'));

    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      const products: Product[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Product));
      setInventoryItems(products);
      setLoading(false);
    }, (error) => {
      console.error('Gagal berlangganan pembaruan inventaris:', error);
      toast({
        variant: "destructive",
        title: "Gagal Memuat Data",
        description: "Tidak dapat mengambil data inventaris. Coba muat ulang halaman."
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFileContent('');
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvFileContent(content);

        Papa.parse(content, {
            header: true,
            preview: 5,
            complete: (results) => {
                if (results.meta.fields) {
                    setCsvHeaders(results.meta.fields);
                    setCsvPreview(results.data);
                    setIsImportMappingDialogOpen(true);
                } else {
                    toast({
                        variant: "destructive",
                        title: "Gagal Membaca File",
                        description: "Tidak dapat menemukan header di file CSV.",
                    });
                }
            }
        });
    };
    reader.readAsText(file);

    if (event.target) {
        event.target.value = '';
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setIsEditDialogOpen(true);
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery) {
      return inventoryItems;
    }
    return inventoryItems.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [inventoryItems, searchQuery]);

  const getStatus = (stock: number) => {
    if (stock === 0) return 'Stok Habis';
    if (stock <= 10) return 'Stok Rendah';
    return 'Tersedia';
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Tersedia':
        return 'secondary';
      case 'Stok Rendah':
        return 'outline';
      case 'Stok Habis':
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
            Inventaris
          </h1>
          <p className="text-muted-foreground">
            Kelola produk dan tingkat stok Anda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <ImageUp />
            Pindai Struk (OCR)
          </Button>
          <Button variant="outline" onClick={handleImportClick}>
            <FileUp />
            Impor dari CSV
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            className="hidden" 
            accept=".csv"
          />
          <Button className="bg-accent hover:bg-accent/90" onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle />
            Tambah Item
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Produk</CardTitle>
              <CardDescription>
                Daftar semua produk dalam inventaris Anda.
              </CardDescription>
            </div>
            <div className="w-full max-w-sm">
              <Input 
                placeholder="Cari berdasarkan nama atau SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Produk</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stok</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    Memuat inventaris...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => {
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
                            status === 'Stok Rendah' ? 'text-orange-500 border-orange-500' : ''
                          }
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>{stock}</TableCell>
                      <TableCell className="text-right">
                        Rp{item.price.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                 <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    {searchQuery ? 'Produk tidak ditemukan.' : 'Tidak ada produk. Tambah item baru untuk memulai.'}
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
      />
      <EditItemDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
      />
      <ImportMappingDialog
        isOpen={isImportMappingDialogOpen}
        onClose={() => setIsImportMappingDialogOpen(false)}
        csvHeaders={csvHeaders}
        csvPreview={csvPreview}
        fileContent={csvFileContent}
      />
    </div>
  );
}
