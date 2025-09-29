
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
import { Camera, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

const initialAttendanceHistory = [
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

type AttendanceEntry = {
  date: string;
  clockIn: string;
  clockOut: string;
  status: string;
  location: string;
};

export default function AttendancePage() {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceEntry[]>(initialAttendanceHistory);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Akses Kamera Ditolak',
          description: 'Harap izinkan akses kamera di pengaturan browser Anda untuk menggunakan fitur ini.',
        });
      }
    };

    getCameraPermission();
  }, [toast]);

  const handleClockInOut = () => {
    if (!hasCameraPermission) {
      toast({
        variant: 'destructive',
        title: 'Aksi Gagal',
        description: 'Tidak dapat melakukan absensi tanpa izin akses kamera.',
      });
      return;
    }

    const now = new Date();
    const date = now.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
    const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (!isClockedIn) {
      // Clocking In
      const newEntry: AttendanceEntry = {
        date,
        clockIn: time,
        clockOut: 'N/A',
        status: 'Hadir',
        location: 'Kantor Utama', // Placeholder for GPS location
      };
      setAttendanceHistory([newEntry, ...attendanceHistory]);
      setIsClockedIn(true);
      toast({
        title: 'Clock In Berhasil',
        description: `Anda berhasil masuk pada pukul ${time}.`,
      });
    } else {
      // Clocking Out
      setAttendanceHistory(prevHistory => {
        const newHistory = [...prevHistory];
        const currentEntry = newHistory[0];
        if (currentEntry && currentEntry.status === 'Hadir' && currentEntry.clockOut === 'N/A') {
          currentEntry.clockOut = time;
        }
        return newHistory;
      });
      setIsClockedIn(false);
      toast({
        title: 'Clock Out Berhasil',
        description: `Anda berhasil keluar pada pukul ${time}.`,
      });
    }
  };


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
        <div className="md:col-span-1 space-y-6">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Mesin Waktu</CardTitle>
              <CardDescription>
                {isClockedIn ? 'Lakukan clock out untuk mengakhiri shift.' : 'Lakukan clock in untuk memulai shift.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button size="lg" className="w-full h-24 text-2xl bg-accent hover:bg-accent/90" onClick={handleClockInOut} disabled={hasCameraPermission === null}>
                {isClockedIn ? 'Clock Out' : 'Clock In'}
              </Button>
              <p className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Camera className="size-4" />
                <MapPin className="size-4" />
                <span>Selfie & GPS akan direkam.</span>
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle>Pratinjau Kamera</CardTitle>
            </CardHeader>
             <CardContent>
                <div className="relative aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    {hasCameraPermission === false && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                            <Camera className="w-10 h-10 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Akses kamera diperlukan</p>
                         </div>
                    )}
                </div>
                 {hasCameraPermission === false && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTitle>Akses Kamera Diperlukan</AlertTitle>
                      <AlertDescription>
                        Harap izinkan akses kamera untuk menggunakan fitur absensi.
                      </AlertDescription>
                    </Alert>
                )}
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
                  {attendanceHistory.map((entry, index) => (
                    <TableRow key={index}>
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
