

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
import { Lock, Power, Settings, Unlock, HardDrive, Printer, QrCode } from 'lucide-react';
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
import type { Product as ProductType } from '@/lib/types';
import { getAllProducts } from '@/lib/services/product';
import { useRouter } from 'next/navigation';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"


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

type PaymentMethod = 'Tunai' | 'Kartu Debit' | 'Kartu Kredit' | 'QRIS';

export interface CompletedTransaction {
  id: string;
  items: TransactionItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  timestamp: string;
  sessionId: string;
  cashierName: string;
  change: number;
  amountPaid: number;
}

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
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
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
  const [isShiftReportDialogOpen, setIsShiftReportDialogOpen] = useState(false);
  const [productCatalog, setProductCatalog] = useState<ProductType[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [currentCashier, setCurrentCashier] = useState('');
  const router = useRouter();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const { toast } = useToast();
  const [transactionToPrint, setTransactionToPrint] = useState<CompletedTransaction | null>(null);


  
  // Hardcoded current user role for demonstration. In a real app, this would come from an auth context.
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('staff');


  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
     // Check if POS session is authenticated
    const posAuthenticated = sessionStorage.getItem('pos-authenticated') === 'true';
    const cashierName = sessionStorage.getItem('pos-cashier-name');

    if (!posAuthenticated || !cashierName) {
      router.push('/pos/auth');
      return; // Stop execution if not authenticated
    }

    setCurrentCashier(cashierName);

    // Initialize session ID if it doesn't exist for this session
    let sessionId = sessionStorage.getItem('pos-session-id');
    if (!sessionId) {
      const now = new Date();
      const datePart = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
      const timePart = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
      sessionId = `sesi-${cashierName.replace(/\s+/g, '-')}-${datePart}-${timePart}`;
      sessionStorage.setItem('pos-session-id', sessionId);
    }

    // Auto-connect to QZ Tray
    if (typeof (window as any).qz !== 'undefined') {
      (window as any).qz.websocket.connect().catch((err: any) => {
        console.error("QZ Tray connection error:", err);
        toast({
          variant: 'destructive',
          title: 'QZ Tray Tidak Tersambung',
          description: 'Pastikan aplikasi QZ Tray berjalan dan coba muat ulang halaman.',
        });
      });
    }

  }, [router, toast]);

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

    const fetchProducts = async () => {
        try {
            const products = await getAllProducts();
            setProductCatalog(products);
        } catch (error) {
            console.error("Failed to fetch products:", error);
            // Handle error, e.g., show a toast notification
        }
    };
    fetchProducts();

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
        e.preventDefault();
        const searchTerm = e.currentTarget.value.trim().toLowerCase();
        if (!searchTerm) return;

        // Prioritize exact match on SKU first, then name
        const foundProduct = productCatalog.find(p => p.sku.toLowerCase() === searchTerm) || productCatalog.find(p => p.name.toLowerCase() === searchTerm);

        if (foundProduct) {
            addItemToTransaction(foundProduct);
            e.currentTarget.value = '';
        } else {
            // If no exact match, open search dialog with the term
            setProductSearch(e.currentTarget.value.trim());
            setIsSearchDialogOpen(true);
        }
    }
  };

  const addItemToTransaction = (product: ProductType, quantity: number = 1) => {
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
    const sessionId = sessionStorage.getItem('pos-session-id') || 'sesi-unknown';
    const newTransaction: CashDrawerTransaction = {
      id: `cd-${Date.now()}`,
      type: cashDrawerDialogType,
      amount,
      description,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
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
  
  const openShiftReportDialog = () => {
    setIsCashierMenuOpen(false);
    setIsShiftReportDialogOpen(true);
  };
  
  const lockScreen = () => {
    setIsCashierMenuOpen(false);
    setIsLocked(true);
  }

  const unlockScreen = () => {
    const storedPin = localStorage.getItem('pos-access-pin') || '1234';
    const pin = prompt('Masukkan PIN untuk membuka kunci:');
    if (pin === storedPin) {
      setIsLocked(false);
      searchInputRef.current?.focus();
    } else if (pin !== null) {
      alert('PIN salah.');
    }
  };
  
  const handlePowerOff = () => {
    sessionStorage.removeItem('pos-authenticated');
    sessionStorage.removeItem('pos-session-id');
    sessionStorage.removeItem('pos-cashier-name');
    router.push('/dashboard');
  }

  const handleCompleteTransaction = (paymentMethod: PaymentMethod, change: number, amountPaid: number) => {
    const sessionId = sessionStorage.getItem('pos-session-id') || 'sesi-unknown';
    
    const newTransaction: CompletedTransaction = {
      id: `txn-${Date.now()}`,
      items: items,
      totalAmount: total,
      paymentMethod: paymentMethod,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      cashierName: currentCashier,
      change: change,
      amountPaid: amountPaid,
    };

    try {
      const existingTransactions: CompletedTransaction[] = JSON.parse(localStorage.getItem('pos-transactions') || '[]');
      localStorage.setItem('pos-transactions', JSON.stringify([...existingTransactions, newTransaction]));
    } catch (error) {
      console.error('Failed to save completed transaction to localStorage', error);
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan Transaksi",
        description: "Tidak dapat menyimpan data transaksi ke penyimpanan lokal."
      });
      return; 
    }
    
    toast({
      title: "Transaksi Berhasil",
      description: `Pembayaran dengan ${paymentMethod} telah berhasil.`
    });
    
    // Set transaction to be printed
    setTransactionToPrint(newTransaction);
    setIsPaymentDialogOpen(false);
    
    // Clearing transaction is now handled in useEffect after printing
  };

  useEffect(() => {
    if (transactionToPrint) {
      window.print();
      // Reset after printing
      setTransactionToPrint(null);
      clearTransaction();
    }
  }, [transactionToPrint]);


  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isLocked || isRecallDialogOpen || isSearchDialogOpen || isEditDialogOpen || isKeybindDialogOpen || isCashierMenuOpen || isCashDrawerDialogOpen || isShiftReportDialogOpen || isPaymentDialogOpen) return;

    const key = event.key;
    
    if (key === 'Tab') {
        event.preventDefault();
        searchInputRef.current?.focus();
    } else if (key === keybinds.hold) {
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
    } else if (key === keybinds.lock) {
        event.preventDefault();
        lockScreen();
    } else if (key === keybinds.pay) {
        event.preventDefault();
        if (items.length > 0) {
            setIsPaymentDialogOpen(true);
        }
    }
  }, [items, heldTransactions, selectedItemIndex, keybinds, isLocked, isRecallDialogOpen, isSearchDialogOpen, isEditDialogOpen, isKeybindDialogOpen, isCashierMenuOpen, isCashDrawerDialogOpen, isShiftReportDialogOpen, isPaymentDialogOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  useEffect(() => {
    setTotal(calculateTotal(items));
  }, [items]);
  
  if (isLocked) {
    return <PosLockScreen onUnlock={unlockScreen} />;
  }

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
    <>
    <div className="flex h-screen w-full flex-col bg-zinc-300 text-black print-area">
      <header className="flex items-center justify-between bg-zinc-200 px-4 py-1 border-b-2 border-zinc-400 no-print">
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

      <div className="flex flex-1 overflow-hidden no-print">
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
          <div className="h-16 bg-zinc-800 rounded-md flex items-center justify-center text-zinc-400">
            <Printer className="w-8 h-8" />
          </div>
          <div className="h-16 bg-zinc-800 rounded-md flex items-center justify-center text-zinc-400">
            <HardDrive className="w-8 h-8" />
          </div>
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
                <span>{currentCashier}</span>
                <span>{currentTime}</span>
             </div>
            <Button className="relative h-12 w-32 bg-yellow-400 text-black font-bold text-xl hover:bg-yellow-500" onClick={() => items.length > 0 && setIsPaymentDialogOpen(true)}>
                BAYAR
                <KeybindHint>{keybinds.pay}</KeybindHint>
            </Button>
          </footer>
        </main>
      </div>

       <div className="fixed bottom-2 left-2 no-print">
         <Button size="icon" className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 shadow-lg" onClick={handlePowerOff}>
            <Power />
         </Button>
       </div>
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
                                <TableRow key={p.id} onClick={() => setSelectedProduct(p)} onDoubleClick={handleProductSelectAndClose} className={`cursor-pointer ${selectedProduct?.id === p.id ? 'bg-yellow-200' : 'hover:bg-yellow-100'}`}>
                                    <TableCell>{p.name}</TableCell>
                                    <TableCell className="text-right">{p.stock.main}</TableCell> {/* Assuming main branch for now */}
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
        onOpenShiftReportDialog={openShiftReportDialog}
        onLockScreen={lockScreen}
       />

      <CashDrawerDialog
        isOpen={isCashDrawerDialogOpen}
        onClose={() => setIsCashDrawerDialogOpen(false)}
        type={cashDrawerDialogType}
        onSubmit={handleCashDrawerSubmit}
      />
      
      <ShiftReportDialog
        isOpen={isShiftReportDialogOpen}
        onClose={() => setIsShiftReportDialogOpen(false)}
        currentUserRole={currentUserRole}
      />

       <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        totalAmount={total}
        onCompleteTransaction={handleCompleteTransaction}
      />
      
      {transactionToPrint && (
        <div className="print-only">
          <ReceiptTemplate transaction={transactionToPrint} />
        </div>
      )}

    </>
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

  const calculatedTotal = (price * quantity) - (discountAmount * quantity);

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
    // This is the PIN for authorizing actions within the POS, set in the main settings page.
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
  onOpenShiftReportDialog: () => void;
  onLockScreen: () => void;
};

const CashierMenuDialog = ({ isOpen, onClose, onOpenCashDrawerDialog, onOpenShiftReportDialog, onLockScreen }: CashierMenuDialogProps) => {
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
                <Button variant="pos" className="w-full h-9" onClick={onOpenShiftReportDialog}>Laporan</Button>
            </div>
             <div className="space-y-1">
                <Label>&raquo; Kunci Layar</Label>
                <Button variant="pos" className="w-full h-9" onClick={onLockScreen}>Kunci</Button>
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


// Shift Report Dialog Component
type ShiftReportDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: UserRole;
};

const ReportRow = ({ label, value }: { label: string; value: number }) => (
  <div className="flex justify-between items-center">
    <Label>{label}</Label>
    <Input
      readOnly
      value={value.toLocaleString('id-ID')}
      className="h-8 w-48 text-right bg-zinc-800 text-white border-zinc-500 font-mono"
    />
  </div>
);

const ShiftReportDialog = ({ isOpen, onClose, currentUserRole }: ShiftReportDialogProps) => {
  const [reportData, setReportData] = useState({
    totalSales: 0,
    cashPayment: 0,
    debitCard: 0,
    creditCard: 0,
    qris: 0,
    initialCash: 0,
    cashWithdrawal: 0,
  });

  useEffect(() => {
    if (!isOpen) return;

    // This logic runs on the client, so localStorage is available.
    const sessionId = sessionStorage.getItem('pos-session-id');
    if (!sessionId) return;

    try {
      // Get cash drawer activities
      const storedDrawerData = localStorage.getItem('cashDrawerTransactions');
      const allDrawerTransactions: CashDrawerTransaction[] = storedDrawerData ? JSON.parse(storedDrawerData) : [];
      const sessionDrawerTransactions = allDrawerTransactions.filter(t => t.sessionId === sessionId);
      
      const initialCash = sessionDrawerTransactions
        .filter(t => t.type === 'Uang Awal')
        .reduce((sum, t) => sum + t.amount, 0);

      const cashWithdrawal = sessionDrawerTransactions
        .filter(t => t.type === 'Uang Keluar')
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Get completed transactions
      const storedSalesData = localStorage.getItem('pos-transactions');
      const allSales: CompletedTransaction[] = storedSalesData ? JSON.parse(storedSalesData) : [];
      const sessionSales = allSales.filter(t => t.sessionId === sessionId);

      const totalSales = sessionSales.reduce((sum, t) => sum + t.totalAmount, 0);
      const cashPayment = sessionSales.filter(t => t.paymentMethod === 'Tunai').reduce((sum, t) => sum + t.totalAmount, 0);
      const debitCard = sessionSales.filter(t => t.paymentMethod === 'Kartu Debit').reduce((sum, t) => sum + t.totalAmount, 0);
      const creditCard = sessionSales.filter(t => t.paymentMethod === 'Kartu Kredit').reduce((sum, t) => sum + t.totalAmount, 0);
      const qris = sessionSales.filter(t => t.paymentMethod === 'QRIS').reduce((sum, t) => sum + t.totalAmount, 0);


      setReportData({
        totalSales,
        cashPayment,
        debitCard,
        creditCard,
        qris,
        initialCash,
        cashWithdrawal,
      });

    } catch (error) {
      console.error('Gagal membuat laporan shift:', error);
    }

  }, [isOpen]);
  
  const totalInDrawer = reportData.initialCash + reportData.cashPayment - reportData.cashWithdrawal;
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
       if (event.key.toLowerCase() === 'p') { // Keybind for Print (Cetak)
        event.preventDefault();
        // Print logic here
        console.log("Printing report...");
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-700 border-zinc-500 text-white max-w-md p-0" onKeyDown={(e) => e.stopPropagation()}>
        <DialogHeader className="bg-zinc-800 p-2 px-4 rounded-t-lg">
          <DialogTitle className="text-white text-base">
            LAPORAN KASIR [{currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1)}]
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">&raquo; Total Belanjaan</Label>
            <ReportRow label="Total" value={reportData.totalSales} />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">&raquo; Rincian Pembayaran</Label>
            <ReportRow label="Tunai" value={reportData.cashPayment} />
            <ReportRow label="Kartu Debit" value={reportData.debitCard} />
            <ReportRow label="Kartu Kredit" value={reportData.creditCard} />
            <ReportRow label="QRIS" value={reportData.qris} />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">&raquo; Uang Tunai dalam Laci</Label>
            <ReportRow label="Uang Awal" value={reportData.initialCash} />
            <ReportRow label="Pembayaran Tunai" value={reportData.cashPayment} />
            <ReportRow label="Tarik Uang" value={reportData.cashWithdrawal} />
            <ReportRow label="Total" value={totalInDrawer} />
          </div>
        </div>

        <DialogFooter className="bg-zinc-800 p-2 gap-2 justify-end rounded-b-lg">
          <Button variant="pos" className="w-auto px-6 h-10 relative">
            Cetak
            <KeybindHint>P</KeybindHint>
          </Button>
          <Button variant="pos" onClick={onClose} className="w-auto px-6 h-10 relative">
            Tutup
            <KeybindHint>Esc</KeybindHint>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PosLockScreen = ({ onUnlock }: { onUnlock: () => void }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    pinInputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This uses the same access PIN as the main auth screen.
    const accessPin = localStorage.getItem('pos-access-pin') || '1234';
    if (pin === accessPin) {
      onUnlock();
    } else {
      setError('PIN salah. Coba lagi.');
      setPin('');
    }
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-800 text-white">
        <Logo className="!h-24 !w-24 !text-4xl mb-6" />
        <h1 className="text-3xl font-bold mb-2">POS Terkunci</h1>
        <p className="text-zinc-400 mb-6">Masukkan PIN untuk membuka kunci.</p>
        <form onSubmit={handleSubmit} className="w-full max-w-xs">
            <Input
              ref={pinInputRef}
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="h-12 text-center text-2xl tracking-[1rem] bg-zinc-700 border-zinc-600 text-white"
              maxLength={4}
            />
            {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
            <Button type="submit" className="w-full mt-4 h-12 text-lg bg-yellow-400 text-black hover:bg-yellow-500">
                Buka Kunci
            </Button>
        </form>
    </div>
  );
};


// Payment Dialog Component
type PaymentDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onCompleteTransaction: (paymentMethod: PaymentMethod, change: number, amountPaid: number) => void;
};

const PaymentDialog = ({ isOpen, onClose, totalAmount, onCompleteTransaction }: PaymentDialogProps) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai');
  const [amountPaid, setAmountPaid] = useState('');
  const [change, setChange] = useState(0);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Reset state on open
      setPaymentMethod('Tunai');
      setAmountPaid('');
      setChange(0);
      // Focus the input if payment method is cash
      setTimeout(() => {
        if (paymentMethod === 'Tunai') {
          amountInputRef.current?.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (paymentMethod === 'Tunai') {
      const paid = parseFloat(amountPaid) || 0;
      const newChange = paid - totalAmount;
      setChange(newChange < 0 ? 0 : newChange);
    } else {
      setAmountPaid(String(totalAmount));
      setChange(0);
    }
  }, [amountPaid, totalAmount, paymentMethod]);
  
  useEffect(() => {
    if(isOpen && paymentMethod === 'Tunai') {
        amountInputRef.current?.focus();
        setAmountPaid('');
    }
  }, [paymentMethod, isOpen]);

  const handleFinishTransaction = () => {
    const paidAmount = parseFloat(amountPaid) || 0;
    if (paymentMethod === 'Tunai' && paidAmount < totalAmount) {
        toast({
            variant: "destructive",
            title: "Pembayaran Kurang",
            description: "Jumlah yang dibayarkan kurang dari total belanja."
        });
        return;
    }
    const finalChange = paymentMethod === 'Tunai' ? change : 0;
    onCompleteTransaction(paymentMethod, finalChange, paidAmount);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-200 border-zinc-400 text-black max-w-2xl p-0" onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleFinishTransaction();
        }
      }}>
        <DialogHeader className="bg-zinc-700 p-3 px-6 rounded-t-lg">
          <DialogTitle className="text-white text-lg">Pembayaran</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 p-6">
          {/* Left Side: Payment Details */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-bold">Total Belanja</Label>
              <div className="text-5xl font-mono font-bold text-red-600 mt-1">
                {totalAmount.toLocaleString('id-ID')}
              </div>
            </div>

            <div className={paymentMethod === 'Tunai' ? 'space-y-2' : 'space-y-2 opacity-50'}>
              <Label htmlFor="amount-paid" className="font-bold">Jumlah Bayar</Label>
              <Input
                ref={amountInputRef}
                id="amount-paid"
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                disabled={paymentMethod !== 'Tunai'}
                className="h-12 text-2xl font-mono border-2 border-yellow-400 bg-yellow-200"
                placeholder="0"
              />
            </div>

             <div className={paymentMethod === 'Tunai' ? 'space-y-2' : 'space-y-2 opacity-50'}>
              <Label className="font-bold">Kembali</Label>
              <div className="text-4xl font-mono font-bold text-blue-600">
                {change > 0 ? change.toLocaleString('id-ID') : '0'}
              </div>
            </div>
          </div>

          {/* Right Side: Payment Method Selection */}
          <div className="space-y-4">
            <Label className="text-base font-bold">Metode Pembayaran</Label>
             <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              className="grid grid-cols-2 gap-4"
            >
              <Label htmlFor="pay-tunai" className={`flex flex-col items-center justify-center p-4 border-2 rounded-md cursor-pointer hover:bg-zinc-300 ${paymentMethod === 'Tunai' ? 'border-blue-500 bg-blue-100' : 'border-zinc-300'}`}>
                <RadioGroupItem value="Tunai" id="pay-tunai" className="sr-only"/>
                <HardDrive className="w-8 h-8 mb-2" />
                <span>Tunai</span>
              </Label>
              <Label htmlFor="pay-debit" className={`flex flex-col items-center justify-center p-4 border-2 rounded-md cursor-pointer hover:bg-zinc-300 ${paymentMethod === 'Kartu Debit' ? 'border-blue-500 bg-blue-100' : 'border-zinc-300'}`}>
                <RadioGroupItem value="Kartu Debit" id="pay-debit" className="sr-only" />
                <HardDrive className="w-8 h-8 mb-2" />
                <span>Kartu Debit</span>
              </Label>
              <Label htmlFor="pay-kredit" className={`flex flex-col items-center justify-center p-4 border-2 rounded-md cursor-pointer hover:bg-zinc-300 ${paymentMethod === 'Kartu Kredit' ? 'border-blue-500 bg-blue-100' : 'border-zinc-300'}`}>
                <RadioGroupItem value="Kartu Kredit" id="pay-kredit" className="sr-only" />
                <HardDrive className="w-8 h-8 mb-2" />
                <span>Kartu Kredit</span>
              </Label>
              <Label htmlFor="pay-qris" className={`flex flex-col items-center justify-center p-4 border-2 rounded-md cursor-pointer hover:bg-zinc-300 ${paymentMethod === 'QRIS' ? 'border-blue-500 bg-blue-100' : 'border-zinc-300'}`}>
                 <RadioGroupItem value="QRIS" id="pay-qris" className="sr-only"/>
                <QrCode className="w-8 h-8 mb-2" />
                <span>QRIS</span>
              </Label>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="bg-zinc-300 p-2 flex justify-end rounded-b-lg">
          <Button variant="pos" onClick={onClose} className="w-auto px-6 h-10">Batal</Button>
          <Button onClick={handleFinishTransaction} className="bg-green-600 hover:bg-green-700 text-white w-auto px-6 h-10 font-bold">
            Selesaikan Transaksi & Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
    

const ReceiptTemplate = ({ transaction }: { transaction: CompletedTransaction }) => {
  const { items, totalAmount, paymentMethod, timestamp, change, amountPaid } = transaction;

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="w-[240px] bg-white text-black p-2 font-mono text-xs">
      <div className="text-center mb-2">
        {/* Simplified Logo */}
        <div className="text-4xl font-bold leading-none">B</div>
        <div className="font-semibold">BAGUS</div>
      </div>
      
      <div className="border-t border-dashed border-black pt-1">
        {items.map((item, index) => (
          <div key={index} className="mb-1">
            <div className="flex justify-between">
                <span>{item.name}</span>
                <span>{(item.quantity * item.price).toLocaleString('id-ID')}*</span>
            </div>
            <div>{item.quantity} x @ {item.price.toLocaleString('id-ID')}</div>
            {item.discount > 0 && (
              <div>Diskon {item.discount.toLocaleString('id-ID')}</div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-black my-1 pt-1">
          <p>Total barang dibeli: {totalItems}</p>
      </div>

      <div className="border-t border-dashed border-black my-1 pt-1 space-y-1">
        <div className="flex justify-between font-bold">
          <span>TOTAL</span>
          <span>{totalAmount.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between">
          <span>TUNAI</span>
          <span>{paymentMethod === 'Tunai' ? amountPaid.toLocaleString('id-ID') : '0'}</span>
        </div>
        <div className="flex justify-between">
          <span>NON TUNAI</span>
          <span>{paymentMethod !== 'Tunai' ? amountPaid.toLocaleString('id-ID') : '0'}</span>
        </div>
        <div className="flex justify-between">
          <span>KEMBALI</span>
          <span>{change.toLocaleString('id-ID')}</span>
        </div>
        {/* Placeholder for rounding */}
        <div className="flex justify-between">
          <span>PEMBULATAN</span>
          <span>0</span>
        </div>
      </div>
      
      <div className="flex justify-between text-[10px] mt-2">
        <span>{new Date(timestamp).toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric'})}</span>
        <span>{new Date(timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      <div className="text-center mt-2">
        <p>Terima Kasih</p>
      </div>
    </div>
  );
};


    


