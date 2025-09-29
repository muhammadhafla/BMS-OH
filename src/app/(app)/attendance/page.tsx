
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Camera, MapPin, CheckCircle, XCircle, Calendar as CalendarIcon, Users, User, Search, Video, VideoOff, RefreshCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { recordAttendance, getAttendanceHistoryForUser } from '@/lib/services/attendance';
import type { AttendanceEntry } from '@/lib/types';


type UserRole = 'staff' | 'manager' | 'admin';

const initialAttendanceHistory = [
  {
    employeeId: 'EMP001',
    employeeName: 'Andi Budiman',
    date: '2023-10-26',
    clockIn: '08:59',
    clockOut: '17:03',
    status: 'Hadir',
    location: 'Kantor Utama',
  },
  {
    employeeId: 'EMP002',
    employeeName: 'Siti Aminah',
    date: '2023-10-26',
    clockIn: '09:05',
    clockOut: '17:00',
    status: 'Hadir',
    location: 'Kantor Utama',
  },
   {
    employeeId: 'EMP003',
    employeeName: 'Budi Santoso',
    date: '2023-10-26',
    clockIn: '08:45',
    clockOut: '17:05',
    status: 'Hadir',
    location: 'Remote',
  },
  {
    employeeId: 'EMP004',
    employeeName: 'Dewi Lestari',
    date: '2023-10-26',
    clockIn: 'N/A',
    clockOut: 'N/A',
    status: 'Absen',
    location: 'N/A',
  },
];


// =================================================================
// Komponen untuk Tab Monitoring Tim (Admin/Manager)
// =================================================================
const TeamMonitoringTab = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [allAttendance, setAllAttendance] = useState<AttendanceEntry[]>(initialAttendanceHistory);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAttendance = useMemo(() => {
    const formattedDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
    return allAttendance.filter(entry =>
      (!formattedDate || entry.date === formattedDate) &&
      (!searchQuery || entry.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [selectedDate, allAttendance, searchQuery]);
  
  const summaryStats = useMemo(() => {
    const totalHadir = filteredAttendance.filter(e => e.status === 'Hadir').length;
    const totalAbsen = filteredAttendance.filter(e => e.status === 'Absen').length;
    const totalTerlambat = filteredAttendance.filter(e => e.status === 'Hadir' && e.clockIn > '09:00').length;
    return { totalHadir, totalAbsen, totalTerlambat };
  }, [filteredAttendance]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Hari Ini</CardTitle>
          <CardDescription>Statistik absensi untuk tanggal yang dipilih.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
           <Card className="text-center p-4">
                <p className="text-sm font-medium text-muted-foreground">Hadir</p>
                <p className="text-3xl font-bold">{summaryStats.totalHadir}</p>
           </Card>
           <Card className="text-center p-4">
                <p className="text-sm font-medium text-muted-foreground">Terlambat</p>
                <p className="text-3xl font-bold text-red-500">{summaryStats.totalTerlambat}</p>
           </Card>
           <Card className="text-center p-4">
                <p className="text-sm font-medium text-muted-foreground">Absen</p>
                <p className="text-3xl font-bold">{summaryStats.totalAbsen}</p>
           </Card>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Log Absensi Tim</CardTitle>
              <CardDescription>Lihat catatan absensi untuk seluruh karyawan.</CardDescription>
            </div>
             <div className="flex items-center gap-4">
               <div className="relative w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input 
                        placeholder="Cari nama karyawan..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
               </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[280px] justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: indonesiaLocale }) : <span>Pilih tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
             </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Karyawan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Lokasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendance.length > 0 ? filteredAttendance.map((entry, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{entry.employeeName}</TableCell>
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
              )) : (
                 <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Tidak ada data absensi untuk tanggal ini.
                    </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// =================================================================
// Komponen Modal Kamera
// =================================================================
const CameraClockInModal = ({
  isOpen,
  onClose,
  onConfirm,
  isClockingIn,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (imageData: string) => void;
  isClockingIn: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      // Cleanup when modal is closed
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      setCapturedImage(null);
      return;
    };

    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
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
        onClose();
      }
    };

    getCameraPermission();

  }, [isOpen, onClose, toast]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Add timestamp
    const now = new Date();
    const timestamp = format(now, "dd MMMM yyyy, HH:mm:ss", { locale: indonesiaLocale });
    context.font = 'bold 36px Arial';
    context.fillStyle = 'white';
    context.shadowColor = 'black';
    context.shadowBlur = 7;
    context.fillText(timestamp, 20, canvas.height - 30);
    
    // Get image data URL and set it
    const imageDataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageDataUrl);

    // Stop video stream
    const stream = video.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onConfirm(capturedImage);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ambil Foto untuk {isClockingIn ? 'Clock In' : 'Clock Out'}</DialogTitle>
          <DialogDescription>Posisikan wajah Anda di depan kamera dan ambil gambar.</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-video w-full rounded-md bg-muted flex items-center justify-center">
          {capturedImage ? (
            <Image src={capturedImage} alt="Captured" layout="fill" objectFit="contain" className="rounded-md" />
          ) : (
            <>
              <video ref={videoRef} className="w-full h-full object-cover rounded-md" autoPlay muted playsInline />
              {hasCameraPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <VideoOff className="w-10 h-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Akses kamera diperlukan</p>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          {capturedImage ? (
            <>
              <Button variant="secondary" onClick={() => setCapturedImage(null)}>
                <RefreshCcw className="mr-2"/> Ambil Ulang
              </Button>
              <Button onClick={handleConfirm} className="bg-accent hover:bg-accent/90">
                <CheckCircle className="mr-2"/> Konfirmasi
              </Button>
            </>
          ) : (
            <Button onClick={handleCapture} disabled={hasCameraPermission !== true}>
              <Camera className="mr-2"/> Ambil Gambar
            </Button>
          )}
        </DialogFooter>
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
};


// =================================================================
// Komponen untuk Tab Absensi Pribadi (Staf)
// =================================================================
const MyAttendanceTab = ({ currentUser }: { currentUser: { id: string; name: string; } }) => {
    const [isClockedIn, setIsClockedIn] = useState(false);
    const [attendanceHistory, setAttendanceHistory] = useState<AttendanceEntry[]>([]);
    const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [todaysEntryId, setTodaysEntryId] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
      if (!currentUser.id) return;
      setIsLoading(true);
      const q = query(
        collection(firestore, 'attendance'), //perlu diganti//
        where('employeeId', '==', currentUser.id),
        orderBy('clockIn', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => { //perlu diganti//
        const history: AttendanceEntry[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            employeeId: data.employeeId,
            employeeName: data.employeeName,
            date: format((data.clockIn as Timestamp).toDate(), 'yyyy-MM-dd'),
            clockIn: format((data.clockIn as Timestamp).toDate(), 'HH:mm'),
            clockOut: data.clockOut ? format((data.clockOut as Timestamp).toDate(), 'HH:mm') : 'N/A',
            status: data.status,
            location: data.location,
          }
        });
        setAttendanceHistory(history);
        
        // Check if clocked in today
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const todaysEntry = history.find(entry => entry.date === todayStr && entry.clockOut === 'N/A');
        if (todaysEntry) {
          setIsClockedIn(true);
          setTodaysEntryId(todaysEntry.id!);
        } else {
          setIsClockedIn(false);
          setTodaysEntryId(null);
        }
        setIsLoading(false);
      }, (error) => {
        console.error("Gagal mengambil riwayat absensi: ", error);
        toast({ variant: 'destructive', title: 'Gagal Memuat Riwayat'});
        setIsLoading(false);
      });
      
      return () => unsubscribe();
    }, [currentUser.id, toast]);


    const handleClockInOut = async (imageData: string) => {
        setIsCameraModalOpen(false); // Close modal first
        
        const type = isClockedIn ? 'clock-out' : 'clock-in';
        
        try {
            const result = await recordAttendance({ //perlu diganti//
                type,
                employeeId: currentUser.id,
                employeeName: currentUser.name,
                location: 'Kantor Utama', // Placeholder
                photoDataUri: imageData,
                entryId: todaysEntryId, // Pass ID for clock-out
            });
            
            if (result.success) {
                toast({
                    title: `Clock ${isClockedIn ? 'Out' : 'In'} Berhasil`,
                    description: `Anda berhasil ${isClockedIn ? 'keluar' : 'masuk'} pada pukul ${format(new Date(), 'HH:mm')}.`,
                });
            } else {
                 throw new Error(result.error);
            }
        } catch (error) {
            console.error("Gagal mencatat absensi:", error);
            toast({
                variant: 'destructive',
                title: 'Gagal Mencatat Absensi',
                description: error instanceof Error ? error.message : 'Terjadi kesalahan di server.'
            });
        }
    };
    return (
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
              <Button size="lg" className="w-full h-24 text-2xl bg-accent hover:bg-accent/90" onClick={() => setIsCameraModalOpen(true)}>
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
              <CardTitle>Riwayat Absensi Saya</CardTitle>
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
                  {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            Memuat riwayat...
                        </TableCell>
                     </TableRow>
                  ) : attendanceHistory.length > 0 ? attendanceHistory.map((entry, index) => (
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
                  )) : (
                     <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            Belum ada riwayat absensi.
                        </TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <CameraClockInModal 
            isOpen={isCameraModalOpen}
            onClose={() => setIsCameraModalOpen(false)}
            onConfirm={handleClockInOut}
            isClockingIn={!isClockedIn}
        />
      </div>
    );
};


// =================================================================
// Komponen Halaman Utama
// =================================================================
export default function AttendancePage() {
  const [userRole, setUserRole] = useState<UserRole>('staff');
  
  // Hardcoded current user for demonstration purposes
  const currentUser = { id: 'user_staff_001', name: 'Pengguna Staf' };

  const handleRoleChange = (isManager: boolean) => {
    setUserRole(isManager ? 'manager' : 'staff');
  };

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Absensi
          </h1>
          <p className="text-muted-foreground">
            {userRole === 'staff' ? 'Catat jam kerja dan lokasi Anda.' : 'Monitor absensi dan kinerja tim Anda.'}
          </p>
        </div>
        {/* Toggle ini hanya untuk keperluan demo */}
        <div className="flex items-center space-x-2">
            <Label htmlFor="role-switch">Mode Staf</Label>
            <Switch
                id="role-switch"
                onCheckedChange={handleRoleChange}
                checked={userRole !== 'staff'}
            />
            <Label htmlFor="role-switch">Mode Manajer</Label>
        </div>
      </header>

      <Tabs defaultValue="my-attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-attendance"><User className="mr-2"/>Absensi Saya</TabsTrigger>
          <TabsTrigger value="team-monitoring" disabled={userRole === 'staff'}><Users className="mr-2"/>Monitoring Tim</TabsTrigger>
        </TabsList>
        <TabsContent value="my-attendance" className="mt-6">
            <MyAttendanceTab currentUser={currentUser} />
        </TabsContent>
        <TabsContent value="team-monitoring" className="mt-6">
            {userRole !== 'staff' ? <TeamMonitoringTab /> : (
                <Card className="flex flex-col items-center justify-center p-12">
                    <CardTitle>Akses Dibatasi</CardTitle>
                    <CardDescription className="mt-2">Hanya Manajer dan Admin yang dapat mengakses halaman ini.</CardDescription>
                </Card>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
