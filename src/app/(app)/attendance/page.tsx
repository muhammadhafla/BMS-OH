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
    clockIn: '08:59 AM',
    clockOut: '05:03 PM',
    status: 'Present',
    location: 'Main Office',
  },
  {
    date: '2023-10-25',
    clockIn: '09:05 AM',
    clockOut: '05:00 PM',
    status: 'Present',
    location: 'Main Office',
  },
  {
    date: '2023-10-24',
    clockIn: 'N/A',
    clockOut: 'N/A',
    status: 'Absent',
    location: 'N/A',
  },
  {
    date: '2023-10-23',
    clockIn: '09:00 AM',
    clockOut: '03:30 PM',
    status: 'Half Day',
    location: 'Main Office',
  },
];

export default function AttendancePage() {
  const isClockedIn = false; // Mock state

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Attendance
        </h1>
        <p className="text-muted-foreground">
          Track your work hours and location.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Time Clock</CardTitle>
              <CardDescription>
                {isClockedIn ? 'Clock out to end your shift.' : 'Clock in to start your shift.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button size="lg" className="w-full h-24 text-2xl bg-accent hover:bg-accent/90">
                {isClockedIn ? 'Clock Out' : 'Clock In'}
              </Button>
              <p className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Camera className="size-4" />
                <MapPin className="size-4" />
                <span>Selfie & GPS will be captured.</span>
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>Your recent attendance log.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceHistory.map((entry) => (
                    <TableRow key={entry.date}>
                      <TableCell className="font-medium">{entry.date}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.status === 'Present'
                              ? 'default'
                              : entry.status === 'Absent'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className={entry.status === 'Present' ? 'bg-green-500 hover:bg-green-600' : ''}
                        >
                           {entry.status === 'Present' && <CheckCircle className="mr-1 h-3 w-3" />}
                           {entry.status === 'Absent' && <XCircle className="mr-1 h-3 w-3" />}
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
