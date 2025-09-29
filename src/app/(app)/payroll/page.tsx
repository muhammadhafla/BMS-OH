
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function PayrollPage() {
  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Penggajian
        </h1>
        <p className="text-muted-foreground">
          Modul ini sedang dalam pengembangan. Fitur untuk menghitung dan mengelola gaji karyawan akan segera tersedia di sini.
        </p>
      </header>
       <Card>
        <CardHeader>
          <CardTitle>Segera Hadir</CardTitle>
          <CardDescription>
            Fitur penggajian otomatis akan memungkinkan Anda untuk:
          </CardDescription>
        </CardHeader>
        <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Menghitung gaji kotor berdasarkan jam kerja dari data absensi.</li>
                <li>Mengelola tunjangan, lembur, dan potongan.</li>
                <li>Menghasilkan slip gaji digital untuk karyawan.</li>
                <li>Membuat laporan penggajian untuk keperluan akuntansi.</li>
            </ul>
        </CardContent>
      </Card>
    </div>
  );
}
