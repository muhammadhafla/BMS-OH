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
import { Lock, Power, Settings, Unlock, HardDrive } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';


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

type Keybinds = {
  hold: string;
  recall: string;
  cashier: string;
  clear: string;
  edit: string;
  delete: string;
  pay: string;
  lock: string;
};

type UserRole = 'admin' | 'manager' | 'staff';

export type CashDrawerTransaction = {
  id: string;
  type: 'Uang Awal' | 'Uang Keluar';
  amount: number;
  description: string;
  timestamp: string;
  sessionId: string;
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
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [heldTransactions, setHeldTransactions] = useState<HeldTransaction[]>([]);
  const [isRecallDialogOpen, setIsRecallDialogOpen] = useState(false);
  const [recallSearch, setRecallSearch] = useState('');
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TransactionItem & { index: number } | null>(null);
  const [isKeybindDialogOpen, setIsKeybindDialogOpen] = useState(false);
  const [isCashierMenuOpen, setIsCashierMenuOpen] = useState(false);
  const [keybinds, setKeybinds] = useState<Keybinds>({
    hold: 'F2',
    recall: 'F3',
    cashier: 'F11',
    clear: 'F4',
    edit: 'F7',
    delete: 'F8',
    pay: 'F9',
    lock: 'F5',
  });
  const [isCashDrawerDialogOpen, setIsCashDrawerDialogOpen] = useState(false);
  const [cashDrawerDialogType, setCashDrawerDialogType] = useState<'Uang Awal' | 'Uang Keluar'>('Uang Awal');

  
  // Hardcoded current user role for demonstration. In a real app, this would come from an auth context.
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('staff');


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
    setSelectedItemIndex(null);
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
      setSelectedItemIndex(transactionToRecall.items.length > 0 ? 0 : null);
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
        let newItems = [...prevItems];
        let newSelectedItemIndex;

        if (existingItemIndex > -1) {
            const existingItem = newItems[existingItemIndex];
            const newQuantity = existingItem.quantity + quantity;
            existingItem.quantity = newQuantity;
            existingItem.total = (existingItem.price - existingItem.discount) * newQuantity;
            newSelectedItemIndex = existingItemIndex;
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
            newSelectedItemIndex = newItems.length - 1;
        }
        setSelectedItemIndex(newSelectedItemIndex);
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
  
  const openEditDialog = () => {
    if (selectedItemIndex !== null && items[selectedItemIndex]) {
      setEditingItem({ ...items[selectedItemIndex], index: selectedItemIndex });
      setIsEditDialogOpen(true);
    }
  };

  const handleItemUpdate = (updatedItem: TransactionItem, index: number) => {
    const newItems = [...items];
    newItems[index] = updatedItem;
    setItems(newItems);
    setIsEditDialogOpen(false);
    setEditingItem(null);
  };
  
  const handleItemRowClick = (index: number) => {
    setSelectedItemIndex(index);
  };
  
  const deleteSelectedItem = () => {
    if (selectedItemIndex === null || !items[selectedItemIndex]) return;
    
    setItems(prevItems => {
      const newItems = prevItems.filter((_, index) => index !== selectedItemIndex);
      
      if (newItems.length === 0) {
        setSelectedItemIndex(null);
      } else if (selectedItemIndex >= newItems.length) {
        setSelectedItemIndex(newItems.length - 1);
      }
      
      return newItems;
    });
  };

  const openCashDrawerDialog = (type: 'Uang Awal' | 'Uang Keluar') => {
    setCashDrawerDialogType(type);
    setIsCashDrawerDialogOpen(true);
    setIsCashierMenuOpen(false); // Close the cashier menu
  };

  const handleCashDrawerSubmit = (amount: number, description: string) => {
    const newTransaction: CashDrawerTransaction = {
      id: `cd-${Date.now()}`,
      type: cashDrawerDialogType,
      amount,
      description,
      timestamp: new Date().toISOString(),
      sessionId: 'sesi-01', // Placeholder for session management
    };

    // Save to localStorage
    try {
      const existingTransactions: CashDrawerTransaction[] = JSON.parse(localStorage.getItem('cashDrawerTransactions') || '[]');
      localStorage.setItem('cashDrawerTransactions', JSON.stringify([...existingTransactions, newTransaction]));
    } catch (error) {
      console.error('Failed to save cash drawer transaction to localStorage', error);
    }

    setIsCashDrawerDialogOpen(false);
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isRecallDialogOpen || isSearchDialogOpen || isEditDialogOpen || isKeybindDialogOpen || isCashierMenuOpen || isCashDrawerDialogOpen) return;

    const key = event.key;
    
    if (key === keybinds.hold) {
      event.preventDefault();
      holdTransaction();
    } else if (key === keybinds.recall) {
      event.preventDefault();
      setIsRecallDialogOpen(true);
    } else if (key === keybinds.edit) {
        event.preventDefault();
        openEditDialog();
    } else if (key === keybinds.delete) {
      event.preventDefault();
      deleteSelectedItem();
    } else if (key === keybinds.cashier) {
      event.preventDefault();
      setIsCashierMenuOpen(true);
    } else if (key === keybinds.clear) {
        event.preventDefault();
        clearTransaction();
    } else if (key === keybinds.pay) {
        event.preventDefault();
    }
  }, [items, heldTransactions, selectedItemIndex, isRecallDialogOpen, isSearchDialogOpen, isEditDialogOpen, isKeybindDialogOpen, isCashierMenuOpen, isCashDrawerDialogOpen, keybinds]);

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
      <header className="flex items-center justify-between bg-zinc-200 px-4 py-1 border-b-2 border-zinc-400">
        <h1 className="text-lg font-bold text-red-600">RENE Cashier</h1>
        <div className="flex items-center gap-2">
            <div className="text-right text-xs font-semibold">
                <p>TOKO BAGUS, Ruko Gaden Plaza No. 9B Jl. Raya Wonopringgo</p>
                <p>082324703076</p>
            </div>
             <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-600" onClick={() => setIsKeybindDialogOpen(true)}>
                <Settings />
             </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-48 flex-shrink-0 space-y-2 border-r-2 border-zinc-400 bg-zinc-200 p-2">
          <Button variant="pos" className="relative" onClick={holdTransaction}>
            Tunda <KeybindHint>{keybinds.hold}</KeybindHint>
          </Button>
          <Button variant="pos" className="relative" onClick={() => setIsRecallDialogOpen(true)}>
            Panggil <KeybindHint>{keybinds.recall}</KeybindHint>
          </Button>
          <Button variant="pos" className="relative" onClick={() => setIsCashierMenuOpen(true)}>
            Kasir <KeybindHint>{keybinds.cashier}</KeybindHint>
          </Button>
          <Button variant="pos" className="relative" onClick={clearTransaction}>
            Clear <KeybindHint>{keybinds.clear}</KeybindHint>
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
                    <TableRow key={index}
                        onClick={() => handleItemRowClick(index)}
                        onDoubleClick={openEditDialog}
                        className={selectedItemIndex === index ? 'bg-yellow-200' : 'hover:bg-yellow-100'}
                    >
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
               <Button variant="posAction" className="relative" onClick={openEditDialog}>
                 Ubah <KeybindHint>{keybinds.edit}</KeybindHint>
               </Button>
               <Button variant="posAction" className="relative" onClick={deleteSelectedItem}>
                 Hapus <KeybindHint>{keybinds.delete}</KeybindHint>
               </Button>
            </div>
             <div className="flex items-center gap-4 rounded-md bg-zinc-800 px-3 py-1 text-sm text-white">
                <span>{currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1)}</span>
                <span>{currentTime}</span>
             </div>
            <Button className="relative h-12 w-32 bg-yellow-400 text-black font-bold text-xl hover:bg-yellow-500">
                BAYAR
                <KeybindHint>{keybinds.pay}</KeybindHint>
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
        <DialogContent
          className="bg-zinc-200 border-zinc-400 text-black max-w-md"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (filteredHeldTransactions.length > 0) {
                recallTransaction(filteredHeldTransactions[0]?.id);
              }
            }
          }}
        >
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
            <Button variant="pos" onClick={() => filteredHeldTransactions.length > 0 && recallTransaction(filteredHeldTransactions[0]?.id)} className="relative">
              OK <KeybindHint>Enter</KeybindHint>
            </Button>
            <Button variant="pos" onClick={() => setIsRecallDialogOpen(false)} className="relative">
              Batal <KeybindHint>Esc</KeybindHint>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSearchDialogOpen} onOpenChange={(open) => { if (!open) { setIsSearchDialogOpen(false); setProductSearch(''); setSelectedProduct(null); searchInputRef.current?.focus(); if (searchInputRef.current) searchInputRef.current.value = ''; } else { setIsSearchDialogOpen(true) }}}>
        <DialogContent
          className="bg-zinc-200 border-zinc-400 text-black max-w-2xl"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleProductSelectAndClose();
            }
          }}
        >
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
      
      {editingItem && (
        <EditItemDialog
          item={editingItem}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingItem(null);
          }}
          onUpdate={handleItemUpdate}
          currentUserRole={currentUserRole}
        />
      )}
      
      <KeybindSettingsDialog
        isOpen={isKeybindDialogOpen}
        onClose={() => setIsKeybindDialogOpen(false)}
        keybinds={keybinds}
        setKeybinds={setKeybinds}
       />
       
       <CashierMenuDialog
        isOpen={isCashierMenuOpen}
        onClose={() => setIsCashierMenuOpen(false)}
        onOpenCashDrawerDialog={openCashDrawerDialog}
       />

      <CashDrawerDialog
        isOpen={isCashDrawerDialogOpen}
        onClose={() => setIsCashDrawerDialogOpen(false)}
        type={cashDrawerDialogType}
        onSubmit={handleCashDrawerSubmit}
      />
    </div>
  );
}

// Edit Item Dialog Component
type EditItemDialogProps = {
  item: TransactionItem & { index: number };
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (item: TransactionItem, index: number) => void;
  currentUserRole: UserRole;
};

const EditItemDialog = ({ item, isOpen, onClose, onUpdate, currentUserRole }: EditItemDialogProps) => {
  const [quantity, setQuantity] = useState(item.quantity);
  const [price, setPrice] = useState(item.price);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(item.discount);
  const [isPriceLocked, setIsPriceLocked] = useState(currentUserRole === 'staff');
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  
  const discountAmountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Recalculate discount percentage when discount amount or price changes
    if (price > 0) {
      setDiscountPercent(discountAmount / price * 100);
    } else {
      setDiscountPercent(0);
    }
  }, [discountAmount, price]);
  
  const handleDiscountPercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value) || 0;
    setDiscountPercent(percent);
    setDiscountAmount((price * percent) / 100);
  };
  
  const handleDiscountAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const amount = parseFloat(e.target.value) || 0;
      setDiscountAmount(amount);
  };

  const calculatedTotal = (price - discountAmount) * quantity;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isPriceLocked && price !== item.price) {
        // Maybe show a toast or alert that price can't be changed without auth
        return;
    }
    const updatedItem: TransactionItem = {
      ...item,
      quantity,
      price,
      discount: discountAmount,
      total: calculatedTotal,
    };
    onUpdate(updatedItem, item.index);
  };
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || isAuthDialogOpen) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSubmit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
        window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, quantity, price, discountAmount, discountPercent, isPriceLocked, isAuthDialogOpen, onClose, handleSubmit]);
  
  
  const handleUnlockPrice = () => {
    if (currentUserRole === 'staff') {
      setIsAuthDialogOpen(true);
    } else {
      setIsPriceLocked(false);
    }
  };

  const handleAuthorization = (pin: string) => {
    const storedPin = localStorage.getItem('pos-auth-pin') || '1234';
    if (pin === storedPin) { 
      setIsPriceLocked(false);
      setIsAuthDialogOpen(false);
    } else {
      alert('PIN Salah!');
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-200 border-zinc-400 text-black max-w-lg p-0" onKeyDown={(e) => e.stopPropagation()}>
        <DialogHeader className="bg-zinc-700 p-2 px-4 rounded-t-lg">
          <DialogTitle className="text-white text-sm">PERUBAHAN DETIL STRUK</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="p-4 grid grid-cols-3 gap-x-4 gap-y-2 items-center">
            <Label className="text-right">Nama Barang</Label>
            <Input value={item.name} readOnly className="col-span-2 h-8" />

            <Label className="text-right">Kuantitas</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)} className="col-span-2 h-8 bg-yellow-200 border-yellow-400" />
            
            <Label className="text-right">Harga @</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} className="col-span-2 h-8" disabled={isPriceLocked} />
            
            <Label className="text-right">% | Potongan</Label>
            <div className="col-span-2 flex items-center gap-2">
                <Input type="number" value={discountPercent} onChange={handleDiscountPercentChange} className="h-8 w-20" />
                <Input ref={discountAmountRef} type="number" value={discountAmount} onChange={handleDiscountAmountChange} className="h-8 flex-1" />
            </div>

            <Label className="text-right">Harga Total</Label>
            <Input value={calculatedTotal.toLocaleString('id-ID')} readOnly className="col-span-2 h-8" />
          </div>

          <DialogFooter className="bg-zinc-300 p-2 flex justify-between items-center rounded-b-lg">
            <Button type="button" variant="pos" className="w-auto px-4 h-10" onClick={handleUnlockPrice} disabled={!isPriceLocked}>
                {isPriceLocked ? <Lock className="w-5 h-5"/> : <Unlock className="w-5 h-5"/>}
            </Button>
            <div className="flex gap-2">
                <Button type="submit" variant="pos" className="w-auto px-6 h-10 relative">
                    OK
                    <KeybindHint>Enter</KeybindHint>
                </Button>
                <Button type="button" variant="pos" onClick={onClose} className="w-auto px-6 h-10 relative">
                    Batal
                    <KeybindHint>Esc</KeybindHint>
                </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <AuthorizationDialog 
        isOpen={isAuthDialogOpen}
        onClose={() => setIsAuthDialogOpen(false)}
        onAuthorize={handleAuthorization}
    />
    </>
  );
};


// Keybind Settings Dialog Component
type KeybindSettingsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  keybinds: Keybinds;
  setKeybinds: React.Dispatch<React.SetStateAction<Keybinds>>;
};

const KeybindSettingsDialog = ({ isOpen, onClose, keybinds, setKeybinds }: KeybindSettingsDialogProps) => {
  const [editingKeybinds, setEditingKeybinds] = useState(keybinds);

  const keybindActions: { id: keyof Keybinds; label: string }[] = [
    { id: 'hold', label: 'Tunda Transaksi' },
    { id: 'recall', label: 'Panggil Transaksi' },
    { id: 'cashier', label: 'Buka Laci Kasir' },
    { id: 'clear', label: 'Bersihkan Transaksi' },
    { id: 'edit', label: 'Ubah Item' },
    { id: 'delete', label: 'Hapus Item' },
    { id: 'pay', label: 'Pembayaran' },
    { id: 'lock', label: 'Kunci POS' },
  ];

  const handleKeydown = (e: React.KeyboardEvent<HTMLInputElement>, action: keyof Keybinds) => {
    e.preventDefault();
    const key = e.key;
    setEditingKeybinds(prev => ({ ...prev, [action]: key }));
  };

  const handleSave = () => {
    setKeybinds(editingKeybinds);
    onClose();
  };
  
  useEffect(() => {
    if (isOpen) {
        setEditingKeybinds(keybinds);
    }
  }, [isOpen, keybinds])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-200 border-zinc-400 text-black max-w-md">
        <DialogHeader className="bg-zinc-700 -mx-6 -mt-6 p-2 px-6 rounded-t-lg">
          <DialogTitle className="text-white">Pengaturan Keybind</DialogTitle>
        </DialogHeader>
        <div className="py-4 grid grid-cols-2 gap-x-8 gap-y-3">
          {keybindActions.map(({ id, label }) => (
            <div key={id} className="space-y-1">
              <Label htmlFor={`keybind-${id}`}>{label}</Label>
              <Input
                id={`keybind-${id}`}
                value={editingKeybinds[id]}
                onKeyDown={(e) => handleKeydown(e, id)}
                className="h-8"
                readOnly
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSave} className="bg-accent hover:bg-accent/90">
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Authorization Dialog Component
type AuthorizationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onAuthorize: (pin: string) => void;
};

const AuthorizationDialog = ({ isOpen, onClose, onAuthorize }: AuthorizationDialogProps) => {
  const [pin, setPin] = useState('');
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the input when the dialog opens
      setTimeout(() => pinInputRef.current?.focus(), 100);
    } else {
        setPin(''); // Reset PIN on close
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAuthorize(pin);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-200 border-zinc-400 text-black max-w-sm" onKeyDown={(e) => {if(e.key === 'Enter') handleSubmit(e)}}>
        <DialogHeader className="bg-zinc-700 -mx-6 -mt-6 p-2 px-6 rounded-t-lg">
          <DialogTitle className="text-white">Otorisasi Diperlukan</DialogTitle>
          <DialogDescription className="text-zinc-300 pt-1">
            Masukkan PIN Manager atau Admin untuk mengubah harga.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <Label htmlFor="pin-input" className="sr-only">PIN</Label>
            <Input
              ref={pinInputRef}
              id="pin-input"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="h-10 text-center text-lg border-2 border-yellow-400 bg-yellow-200"
              maxLength={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="pos" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" variant="pos" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Otorisasi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Cashier Menu Dialog
type CashierMenuDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpenCashDrawerDialog: (type: 'Uang Awal' | 'Uang Keluar') => void;
};

const CashierMenuDialog = ({ isOpen, onClose, onOpenCashDrawerDialog }: CashierMenuDialogProps) => {
    useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-300 border-zinc-500 text-black max-w-sm p-0 shadow-lg" onKeyDown={(e) => e.stopPropagation()}>
        <DialogHeader className="bg-zinc-800 p-2 px-4 rounded-t-lg">
          <DialogTitle className="text-white text-base">Menu Kasir</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
            <div className="space-y-1">
                <Label>&raquo; Memasukkan Uang Awal / Keluar Uang</Label>
                <div className="flex gap-2">
                    <Button variant="pos" className="w-full h-9" onClick={() => onOpenCashDrawerDialog('Uang Awal')}>Uang Awal</Button>
                    <Button variant="pos" className="w-full h-9" onClick={() => onOpenCashDrawerDialog('Uang Keluar')}>Uang Keluar</Button>
                </div>
            </div>
            <div className="space-y-1">
                <Label>&raquo; Membuka Laci uang</Label>
                <Button variant="pos" className="w-full h-9">Buka</Button>
            </div>
            <div className="space-y-1">
                <Label>&raquo; Laporan Akhir Shift</Label>
                <Button variant="pos" className="w-full h-9">Laporan</Button>
            </div>
             <div className="space-y-1">
                <Label>&raquo; Kunci Layar</Label>
                <Button variant="pos" className="w-full h-9">Kunci</Button>
            </div>
            <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="auto-lock" />
                <Label htmlFor="auto-lock" className="text-sm font-medium leading-none">
                    Kunci otomatis jika ditinggal selama
                </Label>
                <Input type="number" defaultValue={0} className="w-16 h-8 text-center" />
                <Label>Menit</Label>
            </div>
        </div>
        <DialogFooter className="bg-zinc-200 p-2 rounded-b-lg">
            <Button variant="pos" onClick={onClose} className="w-auto px-6 h-10 relative">
                Tutup
                <KeybindHint>Esc</KeybindHint>
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// Cash Drawer Dialog Component
type CashDrawerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  type: 'Uang Awal' | 'Uang Keluar';
  onSubmit: (amount: number, description: string) => void;
};

const CashDrawerDialog = ({ isOpen, onClose, type, onSubmit }: CashDrawerDialogProps) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const amountInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => amountInputRef.current?.focus(), 100);
    } else {
      setAmount('');
      setDescription('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Nominal tidak valid',
        description: 'Harap masukkan nominal yang benar.',
      });
      return;
    }
    onSubmit(numericAmount, description);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-200 border-zinc-400 text-black max-w-md">
        <DialogHeader className="bg-zinc-700 -mx-6 -mt-6 p-2 px-6 rounded-t-lg">
          <DialogTitle className="text-white">{type}</DialogTitle>
          <DialogDescription className="text-zinc-300 pt-1">
            Masukkan nominal dan keterangan untuk transaksi laci kasir.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cash-drawer-amount">Nominal</Label>
              <Input
                ref={amountInputRef}
                id="cash-drawer-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 border-2 border-yellow-400 bg-yellow-200"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cash-drawer-description">Keterangan</Label>
              <Textarea
                id="cash-drawer-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opsional..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="pos" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" variant="pos" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
