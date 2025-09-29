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
import { Camera, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const attendanceHistory = [
  {
    date: '2023-10-26',
    clockIn: '08:59',
    clockOut: '17:03',
    status: 'Hadir',
    location: 'Kantor Utama',
  },
  {
    date: '2023-10-25',
    clockIn: '09:05',
    clockOut: '17:00',
    status: 'Hadir',
    location: 'Kantor Utama',
  },
  {
    date: '2023-10-24',
    clockIn: 'N/A',
    clockOut: 'N/A',
    status: 'Absen',
    location: 'N/A',
  },
  {
    date: '2023-10-23',
    clockIn: '09:00',
    clockOut: '15:30',
    status: 'Setengah Hari',
    location: 'Kantor Utama',
  },
];

export default function AttendancePage() {
  const isClockedIn = false; // Mock state

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Absensi
        </h1>
        <p className="text-muted-foreground">
          Catat jam kerja dan lokasi Anda.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Mesin Waktu</CardTitle>
              <CardDescription>
                {isClockedIn ? 'Lakukan clock out untuk mengakhiri shift.' : 'Lakukan clock in untuk memulai shift.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button size="lg" className="w-full h-24 text-2xl bg-accent hover:bg-accent/90">
                {isClockedIn ? 'Clock Out' : 'Clock In'}
              </Button>
              <p className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Camera className="size-4" />
                <MapPin className="size-4" />
                <span>Selfie & GPS akan direkam.</span>
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Absensi</CardTitle>
              <CardDescription>Log absensi Anda baru-baru ini.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Lokasi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceHistory.map((entry) => (
                    <TableRow key={entry.date}>
                      <TableCell className="font-medium">{entry.date}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.status === 'Hadir'
                              ? 'default'
                              : entry.status === 'Absen'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className={entry.status === 'Hadir' ? 'bg-green-500 hover:bg-green-600' : ''}
                        >
                           {entry.status === 'Hadir' && <CheckCircle className="mr-1 h-3 w-3" />}
                           {entry.status === 'Absen' && <XCircle className="mr-1 h-3 w-3" />}
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{entry.clockIn}</TableCell>
                      <TableCell>{entry.clockOut}</TableCell>
                      <TableCell>{entry.location}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
