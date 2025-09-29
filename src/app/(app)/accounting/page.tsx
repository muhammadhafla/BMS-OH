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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CashDrawerTransaction } from '@/app/(app)/pos/page';
import { useState, useEffect } from 'react';

const journalEntries = [
  {
    date: '2023-10-01',
    account: 'Kas',
    debit: 5000.0,
    credit: 0,
    description: 'Investasi modal awal',
  },
  {
    date: '2023-10-01',
    account: 'Ekuitas Pemilik',
    debit: 0,
    credit: 5000.0,
    description: 'Investasi modal awal',
  },
  {
    date: '2023-10-02',
    account: 'Inventaris',
    debit: 1500.0,
    credit: 0,
    description: 'Pembelian barang',
  },
  {
    date: '2023-10-02',
    account: 'Utang Usaha',
    debit: 0,
    credit: 1500.0,
    description: 'Pembelian barang',
  },
  {
    date: '2023-10-05',
    account: 'Piutang Usaha',
    debit: 500.0,
    credit: 0,
    description: 'Penjualan kredit',
  },
  {
    date: '2023-10-05',
    account: 'Pendapatan Penjualan',
    debit: 0,
    credit: 500.0,
    description: 'Penjualan kredit',
  },
];

const financialReports = [
  'Laporan Laba Rugi',
  'Neraca Saldo',
  'Buku Besar',
  'Arus Kas',
  'Perubahan Modal',
];

const CashierReport = () => {
  const [transactions, setTransactions] = useState<CashDrawerTransaction[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('all');

  useEffect(() => {
    // This code runs on the client side, so localStorage is available.
    try {
      const storedData = localStorage.getItem('cashDrawerTransactions');
      if (storedData) {
        const allTransactions: CashDrawerTransaction[] = JSON.parse(storedData);
        setTransactions(allTransactions);
        // Extract unique session IDs
        const uniqueSessions = [...new Set(allTransactions.map(t => t.sessionId))];
        setSessions(uniqueSessions);
      }
    } catch (error) {
      console.error('Gagal memuat transaksi laci kas dari localStorage', error);
    }
  }, []);

  const filteredTransactions = transactions.filter(t => selectedSession === 'all' || t.sessionId === selectedSession);

  const formatTimestamp = (isoString: string) => {
    return new Date(isoString).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Laporan Kasir</CardTitle>
          <CardDescription>
            Riwayat transaksi uang masuk dan keluar dari kasir.
          </CardDescription>
        </div>
        <div className="w-48">
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih Sesi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Sesi</SelectItem>
              {sessions.map(session => (
                <SelectItem key={session} value={session}>{session}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="text-right">Nominal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell>{formatTimestamp(entry.timestamp)}</TableCell>
                  <TableCell>
                    <Badge variant={entry.type === 'Uang Awal' ? 'secondary' : 'destructive'}>
                      {entry.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entry.description || '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    Rp{entry.amount.toLocaleString('id-ID')}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  Tidak ada data laporan kasir.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};


export default function AccountingPage() {
  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Akuntansi
        </h1>
        <p className="text-muted-foreground">
          Lacak keuangan dan hasilkan laporan.
        </p>
      </header>

      <Tabs defaultValue="journal">
        <TabsList className="mb-4">
          <TabsTrigger value="journal">Entri Jurnal</TabsTrigger>
          <TabsTrigger value="reports">Laporan Keuangan</TabsTrigger>
          <TabsTrigger value="cashier-report">Laporan Kasir</TabsTrigger>
        </TabsList>
        <TabsContent value="journal">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Jurnal Umum</CardTitle>
                <CardDescription>
                  Catatan semua transaksi keuangan.
                </CardDescription>
              </div>
              <Button className="bg-accent hover:bg-accent/90">
                <PlusCircle />
                Tambah Entri
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Akun</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Kredit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell className="font-medium">
                        {entry.account}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.description}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.debit > 0 ? `Rp${entry.debit.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.credit > 0 ? `Rp${entry.credit.toFixed(2)}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Laporan Keuangan</CardTitle>
              <CardDescription>
                Hasilkan dan lihat laporan keuangan utama.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {financialReports.map((report) => (
                <Card
                  key={report}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="text-primary" />
                    <span className="font-medium">{report}</span>
                  </div>
                  <Button variant="outline">Lihat</Button>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="cashier-report">
          <CashierReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
