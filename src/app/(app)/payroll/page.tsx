
'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Badge } from '@/components/ui/badge';
import { Calculator, Send, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { DateRange } from "react-day-picker"
import { addDays, format } from "date-fns"
import { id as indonesiaLocale } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';


type PayrollStatus = 'Belum Dibayar' | 'Dibayar';

interface PayrollEntry {
  employeeId: string;
  employeeName: string;
  baseSalary: number; // Gaji pokok atau total gaji dari jam kerja
  allowances: number; // Tunjangan
  deductions: number; // Potongan
  netSalary: number; // Gaji bersih
  status: PayrollStatus;
}

const initialPayrollData: PayrollEntry[] = [
  {
    employeeId: '1',
    employeeName: 'Pengguna Admin',
    baseSalary: 10000000,
    allowances: 500000,
    deductions: 250000,
    netSalary: 10250000,
    status: 'Belum Dibayar',
  },
  {
    employeeId: '2',
    employeeName: 'Pengguna Manajer',
    baseSalary: 7500000,
    allowances: 250000,
    deductions: 100000,
    netSalary: 7650000,
    status: 'Belum Dibayar',
  },
  {
    employeeId: '3',
    employeeName: 'Pengguna Staf (Asumsi 160 jam)',
    baseSalary: 50000 * 160, // 50,000/jam * 160 jam
    allowances: 0,
    deductions: 50000,
    netSalary: (50000 * 160) - 50000,
    status: 'Belum Dibayar',
  },
];


export default function PayrollPage() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: addDays(new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() -1),
    });
    const [payrollData, setPayrollData] = useState<PayrollEntry[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);
    const { toast } = useToast();

    const handleCalculate = () => {
        if (!date?.from || !date?.to) {
            toast({
                variant: 'destructive',
                title: 'Periode Tidak Valid',
                description: 'Harap pilih rentang tanggal yang valid untuk perhitungan gaji.'
            });
            return;
        }

        setIsCalculating(true);
        toast({
            title: 'Menghitung Gaji...',
            description: `Periode: ${format(date.from, "d LLL y")} - ${format(date.to, "d LLL y")}`
        });

        // Simulasi proses kalkulasi
        setTimeout(() => {
            setPayrollData(initialPayrollData);
            setIsCalculating(false);
            toast({
                title: 'Perhitungan Selesai',
                description: 'Data penggajian telah berhasil dibuat.'
            });
        }, 1500);
    };
    
    const totalNetSalary = useMemo(() => {
        return payrollData.reduce((sum, entry) => sum + entry.netSalary, 0);
    }, [payrollData]);

  return (
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
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isCalculating ? (
                         <TableRow>
                            <TableCell colSpan={6} className="h-48 text-center">
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
                                    <Badge variant={entry.status === 'Dibayar' ? 'default' : 'secondary'} className={entry.status === 'Dibayar' ? 'bg-green-500' : ''}>
                                        {entry.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                Belum ada data untuk ditampilkan. Pilih periode dan klik "Hitung Gaji".
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
        {payrollData.length > 0 && (
            <CardHeader className="pt-0 flex flex-row items-center justify-between border-t mt-4">
                <div className="text-lg font-bold">
                    Total Gaji Bersih: <span className="text-primary">Rp{totalNetSalary.toLocaleString('id-ID')}</span>
                </div>
                <Button>
                    <Send className="mr-2 h-4 w-4"/>
                    Proses Pembayaran
                </Button>
            </CardHeader>
        )}
      </Card>
    </div>
  );
}
