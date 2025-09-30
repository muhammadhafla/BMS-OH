
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Lock,
  Power,
  Settings,
  Unlock,
  HardDrive,
  Printer,
  QrCode,
  Search,
  Eraser,
  Edit,
  Trash2,
  ArrowLeftRight,
  Clock,
  Hand,
  Pause,
  Play,
  Coins,
  LogOut,
  Receipt,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import type { Product as ProductType } from '@/lib/types';
import { getAllProducts } from '@/lib/services/product';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
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
} from '@/components/ui/alert-dialog';
import { InternalChat } from '@/components/shared/internal-chat';


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

export interface CompletedTransaction {
  id: string;
  items: TransactionItem[];
  subTotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  timestamp: string;
  sessionId: string;
  cashierName: string;
  change: number;
  amountPaid: number;
}

const initialItems: TransactionItem[] = [];

const PowerOffDialog = ({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
        <AlertDialogDescription>
          Pastikan Anda telah mencetak laporan shift terakhir sebelum keluar.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Batal</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Keluar</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

type PaymentMethod = 'Tunai' | 'Kartu Debit' | 'Kartu Kredit' | 'QRIS';

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
  const [editingItem, setEditingItem] = useState<(TransactionItem & { index: number }) | null>(null);
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
  const [isPowerOffDialogOpen, setIsPowerOffDialogOpen] = useState(false);
  const { toast } = useToast();

  
  // Hardcoded current user role for demonstration. In a real app, this would come from an auth context.
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('staff');


  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
     // Check if POS session is authenticated
    const posAuthenticated = sessionStorage.getItem('pos-authenticated') === 'true'; //berisi tentang auth//
    const cashierName = sessionStorage.getItem('pos-cashier-name'); //berisi tentang auth//

    if (!posAuthenticated || !cashierName) {
      router.push('/pos/auth');
      return; // Stop execution if not authenticated
    }

    setCurrentCashier(cashierName);

    // Initialize session ID if it doesn't exist for this session
    let sessionId = sessionStorage.getItem('pos-session-id'); //perlu diganti//
    if (!sessionId) {
      const now = new Date();
      const datePart = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
      const timePart = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
      sessionId = `sesi-${cashierName.replace(/\s+/g, '-')}-${datePart}-${timePart}`;
      sessionStorage.setItem('pos-session-id', sessionId); //perlu diganti//
    }

    // Auto-connect to QZ Tray
    if (typeof (window as any).qz !== 'undefined') {
        const qz = (window as any).qz;
        if (!qz.websocket.isActive()) {
            qz.websocket.connect() //perlu diganti//
            .then(() => {
                console.log("QZ Tray connected!");
                toast({
                    title: 'QZ Tray Terhubung',
                    description: 'Printer dan laci kasir siap digunakan.',
                });
            })
            .catch((err: any) => {
                console.error("QZ Tray connection error:", err);
                toast({
                    variant: 'destructive',
                    title: 'QZ Tray Gagal Terhubung',
                    description: 'Pastikan aplikasi QZ Tray berjalan dan coba muat ulang halaman.',
                });
            });
        }
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
            const products = await getAllProducts(); //perlu diganti//
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
    const sessionId = sessionStorage.getItem('pos-session-id') || 'sesi-unknown'; //perlu diganti//
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
      const existingTransactions: CashDrawerTransaction[] = JSON.parse(localStorage.getItem('cashDrawerTransactions') || '[]'); //perlu diganti//
      localStorage.setItem('cashDrawerTransactions', JSON.stringify([...existingTransactions, newTransaction])); //perlu diganti//
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
    const storedPin = localStorage.getItem('pos-access-pin') || '1234'; //berisi tentang auth//
    const pin = prompt('Masukkan PIN untuk membuka kunci:');
    if (pin === storedPin) {
      setIsLocked(false);
      searchInputRef.current?.focus();
    } else if (pin !== null) {
      alert('PIN salah.');
    }
  };
  
  const handlePowerOff = () => {
    setIsPowerOffDialogOpen(true);
  }

  const confirmPowerOff = () => {
    sessionStorage.removeItem('pos-authenticated');
    sessionStorage.removeItem('pos-cashier-name');
    sessionStorage.removeItem('pos-session-id');
    router.push('/dashboard');
  }

  const printReceiptWithQZ = async (transaction: CompletedTransaction) => {
      const qz = (window as any).qz;
      if (!qz || !qz.websocket.isActive()) {
          toast({
              variant: "destructive",
              title: "QZ Tray Tidak Terhubung",
              description: "Tidak dapat mencetak struk. Pastikan QZ Tray berjalan."
          });
          return;
      }
      
      const printerName = "POS-58"; // TODO: Make this configurable
      
      let dataToPrint = [];
      
      // Header
      dataToPrint.push('\x1B\x40'); // Reset
      dataToPrint.push('\x1B\x61\x31'); // Align center
      dataToPrint.push('\x1D\x21\x11'); // Double height, double width
      dataToPrint.push('B\n');
      dataToPrint.push('\x1D\x21\x00'); // Normal size
      dataToPrint.push('BAGUS\n\n');
      
      dataToPrint.push('\x1B\x61\x30'); // Align left

      // Items
      for (const item of transaction.items) {
          const itemTotal = (item.quantity * item.price).toLocaleString('id-ID');
          let line1 = `${item.name.padEnd(20)}${itemTotal.padStart(12)}\n`;
          let line2 = `  ${item.quantity} x @ ${item.price.toLocaleString('id-ID')}\n`;
          dataToPrint.push(line1);
          dataToPrint.push(line2);
          if (item.discount > 0) {
              dataToPrint.push(`  Diskon ${item.discount.toLocaleString('id-ID')}\n`);
          }
      }
      
      dataToPrint.push('--------------------------------\n');
      
      // Summary
      const totalItems = transaction.items.reduce((sum, item) => sum + item.quantity, 0);
      dataToPrint.push(`Total barang dibeli: ${totalItems}\n`);
      dataToPrint.push('--------------------------------\n');
      
      dataToPrint.push(`${'TOTAL'.padEnd(12)}${transaction.totalAmount.toLocaleString('id-ID').padStart(20)}\n`);
      dataToPrint.push(`${'TUNAI'.padEnd(12)}${(transaction.paymentMethod === 'Tunai' ? transaction.amountPaid : 0).toLocaleString('id-ID').padStart(20)}\n`);
      dataToPrint.push(`${'NON TUNAI'.padEnd(12)}${(transaction.paymentMethod !== 'Tunai' ? transaction.amountPaid : 0).toLocaleString('id-ID').padStart(20)}\n`);
      dataToPrint.push(`${'KEMBALI'.padEnd(12)}${transaction.change.toLocaleString('id-ID').padStart(20)}\n`);
      dataToPrint.push(`${'PEMBULATAN'.padEnd(12)}${'0'.padStart(20)}\n\n`);

      // Footer
      const date = new Date(transaction.timestamp).toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric'});
      const time = new Date(transaction.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      dataToPrint.push(`${date.padEnd(20)}${time.padStart(12)}\n\n`);
      
      dataToPrint.push('\x1B\x61\x31'); // Align center
      dataToPrint.push('Terima Kasih\n\n\n');

      // Cut and Open Drawer commands
      dataToPrint.push('\x1D\x56\x42\x00'); // Cut paper
      dataToPrint.push('\x1B\x70\x00\x19\xFA'); // Open drawer
      
      const config = qz.configs.create(printerName);
      
      try {
          await qz.print(config, dataToPrint); //perlu diganti//
          toast({
              title: "Struk Terkirim",
              description: "Struk sedang dicetak dan laci kasir terbuka."
          });
      } catch (e) {
          console.error("QZ Print Error:", e);
           toast({
              variant: "destructive",
              title: "Gagal Mencetak",
              description: e instanceof Error ? e.message : "Terjadi kesalahan dengan QZ Tray."
          });
      }
  };


  const handleCompleteTransaction = async (
    paymentMethod: PaymentMethod,
    change: number,
    amountPaid: number,
    finalTotal: number,
    discountAmount: number
  ) => {
    const sessionId = sessionStorage.getItem('pos-session-id') || 'sesi-unknown'; //perlu diganti//
    
    const newTransaction: CompletedTransaction = {
      id: `txn-${Date.now()}`,
      items: items,
      subTotal: total, // Original total before discount
      discount: discountAmount,
      totalAmount: finalTotal, // Final total after discount
      paymentMethod: paymentMethod,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      cashierName: currentCashier,
      change: change,
      amountPaid: amountPaid,
    };

    try {
      const existingTransactions: CompletedTransaction[] = JSON.parse(localStorage.getItem('pos-transactions') || '[]'); //perlu diganti//
      localStorage.setItem('pos-transactions', JSON.stringify([...existingTransactions, newTransaction])); //perlu diganti//
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
    
    // Print with QZ Tray
    await printReceiptWithQZ(newTransaction);
    
    setIsPaymentDialogOpen(false);
    clearTransaction();
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isLocked || isRecallDialogOpen || isSearchDialogOpen || isEditDialogOpen || isKeybindDialogOpen || isCashierMenuOpen || isCashDrawerDialogOpen || isShiftReportDialogOpen || isPaymentDialogOpen) return;

    const key = event.key;
    const target = event.target as HTMLElement;

    // Don't interfere if user is typing in an input, unless it's the main search input
    if (target.nodeName === 'INPUT' && target.id !== 'main-pos-search') {
      if(key === 'Escape') {
         searchInputRef.current?.focus();
      }
      return;
    }
    
    if (key === 'Tab') {
        event.preventDefault();
        searchInputRef.current?.focus();
    } else if (key.toLowerCase() === 'b' && event.ctrlKey) { // Ctrl+B for Bayar
        event.preventDefault();
        if (items.length > 0) setIsPaymentDialogOpen(true);
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
  }, [items, heldTransactions, selectedItemIndex, keybinds, isLocked, isRecallDialogOpen, isSearchDialogOpen, isEditDialogOpen, isKeybindDialogOpen, isCashierMenuOpen, isCashDrawerDialogOpen, isShiftReportDialogOpen, isPaymentDialogOpen, clearTransaction, holdTransaction, openEditDialog, deleteSelectedItem, lockScreen]);

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
    <div className="flex h-screen w-full flex-col bg-muted/30">
      <header className="flex h-16 items-center justify-between border-b bg-background px-6">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="text-lg font-semibold">POS Kasir</h1>
            <p className="text-sm text-muted-foreground">{currentCashier}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="text-right text-sm">
                <p className="font-medium">{currentTime.split(' ')[0]}</p>
                <p className="text-muted-foreground">{currentTime.split(' ')[1]}</p>
            </div>
             <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setIsKeybindDialogOpen(true)}>
                <Settings className="h-5 w-5"/>
             </Button>
             <Button size="icon" variant="ghost" className="h-9 w-9" onClick={handlePowerOff}>
                <Power className="h-5 w-5"/>
             </Button>
        </div>
        </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col p-4 gap-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    id="main-pos-search"
                    ref={searchInputRef}
                    placeholder="Pindai atau cari produk berdasarkan nama/SKU... (Tab)" 
                    className="h-12 pl-10 text-base"
                    onKeyDown={handleSearchSubmit}
                />
            </div>
            
            <Card className="flex-1">
                <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-280px)]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead className="w-[80px]">Jml.</TableHead>
                            <TableHead>Nama Barang</TableHead>
                            <TableHead className="w-[120px] text-right">@ Harga</TableHead>
                            <TableHead className="w-[120px] text-right">Diskon</TableHead>
                            <TableHead className="w-[150px] text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, index) => (
                            <TableRow 
                                key={index}
                                onClick={() => handleItemRowClick(index)}
                                onDoubleClick={openEditDialog}
                                className={`cursor-pointer ${selectedItemIndex === index ? 'bg-accent/20' : 'hover:bg-muted/50'}`}
                            >
                              <TableCell className="font-medium">{item.quantity}</TableCell>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-right">{item.price.toLocaleString('id-ID')}</TableCell>
                              <TableCell className="text-right">{item.discount > 0 ? item.discount.toLocaleString('id-ID') : '-'}</TableCell>
                              <TableCell className="text-right font-semibold">{item.total.toLocaleString('id-ID')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {items.length === 0 && (
                        <div className="flex h-[calc(100vh-340px)] items-center justify-center text-muted-foreground">
                            <p>Belum ada item ditambahkan</p>
                        </div>
                      )}
                    </ScrollArea>
                </CardContent>
            </Card>

            <div className="flex gap-2">
                 <Button variant="outline" className="h-12" onClick={openEditDialog} disabled={selectedItemIndex === null}>
                    <Edit/> Ubah <span className="ml-2 text-xs text-muted-foreground">({keybinds.edit})</span>
                 </Button>
                 <Button variant="outline" className="h-12 text-destructive hover:text-destructive" onClick={deleteSelectedItem} disabled={selectedItemIndex === null}>
                    <Trash2/> Hapus <span className="ml-2 text-xs text-muted-foreground">({keybinds.delete})</span>
                 </Button>
                 <Button variant="outline" className="h-12 ml-auto" onClick={clearTransaction} disabled={items.length === 0}>
                    <Eraser/> Bersihkan <span className="ml-2 text-xs text-muted-foreground">({keybinds.clear})</span>
                 </Button>
            </div>
        </main>
        
        <aside className="w-[380px] flex-shrink-0 border-l bg-background p-4 flex flex-col gap-4">
            <div className="text-center rounded-lg bg-primary text-primary-foreground p-4">
                <p className="text-lg">Total Belanja</p>
                <p className="font-bold text-5xl tracking-tight">
                    Rp{total.toLocaleString('id-ID')}
                </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" className="h-16 text-base" onClick={holdTransaction}>
                    <Pause/> Tunda <span className="ml-auto text-xs opacity-70">({keybinds.hold})</span>
                </Button>
                <Button variant="secondary" className="h-16 text-base" onClick={() => setIsRecallDialogOpen(true)}>
                    <Play/> Panggil <span className="ml-auto text-xs opacity-70">({keybinds.recall})</span>
                </Button>
                 <Button variant="secondary" className="h-16 text-base" onClick={() => setIsCashierMenuOpen(true)}>
                    <Hand/> Kasir <span className="ml-auto text-xs opacity-70">({keybinds.cashier})</span>
                </Button>
                <Button variant="secondary" className="h-16 text-base" onClick={lockScreen}>
                    <Lock/> Kunci <span className="ml-auto text-xs opacity-70">({keybinds.lock})</span>
                </Button>
                <Sheet>
                    <SheetTrigger asChild>
                         <Button variant="secondary" className="h-16 text-base">
                            <MessageSquare/> Pesan
                         </Button>
                    </SheetTrigger>
                    <SheetContent className="p-0 sm:max-w-md">
                        <SheetHeader className="p-4 border-b">
                            <SheetTitle>Pesan Internal</SheetTitle>
                        </SheetHeader>
                        <div className="h-[calc(100vh-80px)]">
                          <InternalChat />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
            
            <Button className="h-24 w-full mt-auto text-2xl font-bold bg-accent hover:bg-accent/90" onClick={() => items.length > 0 && setIsPaymentDialogOpen(true)} disabled={items.length === 0}>
                BAYAR
                <span className="ml-auto text-xs opacity-70">(Ctrl+B / {keybinds.pay})</span>
            </Button>
        </aside>

      </div>
    </div>
       
      <Dialog open={isRecallDialogOpen} onOpenChange={setIsRecallDialogOpen}>
        <DialogContent
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (filteredHeldTransactions.length > 0) {
                recallTransaction(filteredHeldTransactions[0]?.id);
              }
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Panggil Transaksi yang Ditunda</DialogTitle>
             <DialogDescription>Pilih transaksi untuk dilanjutkan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
             <Input
                  id="recall-search"
                  type="text"
                  value={recallSearch}
                  onChange={(e) => setRecallSearch(e.target.value)}
                  placeholder="Cari berdasarkan pelanggan atau item..."
                  className="h-10"
                />
            <ScrollArea className="h-64 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHeldTransactions.map((t) => (
                    <TableRow key={t.id} onClick={() => recallTransaction(t.id)} className="cursor-pointer hover:bg-muted">
                      <TableCell className="font-medium">{t.items[0]?.name || 'N/A'}{t.items.length > 1 ? ` (+${t.items.length - 1} item)` : ''}</TableCell>
                      <TableCell>{t.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell className="text-right">Rp{t.total.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
               {filteredHeldTransactions.length === 0 && (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Tidak ada transaksi yang ditunda
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setIsRecallDialogOpen(false)}>Batal</Button>
            <Button onClick={() => filteredHeldTransactions.length > 0 && recallTransaction(filteredHeldTransactions[0]?.id)} disabled={filteredHeldTransactions.length === 0}>
                Panggil Pilihan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSearchDialogOpen} onOpenChange={(open) => { if (!open) { setIsSearchDialogOpen(false); setProductSearch(''); setSelectedProduct(null); searchInputRef.current?.focus(); if (searchInputRef.current) searchInputRef.current.value = ''; } else { setIsSearchDialogOpen(true) }}}>
        <DialogContent
            className="max-w-2xl"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleProductSelectAndClose();
            }
          }}
        >
            <DialogHeader>
                <DialogTitle>Cari Produk</DialogTitle>
                <DialogDescription>Cari dan pilih produk untuk ditambahkan ke transaksi.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <Input
                    id="product-search-dialog"
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Ketik nama atau SKU produk..."
                />
                <ScrollArea className="h-80 border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Barang</TableHead>
                                <TableHead className="text-right">Stok</TableHead>
                                <TableHead>Satuan</TableHead>
                                <TableHead className="text-right">Harga</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProducts.map((p) => (
                                <TableRow key={p.id} onClick={() => setSelectedProduct(p)} onDoubleClick={handleProductSelectAndClose} className={`cursor-pointer ${selectedProduct?.id === p.id ? 'bg-accent/20' : 'hover:bg-muted'}`}>
                                    <TableCell className="font-medium">{p.name}</TableCell>
                                    <TableCell className="text-right">{p.stock.main}</TableCell> {/* Assuming main branch for now */}
                                    <TableCell>{p.unit}</TableCell>
                                    <TableCell className="text-right">Rp{p.price.toLocaleString('id-ID')}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {filteredProducts.length === 0 && (
                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                            Produk tidak ditemukan
                        </div>
                    )}
                </ScrollArea>
            </div>
            <DialogFooter className="mt-2">
                <Button variant="outline" onClick={() => setIsSearchDialogOpen(false)}>Batal</Button>
                <Button onClick={handleProductSelectAndClose} disabled={!selectedProduct}>Tambah ke Transaksi</Button>
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
        cashierName={currentCashier}
        toast={toast}
      />

       <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        subTotal={total}
        onCompleteTransaction={handleCompleteTransaction}
      />

      <PowerOffDialog
        open={isPowerOffDialogOpen}
        onOpenChange={setIsPowerOffDialogOpen}
        onConfirm={confirmPowerOff}
      />

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
      const newDiscPercent = (discountAmount / price) * 100;
      setDiscountPercent(parseFloat(newDiscPercent.toFixed(2)));
    } else {
      setDiscountPercent(0);
    }
  }, [discountAmount, price]);
  
  const handleDiscountPercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value) || 0;
    setDiscountPercent(percent);
    setDiscountAmount(parseFloat(((price * percent) / 100).toFixed(2)));
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
  }, [isOpen, isAuthDialogOpen, onClose, handleSubmit]);
  
  
  const handleUnlockPrice = () => {
    if (currentUserRole === 'staff') {
      setIsAuthDialogOpen(true);
    } else {
      setIsPriceLocked(false);
    }
  };

  const handleAuthorization = async (pin: string) => {
    try {
      const response = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setIsPriceLocked(false);
        setIsAuthDialogOpen(false);
      } else {
        alert(data.error || 'PIN Salah!');
      }
    } catch (error) {
      alert('Gagal memverifikasi PIN.');
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onKeyDown={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Ubah Detail Item</DialogTitle>
           <DialogDescription>{item.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Kuantitas</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Harga Satuan</Label>
                <div className="flex items-center gap-2">
                    <Input type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} disabled={isPriceLocked} />
                    <Button type="button" variant="outline" size="icon" onClick={handleUnlockPrice} disabled={!isPriceLocked}>
                        {isPriceLocked ? <Lock className="w-4 h-4"/> : <Unlock className="w-4 h-4"/>}
                    </Button>
                </div>
              </div>
              <div className="space-y-2">
                 <Label>Diskon (%)</Label>
                 <Input type="number" value={discountPercent} onChange={handleDiscountPercentChange} />
              </div>
              <div className="space-y-2">
                 <Label>Potongan (Rp)</Label>
                 <Input ref={discountAmountRef} type="number" value={discountAmount} onChange={handleDiscountAmountChange} />
              </div>
               <div className="col-span-2 space-y-2">
                 <Label>Harga Total</Label>
                 <Input value={`Rp${calculatedTotal.toLocaleString('id-ID')}`} readOnly className="font-semibold text-lg h-12" />
              </div>
          </div>

          <DialogFooter>
             <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
             <Button type="submit">Simpan Perubahan</Button>
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
    { id: 'cashier', label: 'Buka Menu Kasir' },
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pengaturan Keybind</DialogTitle>
          <DialogDescription>Atur tombol pintas untuk mempercepat pekerjaan Anda.</DialogDescription>
        </DialogHeader>
        <div className="py-4 grid grid-cols-2 gap-x-8 gap-y-4">
          {keybindActions.map(({ id, label }) => (
            <div key={id} className="space-y-2">
              <Label htmlFor={`keybind-${id}`}>{label}</Label>
              <Input
                id={`keybind-${id}`}
                value={editingKeybinds[id]}
                onKeyDown={(e) => handleKeydown(e, id)}
                readOnly
                placeholder="Tekan tombol..."
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSave}>
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
      <DialogContent className="max-w-sm" onKeyDown={(e) => {if(e.key === 'Enter') handleSubmit(e)}}>
        <DialogHeader>
          <DialogTitle>Otorisasi Diperlukan</DialogTitle>
          <DialogDescription>
            Masukkan PIN Manager atau Admin untuk tindakan ini.
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
              className="h-12 text-center text-2xl tracking-[0.5rem]"
              maxLength={6}
              placeholder="------"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit">
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
      <DialogContent className="max-w-sm" onKeyDown={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Menu Kasir</DialogTitle>
          <DialogDescription>Pilih salah satu tindakan di bawah ini.</DialogDescription>
        </DialogHeader>
        <div className="py-4 grid grid-cols-1 gap-3">
            <Button variant="outline" className="h-12 justify-start gap-3 text-base" onClick={() => onOpenCashDrawerDialog('Uang Awal')}><Coins/> Masukkan Uang Awal</Button>
            <Button variant="outline" className="h-12 justify-start gap-3 text-base" onClick={() => onOpenCashDrawerDialog('Uang Keluar')}><LogOut/> Keluarkan Uang</Button>
            <Button variant="outline" className="h-12 justify-start gap-3 text-base" onClick={onOpenShiftReportDialog}><Receipt/> Laporan Akhir Shift</Button>
            <Button variant="outline" className="h-12 justify-start gap-3 text-base" onClick={onLockScreen}><Lock/> Kunci Layar</Button>
        </div>
        <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
                Tutup
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{type}</DialogTitle>
          <DialogDescription>
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
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cash-drawer-description">Keterangan (Opsional)</Label>
              <Textarea
                id="cash-drawer-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Modal awal untuk shift pagi"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit">
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
  cashierName: string;
  toast: ReturnType<typeof useToast>['toast'];
};

const ReportRow = ({ label, value, isTotal = false }: { label: string; value: string | number, isTotal?: boolean }) => (
  <div className="flex justify-between items-center text-sm">
    <p className={isTotal ? "font-semibold" : "text-muted-foreground"}>{label}</p>
    <p className={`font-mono ${isTotal ? "font-semibold" : ""}`}>
        {typeof value === 'number' ? `Rp${value.toLocaleString('id-ID')}` : value}
    </p>
  </div>
);

const ShiftReportDialog = ({ isOpen, onClose, currentUserRole, cashierName, toast }: ShiftReportDialogProps) => {
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
    const sessionId = sessionStorage.getItem('pos-session-id'); //perlu diganti//
    if (!sessionId) return;

    try {
      // Get cash drawer activities
      const storedDrawerData = localStorage.getItem('cashDrawerTransactions'); //perlu diganti//
      const allDrawerTransactions: CashDrawerTransaction[] = storedDrawerData ? JSON.parse(storedDrawerData) : [];
      const sessionDrawerTransactions = allDrawerTransactions.filter(t => t.sessionId === sessionId);
      
      const initialCash = sessionDrawerTransactions
        .filter(t => t.type === 'Uang Awal')
        .reduce((sum, t) => sum + t.amount, 0);

      const cashWithdrawal = sessionDrawerTransactions
        .filter(t => t.type === 'Uang Keluar')
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Get completed transactions
      const storedSalesData = localStorage.getItem('pos-transactions'); //perlu diganti//
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

  const handlePrintShiftReport = async () => {
    const qz = (window as any).qz;
    if (!qz || !qz.websocket.isActive()) {
        toast({
            variant: "destructive",
            title: "QZ Tray Tidak Terhubung",
            description: "Tidak dapat mencetak laporan. Pastikan QZ Tray berjalan."
        });
        return;
    }

    const printerName = "POS-58"; // TODO: Make this configurable
    let dataToPrint = [];

    const center = '\x1B\x61\x31';
    const left = '\x1B\x61\x30';
    const reset = '\x1B\x40';
    const bold = '\x1B\x45\x01';
    const boldOff = '\x1B\x45\x00';
    const line = '--------------------------------\n';
    
    const formatRow = (label: string, value: number) => {
        return `${label.padEnd(15)}: ${value.toLocaleString('id-ID').padStart(15)}\n`;
    }

    dataToPrint.push(reset);
    dataToPrint.push(center);
    dataToPrint.push(bold);
    dataToPrint.push('LAPORAN KASIR\n');
    dataToPrint.push(boldOff);
    dataToPrint.push(line);
    dataToPrint.push(left);
    dataToPrint.push(`Kasir: ${cashierName}\n`);
    dataToPrint.push(`Waktu: ${new Date().toLocaleString('id-ID')}\n`);
    dataToPrint.push(line);

    dataToPrint.push('>> Total Belanjaan\n');
    dataToPrint.push(formatRow('Total', reportData.totalSales));
    dataToPrint.push('\n');
    
    dataToPrint.push('>> Rincian Pembayaran\n');
    dataToPrint.push(formatRow('Tunai', reportData.cashPayment));
    dataToPrint.push(formatRow('Kartu Debit', reportData.debitCard));
    dataToPrint.push(formatRow('Kartu Kredit', reportData.creditCard));
    dataToPrint.push(formatRow('QRIS', reportData.qris));
    dataToPrint.push('\n');

    dataToPrint.push('>> Uang Tunai dalam Laci\n');
    dataToPrint.push(formatRow('Uang Awal', reportData.initialCash));
    dataToPrint.push(formatRow('Pembayaran Tunai', reportData.cashPayment));
    dataToPrint.push(formatRow('Tarik Uang', reportData.cashWithdrawal));
    dataToPrint.push(line);
    dataToPrint.push(bold);
    dataToPrint.push(formatRow('Total', totalInDrawer));
    dataToPrint.push(boldOff);
    dataToPrint.push('\n\n\n');

    // Cut paper command
    dataToPrint.push('\x1D\x56\x42\x00'); 
    
    const config = qz.configs.create(printerName);
      
    try {
        await qz.print(config, dataToPrint); //perlu diganti//
        toast({
            title: "Laporan Terkirim",
            description: "Laporan kasir sedang dicetak."
        });
    } catch (e) {
        console.error("QZ Print Error:", e);
         toast({
            variant: "destructive",
            title: "Gagal Mencetak Laporan",
            description: e instanceof Error ? e.message : "Terjadi kesalahan dengan QZ Tray."
        });
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
       if (event.key.toLowerCase() === 'p' && !event.ctrlKey && !event.metaKey) { // Keybind for Print (Cetak)
        event.preventDefault();
        handlePrintShiftReport();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrintShiftReport]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent onKeyDown={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Laporan Akhir Shift</DialogTitle>
          <DialogDescription>
            Rekapitulasi penjualan dan kas untuk sesi ini oleh {cashierName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Total Penjualan</h3>
            <ReportRow label="Total" value={reportData.totalSales} isTotal/>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Rincian Pembayaran</h3>
            <ReportRow label="Tunai" value={reportData.cashPayment} />
            <ReportRow label="Kartu Debit" value={reportData.debitCard} />
            <ReportRow label="Kartu Kredit" value={reportData.creditCard} />
            <ReportRow label="QRIS" value={reportData.qris} />
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Uang Tunai dalam Laci</h3>
            <ReportRow label="(+) Uang Awal" value={reportData.initialCash} />
            <ReportRow label="(+) Pembayaran Tunai" value={reportData.cashPayment} />
            <ReportRow label="(-) Tarik Uang" value={-reportData.cashWithdrawal} />
            <ReportRow label="Total" value={totalInDrawer} isTotal/>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={handlePrintShiftReport}>
            <Printer className="mr-2 h-4 w-4" /> Cetak Laporan (P)
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
    const accessPin = localStorage.getItem('pos-access-pin') || '1234'; //berisi tentang auth//
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
            <Button type="submit" className="w-full mt-4 h-12 text-lg">
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
  subTotal: number;
  onCompleteTransaction: (
    paymentMethod: PaymentMethod,
    change: number,
    amountPaid: number,
    finalTotal: number,
    discountAmount: number
  ) => void;
};

const PaymentDialog = ({ isOpen, onClose, subTotal, onCompleteTransaction }: PaymentDialogProps) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai');
  const [amountPaid, setAmountPaid] = useState('');
  const [change, setChange] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalTotal, setFinalTotal] = useState(subTotal);

  const amountInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const quickCashOptions = [50000, 100000, 150000, 200000];

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('Tunai');
      setDiscountPercent(0);
      setDiscountAmount(0);
      setFinalTotal(subTotal);
      setAmountPaid(String(subTotal));
      setChange(0);
      setTimeout(() => {
        if (paymentMethod === 'Tunai') {
          amountInputRef.current?.focus();
          amountInputRef.current?.select();
        }
      }, 100);
    }
  }, [isOpen, subTotal]);

  // Update final total when discount changes
  useEffect(() => {
    const newFinalTotal = subTotal - discountAmount;
    setFinalTotal(newFinalTotal > 0 ? newFinalTotal : 0);
  }, [subTotal, discountAmount]);

  // Update change when amount paid or final total changes (for cash)
  useEffect(() => {
    if (paymentMethod === 'Tunai') {
      const paid = parseFloat(amountPaid) || 0;
      const newChange = paid - finalTotal;
      setChange(newChange < 0 ? 0 : newChange);
    } else {
      setAmountPaid(String(finalTotal));
      setChange(0);
    }
  }, [amountPaid, finalTotal, paymentMethod]);
  
  // Focus amount input when switching to cash
  useEffect(() => {
    if(isOpen && paymentMethod === 'Tunai') {
        amountInputRef.current?.focus();
        amountInputRef.current?.select();
    }
  }, [paymentMethod, isOpen]);

  const handleDiscountPercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value) || 0;
    setDiscountPercent(percent);
    setDiscountAmount(parseFloat(((subTotal * percent) / 100).toFixed(2)));
  };

  const handleDiscountAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(e.target.value) || 0;
    setDiscountAmount(amount);
    if (subTotal > 0) {
      setDiscountPercent(parseFloat(((amount / subTotal) * 100).toFixed(2)));
    } else {
      setDiscountPercent(0);
    }
  };

  const handleFinishTransaction = () => {
    const paidAmount = parseFloat(amountPaid) || 0;
    if (paymentMethod === 'Tunai' && paidAmount < finalTotal) {
        toast({
            variant: "destructive",
            title: "Pembayaran Kurang",
            description: "Jumlah yang dibayarkan kurang dari total belanja."
        });
        return;
    }
    const finalChange = paymentMethod === 'Tunai' ? change : 0;
    onCompleteTransaction(paymentMethod, finalChange, paidAmount, finalTotal, discountAmount);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl" onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleFinishTransaction();
        }
      }}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Pembayaran</DialogTitle>
           <DialogDescription>Selesaikan transaksi dengan memilih metode pembayaran dan menambahkan diskon jika perlu.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-8 py-4">
          
          <div className="space-y-4">
             <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              className="grid grid-cols-2 gap-4"
            >
                <Label htmlFor="pay-tunai" className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer hover:bg-muted ${paymentMethod === 'Tunai' ? 'border-primary ring-2 ring-primary' : ''}`}>
                    <RadioGroupItem value="Tunai" id="pay-tunai" className="sr-only"/>
                    <Coins className="w-8 h-8 mb-2" />
                    <span className="font-semibold">Tunai</span>
                </Label>
                <Label htmlFor="pay-debit" className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer hover:bg-muted ${paymentMethod === 'Kartu Debit' ? 'border-primary ring-2 ring-primary' : ''}`}>
                    <RadioGroupItem value="Kartu Debit" id="pay-debit" className="sr-only" />
                    <HardDrive className="w-8 h-8 mb-2" />
                    <span className="font-semibold">Kartu Debit</span>
                </Label>
                <Label htmlFor="pay-kredit" className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer hover:bg-muted ${paymentMethod === 'Kartu Kredit' ? 'border-primary ring-2 ring-primary' : ''}`}>
                    <RadioGroupItem value="Kartu Kredit" id="pay-kredit" className="sr-only" />
                    <HardDrive className="w-8 h-8 mb-2" />
                    <span className="font-semibold">Kartu Kredit</span>
                </Label>
                <Label htmlFor="pay-qris" className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer hover:bg-muted ${paymentMethod === 'QRIS' ? 'border-primary ring-2 ring-primary' : ''}`}>
                    <RadioGroupItem value="QRIS" id="pay-qris" className="sr-only"/>
                    <QrCode className="w-8 h-8 mb-2" />
                    <span className="font-semibold">QRIS</span>
                </Label>
            </RadioGroup>

            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium">Diskon Akhir Transaksi</h3>
              <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                      <Label htmlFor="discount-percent">Diskon (%)</Label>
                      <Input id="discount-percent" type="number" value={discountPercent} onChange={handleDiscountPercentChange} />
                  </div>
                  <div className="flex-1 space-y-1">
                      <Label htmlFor="discount-amount">Potongan (Rp)</Label>
                      <Input id="discount-amount" type="number" value={discountAmount} onChange={handleDiscountAmountChange} />
                  </div>
              </div>
            </div>
            
            {paymentMethod === 'Tunai' && (
                <div className="space-y-2">
                    <Label>Uang Cepat</Label>
                    <div className="flex gap-2">
                        {quickCashOptions.map(val => (
                            <Button key={val} variant="outline" onClick={() => setAmountPaid(String(val))}>
                                {val.toLocaleString('id-ID')}
                            </Button>
                        ))}
                    </div>
                </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm">Subtotal</Label>
                <div className="text-2xl font-semibold tracking-tight line-through">
                    Rp{subTotal.toLocaleString('id-ID')}
                </div>
            </div>
            <div className="p-4 border rounded-lg">
              <Label className="text-sm text-muted-foreground">Total Belanja (Setelah Diskon)</Label>
              <div className="text-4xl font-bold tracking-tight">
                Rp{finalTotal.toLocaleString('id-ID')}
              </div>
            </div>

            <div className={paymentMethod !== 'Tunai' ? "opacity-50" : ""}>
                <Label htmlFor="amount-paid">Jumlah Bayar</Label>
                <Input
                    ref={amountInputRef}
                    id="amount-paid"
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    disabled={paymentMethod !== 'Tunai'}
                    className="h-14 text-2xl font-mono"
                    placeholder="0"
                />
            </div>

             <div className={`p-4 border rounded-lg ${paymentMethod !== 'Tunai' ? "opacity-50" : ""}`}>
                <Label className="text-sm text-muted-foreground">Kembali</Label>
                <div className="text-4xl font-bold tracking-tight text-primary">
                    Rp{change > 0 ? change.toLocaleString('id-ID') : '0'}
                </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-32 h-12">Batal</Button>
          <Button onClick={handleFinishTransaction} className="w-auto h-12 px-8 text-base bg-accent hover:bg-accent/90">
            <Printer className="mr-2 h-5 w-5"/> Selesaikan & Cetak (Enter)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

    