'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Edit,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  BarChart3,
  Filter,
  Download,
  Loader2,
} from 'lucide-react';
import { apiService } from '@/services/api';

interface AttendanceRecord {
  id: number;
  user_name: string;
  user_id: number;
  date: string;
  check_in: string;
  check_out?: string;
  break_start?: string;
  break_end?: string;
  status: 'present' | 'absent' | 'late' | 'half_day';
  branch: string;
  notes?: string;
}

const Attendance: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        setIsLoading(true);
        // Mock data - replace with actual API call
        const mockRecords: AttendanceRecord[] = [
          {
            id: 1,
            user_name: 'Ahmad Admin',
            user_id: 1,
            date: '2024-11-10',
            check_in: '08:00:00',
            check_out: '17:00:00',
            status: 'present',
            branch: 'Pusat',
          },
          {
            id: 2,
            user_name: 'Sari Manager',
            user_id: 2,
            date: '2024-11-10',
            check_in: '08:30:00',
            check_out: '17:15:00',
            status: 'present',
            branch: 'Cabang Jakarta',
          },
          {
            id: 3,
            user_name: 'Budi Staff',
            user_id: 3,
            date: '2024-11-10',
            check_in: '09:15:00',
            check_out: '18:00:00',
            status: 'late',
            branch: 'Cabang Bekasi',
          },
          {
            id: 4,
            user_name: 'Maya Staff',
            user_id: 4,
            date: '2024-11-10',
            check_in: '08:00:00',
            check_out: '12:00:00',
            status: 'half_day',
            branch: 'Cabang Tangerang',
          }
        ];
        setRecords(mockRecords);
      } catch (error) {
        console.error('Error loading attendance:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAttendance();
  }, []);

  const filteredRecords = records.filter(record =>
    record.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.branch.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants = {
      present: 'default' as const,
      absent: 'destructive' as const,
      late: 'outline' as const,
      half_day: 'secondary' as const,
    };
    const labels = {
      present: 'Hadir',
      absent: 'Alpha',
      late: 'Terlambat',
      half_day: 'Setengah Hari',
    };
    const icons = {
      present: <CheckCircle className="h-3 w-3 mr-1" />,
      absent: <XCircle className="h-3 w-3 mr-1" />,
      late: <Clock className="h-3 w-3 mr-1" />,
      half_day: <Clock className="h-3 w-3 mr-1" />,
    };
    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const calculateWorkHours = (checkIn: string, checkOut?: string) => {
    if (!checkOut) return '-';
    const start = new Date(`1970-01-01T${checkIn}`);
    const end = new Date(`1970-01-01T${checkOut}`);
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = records.filter(r => r.date === today);
    
    return {
      present: todayRecords.filter(r => r.status === 'present').length,
      late: todayRecords.filter(r => r.status === 'late').length,
      halfDay: todayRecords.filter(r => r.status === 'half_day').length,
      absent: todayRecords.filter(r => r.status === 'absent').length,
      total: todayRecords.length,
    };
  };

  const stats = getTodayStats();

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance Management</h2>
          <p className="text-muted-foreground">
            Kelola presensi dan jam kerja karyawan
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Manual Check-in
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hadir</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
            <p className="text-xs text-muted-foreground">Hadir lengkap</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terlambat</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
            <p className="text-xs text-muted-foreground">Keterlambatan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Setengah Hari</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.halfDay}</div>
            <p className="text-xs text-muted-foreground">Partial attendance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alpha</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
            <p className="text-xs text-muted-foreground">Tidak hadir</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total karyawan</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily View</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="daily" className="space-y-4">
          {/* Search and Date Filter */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Cari karyawan berdasarkan nama atau cabang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          {/* Attendance Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Presensi Hari Ini</CardTitle>
              <CardDescription>
                {new Date(selectedDate).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Memuat data presensi...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Karyawan</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Break</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Total Jam</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                              {record.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{record.user_name}</div>
                              <div className="text-sm text-muted-foreground">
                                ID: {record.user_id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{record.branch}</TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Clock className="h-3 w-3 mr-1" />
                            {record.check_in}
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.break_start && record.break_end ? (
                            <div className="text-sm">
                              <div>{record.break_start} - {record.break_end}</div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {record.check_out ? (
                            <div className="flex items-center text-sm">
                              <Clock className="h-3 w-3 mr-1" />
                              {record.check_out}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Belum check out</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {calculateWorkHours(record.check_in, record.check_out)}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Laporan Presensi</CardTitle>
              <CardDescription>
                Analisis dan laporan attendance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                <p>Laporan attendance akan ditampilkan di sini</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Presensi</CardTitle>
              <CardDescription>
                Konfigurasi jam kerja dan rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                <Clock className="h-12 w-12 mx-auto mb-4" />
                <p>Pengaturan presensi akan ditampilkan di sini</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Attendance;