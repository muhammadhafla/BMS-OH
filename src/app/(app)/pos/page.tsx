'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Power } from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// Data produk yang diimpor dari file inventaris
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


type Product = {
  sku: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
};

type TransactionItem = {
  sku: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
};

type HeldTransaction = {
  id: number;
  items: TransactionItem[];
  total: number;
  customer: string;
  timestamp: Date;
};

const productCatalog: Product[] = inventoryItems.map(item => ({
    sku: item.sku,
    name: item.name,
    price: item.price,
    stock: item.stock,
    unit: 'Pcs'
}));


const initialItems: TransactionItem[] = [];

const KeybindHint = ({ children }: { children: React.ReactNode }) => (
  <span className="absolute -top-2 -right-2 bg-zinc-600 text-white text-[10px] font-bold px-1 rounded-sm border border-zinc-500">
    {children}
  </span>
);

export default function POSPage() {
  const [currentTime, setCurrentTime] = useState('');
  const [items, setItems] = useState<TransactionItem[]>(initialItems);
  const [total, setTotal] = useState(0);
  const [heldTransactions, setHeldTransactions] = useState<HeldTransaction[]>([]);
  const [isRecallDialogOpen, setIsRecallDialogOpen] = useState(false);
  const [recallSearch, setRecallSearch] = useState('');
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }) +
          ' ' +
          now.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })
      );
    }, 1000);

    searchInputRef.current?.focus();
    return () => clearInterval(timer);
  }, []);

  const calculateTotal = (items: TransactionItem[]) => {
    return items.reduce((acc, item) => acc + item.total, 0);
  }
  
  const clearTransaction = () => {
    setItems([]);
    setTotal(0);
    if (searchInputRef.current) searchInputRef.current.value = '';
    searchInputRef.current?.focus();
  };
  
  const holdTransaction = () => {
    if (items.length === 0) return;
    const newHeldTransaction: HeldTransaction = {
      id: Date.now(),
      items,
      total: calculateTotal(items),
      customer: 'Umum',
      timestamp: new Date(),
    };
    setHeldTransactions(prev => [...prev, newHeldTransaction]);
    clearTransaction();
  };
  
  const recallTransaction = (transactionId: number) => {
    const transactionToRecall = heldTransactions.find(t => t.id === transactionId);
    if (transactionToRecall) {
      setItems(transactionToRecall.items);
      setTotal(transactionToRecall.total);
      setHeldTransactions(prev => prev.filter(t => t.id !== transactionId));
      setIsRecallDialogOpen(false);
    }
  };

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        const searchTerm = e.currentTarget.value.toLowerCase();
        const foundProduct = productCatalog.find(p => p.sku.toLowerCase() === searchTerm || p.name.toLowerCase() === searchTerm);

        if (foundProduct) {
            addItemToTransaction(foundProduct);
            e.currentTarget.value = '';
        } else {
            setProductSearch(searchTerm);
            setIsSearchDialogOpen(true);
        }
    }
  };

  const addItemToTransaction = (product: Product, quantity: number = 1) => {
    setItems(prevItems => {
        const existingItemIndex = prevItems.findIndex(item => item.sku === product.sku);
        const newItems = [...prevItems];

        if (existingItemIndex > -1) {
            const existingItem = newItems[existingItemIndex];
            const newQuantity = existingItem.quantity + quantity;
            existingItem.quantity = newQuantity;
            existingItem.total = (existingItem.price - existingItem.discount) * newQuantity;
        } else {
            const newItem: TransactionItem = {
                sku: product.sku,
                name: product.name,
                price: product.price,
                quantity: quantity,
                discount: 0,
                total: (product.price - 0) * quantity,
            };
            newItems.push(newItem);
        }
        return newItems;
    });
};

  const handleProductSelectAndClose = () => {
    if (selectedProduct) {
      addItemToTransaction(selectedProduct);
    }
    setIsSearchDialogOpen(false);
    setProductSearch('');
    setSelectedProduct(null);
    if (searchInputRef.current) searchInputRef.current.value = '';
    searchInputRef.current?.focus();
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'F2') {
      event.preventDefault();
      holdTransaction();
    } else if (event.key === 'F3') {
      event.preventDefault();
      setIsRecallDialogOpen(true);
    } else if (event.key === 'F11') {
      event.preventDefault();
    } else if (event.key === 'F4') {
        event.preventDefault();
        clearTransaction();
    } else if (event.key === 'F9') {
        event.preventDefault();
    }
  }, [items, heldTransactions]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  useEffect(() => {
    setTotal(calculateTotal(items));
  }, [items]);

  const filteredHeldTransactions = heldTransactions.filter(
    (t) =>
      t.customer.toLowerCase().includes(recallSearch.toLowerCase()) ||
      (t.items[0]?.name.toLowerCase().includes(recallSearch.toLowerCase()))
  );

  const filteredProducts = productCatalog.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );


  return (
    <div className="flex h-screen w-full flex-col bg-zinc-300 text-black">
      {/* Header */}
      <header className="flex items-center justify-between bg-zinc-200 px-4 py-1 border-b-2 border-zinc-400">
        <h1 className="text-lg font-bold text-red-600">RENE Cashier</h1>
        <div className="text-right text-xs font-semibold">
          <p>TOKO BAGUS, Ruko Gaden Plaza No. 9B Jl. Raya Wonopringgo</p>
          <p>082324703076</p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-48 flex-shrink-0 space-y-2 border-r-2 border-zinc-400 bg-zinc-200 p-2">
          <Button variant="pos" className="relative" onClick={holdTransaction}>
            Tunda <KeybindHint>F2</KeybindHint>
          </Button>
          <Button variant="pos" className="relative" onClick={() => setIsRecallDialogOpen(true)}>
            Panggil <KeybindHint>F3</KeybindHint>
          </Button>
          <Button variant="pos" className="relative">
            Kasir <KeybindHint>F11</KeybindHint>
          </Button>
          <Button variant="pos" className="relative" onClick={clearTransaction}>
            Clear <KeybindHint>F4</KeybindHint>
          </Button>

          <div className="py-2">
             <div className="bg-primary/80 h-24 w-full flex items-center justify-center rounded-md">
                <Logo className="!h-20 !w-20 !bg-primary-foreground !text-primary" />
             </div>
          </div>
          
          <Input ref={searchInputRef} type="text" className="h-8 border-2 border-yellow-400 bg-yellow-200 text-black focus:ring-yellow-500" onKeyDown={handleSearchSubmit} />
          <div className="h-16 bg-zinc-800 rounded-md" />
          <div className="h-16 bg-zinc-800 rounded-md" />
        </aside>

        {/* Main Content */}
        <main className="flex flex-1 flex-col">
          <div className="flex items-center justify-between border-b-2 border-zinc-400 bg-zinc-800 p-2 text-white">
            <span className="text-2xl font-semibold">Total</span>
            <span className="font-mono text-7xl font-bold text-yellow-400">
                {total.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="flex-1 flex flex-col bg-white overflow-y-auto">
              <Table className="flex-1">
                <TableHeader className="sticky top-0 bg-zinc-700">
                  <TableRow className="border-zinc-500">
                    <TableHead className="w-24 text-white font-bold">KTS</TableHead>
                    <TableHead className="text-white font-bold">NAMA BARANG</TableHead>
                    <TableHead className="w-40 text-right text-white font-bold">@ HARGA</TableHead>
                    <TableHead className="w-40 text-right text-white font-bold">DISKON</TableHead>
                    <TableHead className="w-48 text-right text-white font-bold">TOTAL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{item.price.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right">{item.discount.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right">{item.total.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {items.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-zinc-400">
                    Belum ada item
                </div>
              )}
          </div>
          <footer className="mt-auto flex items-center justify-between border-t-2 border-zinc-400 bg-zinc-200 px-4 py-2">
            <div className="flex items-center gap-2">
               <Button variant="posAction">Ubah</Button>
               <Button variant="posAction">Hapus</Button>
            </div>
             <div className="flex items-center gap-4 rounded-md bg-zinc-800 px-3 py-1 text-sm text-white">
                <span>Administrator</span>
                <span>{currentTime}</span>
             </div>
            <Button className="relative h-12 w-32 bg-yellow-400 text-black font-bold text-xl hover:bg-yellow-500">
                BAYAR
                <KeybindHint>F9</KeybindHint>
            </Button>
          </footer>
        </main>
      </div>

       <div className="fixed bottom-2 left-2">
         <Button size="icon" className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 shadow-lg" asChild>
            <Link href="/dashboard">
              <Power />
            </Link>
         </Button>
       </div>
       
      <Dialog open={isRecallDialogOpen} onOpenChange={setIsRecallDialogOpen}>
        <DialogContent className="bg-zinc-200 border-zinc-400 text-black max-w-md">
          <DialogHeader className="bg-zinc-700 -mx-6 -mt-6 p-2 px-6 rounded-t-lg">
            <DialogTitle className="text-white">PANGGIL PESANAN</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Label htmlFor="recall-search" className="font-bold">Cari</Label>
                <Input
                  id="recall-search"
                  type="text"
                  value={recallSearch}
                  onChange={(e) => setRecallSearch(e.target.value)}
                  className="h-8 border-2 border-yellow-400 bg-yellow-200 text-black focus:ring-yellow-500"
                />
            </div>
            <div className="border-2 border-zinc-400 h-64 overflow-y-auto bg-white">
              <Table>
                <TableHeader className="bg-zinc-700 sticky top-0">
                  <TableRow>
                    <TableHead className="text-white">Deskripsi</TableHead>
                    <TableHead className="text-white">Pelanggan</TableHead>
                    <TableHead className="text-right text-white">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHeldTransactions.map((t) => (
                    <TableRow key={t.id} onClick={() => recallTransaction(t.id)} className="cursor-pointer hover:bg-yellow-200">
                      <TableCell>{t.items[0]?.name || 'N/A'}</TableCell>
                      <TableCell>{t.customer}</TableCell>
                      <TableCell className="text-right">{t.total.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
               {filteredHeldTransactions.length === 0 && (
                <div className="flex items-center justify-center h-full text-zinc-400">
                  Tidak ada pesanan yang ditunda
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="pos" onClick={() => recallTransaction(filteredHeldTransactions[0]?.id)} className="relative">
              OK <span className="absolute -top-2 -right-2 bg-zinc-600 text-white text-[10px] font-bold px-1 rounded-sm border border-zinc-500">
                Enter
              </span>
            </Button>
            <Button variant="pos" onClick={() => setIsRecallDialogOpen(false)} className="relative">
              Batal <span className="absolute -top-2 -right-2 bg-zinc-600 text-white text-[10px] font-bold px-1 rounded-sm border border-zinc-500">
                Esc
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSearchDialogOpen} onOpenChange={(open) => { if (!open) { setIsSearchDialogOpen(false); setProductSearch(''); setSelectedProduct(null); searchInputRef.current?.focus(); if (searchInputRef.current) searchInputRef.current.value = ''; } else { setIsSearchDialogOpen(true) }}}>
        <DialogContent className="bg-zinc-200 border-zinc-400 text-black max-w-2xl">
            <DialogHeader className="bg-zinc-700 -mx-6 -mt-6 p-2 px-6 rounded-t-lg">
                <DialogTitle className="text-white">CARI BARANG</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Label htmlFor="product-search" className="font-bold">Cari</Label>
                    <Input
                        id="product-search"
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="h-8 border-2 border-yellow-400 bg-yellow-200 text-black focus:ring-yellow-500"
                    />
                </div>
                <div className="border-2 border-zinc-400 h-80 overflow-y-auto bg-white">
                    <Table>
                        <TableHeader className="bg-zinc-700 sticky top-0">
                            <TableRow>
                                <TableHead className="text-white">Nama Barang</TableHead>
                                <TableHead className="text-right text-white">Stok</TableHead>
                                <TableHead className="text-white">Satuan</TableHead>
                                <TableHead className="text-right text-white">Harga</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProducts.map((p) => (
                                <TableRow key={p.sku} onClick={() => setSelectedProduct(p)} onDoubleClick={handleProductSelectAndClose} className={`cursor-pointer ${selectedProduct?.sku === p.sku ? 'bg-yellow-200' : 'hover:bg-yellow-100'}`}>
                                    <TableCell>{p.name}</TableCell>
                                    <TableCell className="text-right">{p.stock}</TableCell>
                                    <TableCell>{p.unit}</TableCell>
                                    <TableCell className="text-right">{p.price.toLocaleString('id-ID')}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {filteredProducts.length === 0 && (
                        <div className="flex items-center justify-center h-full text-zinc-400">
                            Barang tidak ditemukan
                        </div>
                    )}
                </div>
            </div>
            <DialogFooter className="mt-2">
                <Button variant="pos" onClick={handleProductSelectAndClose} className="relative">
                    OK
                    <KeybindHint>Enter</KeybindHint>
                </Button>
                <Button variant="pos" onClick={() => setIsSearchDialogOpen(false)} className="relative">
                    Batal
                    <KeybindHint>Esc</KeybindHint>
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
