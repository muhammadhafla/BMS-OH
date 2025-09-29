
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calculator, Send, Calendar as CalendarIcon, Loader2, Landmark, Wallet, PlusCircle } from 'lucide-react';
import { DateRange } from "react-day-picker"
import { addDays, format, endOfDay, startOfDay } from "date-fns"
import { id as indonesiaLocale } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';
import { getAllUsersWithSalary } from '@/lib/services/user';
import { getAttendanceForPeriod } from '@/lib/services/attendance';
import type { User, AttendanceEntry, PayrollEntry, SalaryType } from '@/lib/types';


const getStatus = (netSalary: number, paidAmount: number): PayrollEntry['status'] => {
    if (paidAmount <= 0) return 'Belum Dibayar';
    if (paidAmount >= netSalary) return 'Lunas';
    return 'Dibayar Sebagian';
};

const getStatusVariant = (status: PayrollEntry['status']) => {
    switch (status) {
        case 'Lunas': return 'default';
        case 'Dibayar Sebagian': return 'secondary';
        case 'Belum Dibayar': return 'outline';
    }
};

const PaymentDialog = ({ 
    isOpen, 
    onClose, 
    entry, 
    onConfirm 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    entry: PayrollEntry | null; 
    onConfirm: (employeeId: string, amount: number, method: PayrollEntry['paymentMethod'], notes: string) => void;
}) => {
    const remainingSalary = entry ? entry.netSalary - entry.paidAmount : 0;
    const [amount, setAmount] = useState(remainingSalary);
    const [method, setMethod] = useState<PayrollEntry['paymentMethod']>('Transfer Bank');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (entry) {
            const newRemaining = entry.netSalary - entry.paidAmount;
            setAmount(newRemaining);
            setMethod('Transfer Bank');
            setNotes('');
        }
    }, [entry]);

    if (!entry) return null;

    const handleSubmit = () => {
        onConfirm(entry.employeeId, amount, method, notes);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Proses Pembayaran Gaji</DialogTitle>
                    <DialogDescription>
                        Konfirmasi pembayaran untuk <span className="font-bold">{entry.employeeName}</span>.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <Card className="p-4 bg-muted/50">
                        <div className="flex justify-between text-sm">
                            <span>Gaji Bersih</span>
                            <span>Rp{entry.netSalary.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-sm text-destructive">
                            <span>(-) Sudah Dibayar</span>
                            <span>-Rp{entry.paidAmount.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                            <span>Sisa Gaji</span>
                            <span>Rp{(entry.netSalary - entry.paidAmount).toLocaleString('id-ID')}</span>
                        </div>
                    </Card>
                    <div className="space-y-2">
                        <Label htmlFor="payment-amount">Jumlah Pembayaran</Label>
                        <Input id="payment-amount" type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
                        <p className="text-xs text-muted-foreground">Ubah jumlah untuk pembayaran sebagian.</p>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="payment-method">Metode Pembayaran</Label>
                        <Select onValueChange={(v) => setMethod(v as PayrollEntry['paymentMethod'])} defaultValue={method}>
                            <SelectTrigger id="payment-method">
                                <SelectValue placeholder="Pilih metode..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Transfer Bank"><Landmark className="inline-block mr-2 h-4 w-4"/>Transfer Bank</SelectItem>
                                <SelectItem value="Tunai"><Wallet className="inline-block mr-2 h-4 w-4"/>Tunai</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="payment-notes">Catatan (Opsional)</Label>
                        <Textarea id="payment-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Contoh: Pembayaran gaji Oktober 2023"/>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button onClick={handleSubmit} disabled={amount <= 0 || amount > remainingSalary} className="bg-accent hover:bg-accent/90">
                        <Send className="mr-2 h-4 w-4"/> Konfirmasi Pembayaran
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const AdvancePaymentDialog = ({
    isOpen,
    onClose,
    employees,
    onConfirm
}: {
    isOpen: boolean;
    onClose: () => void;
    employees: User[];
    onConfirm: (employeeId: string, amount: number, notes: string) => void;
}) => {
    const [employeeId, setEmployeeId] = useState<string>('');
    const [amount, setAmount] = useState(0);
    const [notes, setNotes] = useState('');
    const { toast } = useToast();

    const handleSubmit = () => {
        if (!employeeId || amount <= 0) {
            toast({
                variant: 'destructive',
                title: 'Input Tidak Lengkap',
                description: 'Pilih karyawan dan masukkan jumlah yang valid.'
            });
            return;
        }
        onConfirm(employeeId, amount, notes);
        setEmployeeId('');
        setAmount(0);
        setNotes('');
        onClose();
    };
    
    return (
         <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Catat Uang Muka (Advance)</DialogTitle>
                    <DialogDescription>
                        Catat pembayaran di muka untuk karyawan. Ini akan menjadi potongan pada siklus gaji berikutnya.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="space-y-2">
                        <Label htmlFor="advance-employee">Karyawan</Label>
                        <Select onValueChange={setEmployeeId} value={employeeId}>
                            <SelectTrigger id="advance-employee">
                                <SelectValue placeholder="Pilih karyawan..." />
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map(e => <SelectItem key={e.id} value={e.id!}>{e.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="advance-amount">Jumlah Uang Muka</Label>
                        <Input id="advance-amount" type="number" value={amount <= 0 ? '' : amount} onChange={e => setAmount(Number(e.target.value))} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="advance-notes">Catatan</Label>
                        <Textarea id="advance-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Contoh: Uang muka untuk keperluan darurat"/>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90">
                       Simpan Catatan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function PayrollPage() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: addDays(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 0),
    });
    const [payrollData, setPayrollData] = useState<PayrollEntry[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const users = await getAllUsersWithSalary();
                setAllUsers(users);
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Gagal Memuat Karyawan',
                    description: error instanceof Error ? error.message : 'Terjadi kesalahan server.'
                });
            }
        };
        fetchUsers();
    }, [toast]);


    const handleCalculate = async () => {
        if (!date?.from || !date?.to) {
            toast({
                variant: 'destructive',
                title: 'Periode Tidak Valid',
                description: 'Harap pilih rentang tanggal yang valid untuk perhitungan gaji.'
            });
            return;
        }

        setIsCalculating(true);
        const toastId = toast({
            title: 'Menghitung Gaji...',
            description: `Periode: ${format(date.from, "d LLL y")} - ${format(date.to, "d LLL y")}`
        });

        try {
            // Fetch necessary data
            const users = allUsers;
            if (users.length === 0) throw new Error("Tidak ada data karyawan ditemukan.");

            const attendanceEntries = await getAttendanceForPeriod(startOfDay(date.from), endOfDay(date.to));
            
            const processedData = users.map((user): PayrollEntry => {
                let baseSalary = 0;
                let allowances = 0; // Placeholder
                let deductions = 0; // Placeholder for advances

                if (user.salaryType === 'Bulanan') {
                    baseSalary = user.baseSalary;
                } else if (user.salaryType === 'Per Jam') {
                    const userAttendance = attendanceEntries.filter(
                        a => a.employeeId === user.id && a.clockIn && a.clockOut
                    );
                    
                    const totalHours = userAttendance.reduce((total, entry) => {
                        const clockInTime = (entry.clockIn as any).toDate();
                        const clockOutTime = (entry.clockOut as any).toDate();
                        const hours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
                        return total + hours;
                    }, 0);
                    
                    baseSalary = totalHours * user.baseSalary;
                }
                
                const netSalary = baseSalary + allowances - deductions;

                return {
                    employeeId: user.id!,
                    employeeName: user.name,
                    baseSalary,
                    allowances,
                    deductions,
                    netSalary,
                    paidAmount: 0,
                    status: getStatus(netSalary, 0),
                    paymentMethod: 'Belum Dibayar',
                };
            });

            setPayrollData(processedData);
            toast({ id: toastId.id, title: 'Perhitungan Selesai', description: 'Data penggajian telah berhasil dibuat.' });
            
        } catch (error) {
             toast({
                id: toastId.id,
                variant: 'destructive',
                title: 'Perhitungan Gagal',
                description: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil data.'
            });
        } finally {
            setIsCalculating(false);
        }
    };
    
    const handlePayClick = (entry: PayrollEntry) => {
        setSelectedEntry(entry);
        setIsPaymentDialogOpen(true);
    };
    
    const handleConfirmPayment = (employeeId: string, amount: number, method: PayrollEntry['paymentMethod'], notes: string) => {
        setPayrollData(prevData => prevData.map(entry => {
            if (entry.employeeId === employeeId) {
                const newPaidAmount = entry.paidAmount + amount;
                return {
                    ...entry,
                    paidAmount: newPaidAmount,
                    status: getStatus(entry.netSalary, newPaidAmount)
                };
            }
            return entry;
        }));
        toast({
            title: "Pembayaran Berhasil",
            description: `Pembayaran sebesar Rp${amount.toLocaleString('id-ID')} untuk ${selectedEntry?.employeeName} telah dicatat.`
        });
    };
    
    const handlePayAll = () => {
         payrollData.forEach(entry => {
            if (entry.status !== 'Lunas') {
                 handleConfirmPayment(entry.employeeId, entry.netSalary - entry.paidAmount, 'Transfer Bank', 'Pembayaran massal');
            }
        });
        toast({
            title: 'Pembayaran Massal Selesai',
            description: 'Semua gaji yang belum lunas telah diproses.'
        });
    };

    const handleConfirmAdvance = (employeeId: string, amount: number, notes: string) => {
        // In a real app, you would save this to a database.
        // For this demo, we'll just show a toast and maybe log it.
        console.log({
            message: "Advance payment recorded (simulation)",
            employeeId,
            amount,
            notes,
            date: new Date().toISOString()
        });
        toast({
            title: "Uang Muka Dicatat",
            description: `Uang muka sebesar Rp${amount.toLocaleString('id-ID')} untuk karyawan terpilih telah dicatat.`
        });
        // This would then be pulled as a deduction in the next handleCalculate call.
    };

    const totalUnpaidSalary = useMemo(() => {
        return payrollData.reduce((sum, entry) => {
             if (entry.status !== 'Lunas') {
                return sum + (entry.netSalary - entry.paidAmount);
             }
             return sum;
        }, 0);
    }, [payrollData]);

  return (
    <>
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Penggajian
        </h1>
        <p className="text-muted-foreground">
          Hitung, kelola, dan proses gaji karyawan berdasarkan data absensi.
        </p>
      </header>
       <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Proses Penggajian</CardTitle>
            <CardDescription>
              Pilih periode penggajian yang fleksibel (misalnya, mingguan, bulanan) dan mulai perhitungan gaji otomatis.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-[300px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "d LLL, y", { locale: indonesiaLocale })} -{" "}
                          {format(date.to, "d LLL, y", { locale: indonesiaLocale })}
                        </>
                      ) : (
                        format(date.from, "d LLL, y", { locale: indonesiaLocale })
                      )
                    ) : (
                      <span>Pilih periode</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                    locale={indonesiaLocale}
                  />
                </PopoverContent>
              </Popover>
               <Button variant="outline" onClick={() => setIsAdvanceDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Catat Uang Muka
                </Button>
              <Button onClick={handleCalculate} disabled={isCalculating} className="bg-accent hover:bg-accent/90">
                {isCalculating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Calculator className="mr-2 h-4 w-4" />
                )}
                {isCalculating ? 'Menghitung...' : 'Hitung Gaji'}
              </Button>
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Hasil Perhitungan Gaji</CardTitle>
          <CardDescription>
            Tinjau hasil perhitungan di bawah ini sebelum memproses pembayaran.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nama Karyawan</TableHead>
                        <TableHead className="text-right">Gaji Pokok</TableHead>
                        <TableHead className="text-right">Tunjangan</TableHead>
                        <TableHead className="text-right">Potongan</TableHead>
                        <TableHead className="text-right font-bold">Gaji Bersih</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Tindakan</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isCalculating ? (
                         <TableRow>
                            <TableCell colSpan={7} className="h-48 text-center">
                                <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                   <Loader2 className="h-5 w-5 animate-spin" />
                                   <span>Mengkalkulasi data penggajian...</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : payrollData.length > 0 ? (
                        payrollData.map(entry => (
                            <TableRow key={entry.employeeId}>
                                <TableCell className="font-medium">{entry.employeeName}</TableCell>
                                <TableCell className="text-right">Rp{entry.baseSalary.toLocaleString('id-ID')}</TableCell>
                                <TableCell className="text-right">Rp{entry.allowances.toLocaleString('id-ID')}</TableCell>
                                <TableCell className="text-right text-destructive">-Rp{entry.deductions.toLocaleString('id-ID')}</TableCell>
                                <TableCell className="text-right font-bold">Rp{entry.netSalary.toLocaleString('id-ID')}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={getStatusVariant(entry.status)} className={entry.status === 'Lunas' ? 'bg-green-500 hover:bg-green-600' : ''}>
                                        {entry.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => handlePayClick(entry)} disabled={entry.status === 'Lunas'}>
                                        Bayar
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                                Belum ada data untuk ditampilkan. Pilih periode dan klik "Hitung Gaji".
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
        {payrollData.length > 0 && (
            <CardFooter className="pt-4 flex flex-row items-center justify-between border-t mt-4">
                <div className="text-lg font-bold">
                    Total Gaji Belum Dibayar: <span className="text-primary">Rp{totalUnpaidSalary.toLocaleString('id-ID')}</span>
                </div>
                <Button onClick={handlePayAll} disabled={totalUnpaidSalary <= 0} className="bg-accent hover:bg-accent/90">
                    <Send className="mr-2 h-4 w-4"/>
                    Bayar Semua (Belum Dibayar)
                </Button>
            </CardFooter>
        )}
      </Card>
    </div>

    <PaymentDialog 
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        entry={selectedEntry}
        onConfirm={handleConfirmPayment}
    />
    <AdvancePaymentDialog 
        isOpen={isAdvanceDialogOpen}
        onClose={() => setIsAdvanceDialogOpen(false)}
        employees={allUsers}
        onConfirm={handleConfirmAdvance}
    />
    </>
  );
}
