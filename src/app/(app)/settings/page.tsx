
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
import { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { modules } from '@/lib/modules.tsx';
import { useToast } from '@/hooks/use-toast';
import type { User, UserRole, SalaryType } from '@/lib/types';


const initialUsers: User[] = [
  { id: 'user_admin_001', name: 'Pengguna Admin', email: 'admin@bms.app', role: 'admin', salaryType: 'Bulanan', baseSalary: 10000000 },
  { id: 'user_manager_001', name: 'Pengguna Manajer', email: 'manager@bms.app', role: 'manager', salaryType: 'Bulanan', baseSalary: 7500000 },
  { id: 'user_staff_001', name: 'Pengguna Staf', email: 'staff@bms.app', role: 'staff', salaryType: 'Per Jam', baseSalary: 50000 },
  { id: 'user_staff_002', name: 'Karyawan Baru', email: 'new@bms.app', role: 'staff', salaryType: 'Bulanan', baseSalary: 4000000 },
];

const initialPermissions: Record<string, UserRole[]> = {
  '/inventory': ['admin', 'manager'],
  '/accounting': ['admin', 'manager'],
  '/attendance': ['admin', 'manager', 'staff'],
  '/pos': ['admin', 'staff'],
  '/settings': ['admin'],
  '/dashboard': ['admin', 'manager', 'staff'],
};

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState(initialPermissions);
  const [posAccessPin, setPosAccessPin] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // This is for the login PIN, not the manager override PIN
    const storedPin = localStorage.getItem('pos-access-pin');
    if (storedPin) {
      setPosAccessPin(storedPin);
    }
  }, []);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPosAccessPin(e.target.value);
  };
  
  const handleSaveSettings = () => {
    localStorage.setItem('pos-access-pin', posAccessPin); // This is for general POS access, not manager override
    toast({
      title: "Pengaturan Disimpan",
      description: "Pengaturan Anda telah berhasil disimpan.",
    });
  };

  const openAddDialog = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };
  
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newUser: User = {
      id: editingUser ? editingUser.id : String(Date.now()),
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as UserRole,
      salaryType: formData.get('salaryType') as SalaryType,
      baseSalary: Number(formData.get('baseSalary')),
    };

    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? newUser : u));
    } else {
      setUsers([...users, newUser]);
    }
    setIsDialogOpen(false);
  };

  const deleteUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
  };
  
  const handlePermissionChange = (moduleHref: string, role: UserRole, checked: boolean) => {
    setPermissions(prev => {
      const currentRoles = prev[moduleHref] || [];
      if (checked) {
        return { ...prev, [moduleHref]: [...currentRoles, role] };
      } else {
        return { ...prev, [moduleHref]: currentRoles.filter(r => r !== role) };
      }
    });
  };


  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Pengaturan
        </h1>
        <p className="text-muted-foreground">
          Kelola pengaturan akun dan preferensi aplikasi Anda.
        </p>
      </header>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
            <CardDescription>
              Perbarui informasi profil Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" defaultValue="Pengguna Admin" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="admin@bms.app" disabled />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan POS</CardTitle>
            <CardDescription>
              Kelola pengaturan untuk Point of Sale.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pos-pin">PIN Akses Kasir</Label>
              <Input
                id="pos-pin"
                type="password"
                value={posAccessPin}
                onChange={handlePinChange}
                maxLength={4}
                placeholder="Masukkan 4 digit PIN untuk akses kasir"
              />
              <p className="text-sm text-muted-foreground">
                PIN ini digunakan oleh kasir untuk memulai sesi di halaman POS.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Manajemen Pengguna</CardTitle>
              <CardDescription>
                Kelola pengguna, peran, dan gaji.
              </CardDescription>
            </div>
            <Button className="bg-accent hover:bg-accent/90" onClick={openAddDialog}>
              <PlusCircle />
              Tambah Pengguna
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Gaji</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                        Rp{user.baseSalary.toLocaleString('id-ID')}
                        <span className="text-xs text-muted-foreground">/{user.salaryType === 'Bulanan' ? 'bln' : 'jam'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                       <Button variant="ghost" size="icon" onClick={() => deleteUser(user.id!)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Kontrol Akses Modul</CardTitle>
            <CardDescription>
              Atur modul mana yang dapat diakses oleh setiap peran. Admin selalu memiliki akses penuh.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modul</TableHead>
                  <TableHead className="text-center">Manajer</TableHead>
                  <TableHead className="text-center">Staf</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map(module => (
                  <TableRow key={module.href}>
                    <TableCell className="font-medium">{module.name}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={permissions[module.href]?.includes('manager')}
                        onCheckedChange={(checked) => handlePermissionChange(module.href, 'manager', checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={permissions[module.href]?.includes('staff')}
                        onCheckedChange={(checked) => handlePermissionChange(module.href, 'staff', checked as boolean)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Keamanan</CardTitle>
            <CardDescription>Ubah kata sandi Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Password Saat Ini</Label>
              <Input id="current-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Password Baru</Label>
              <Input id="new-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
              <Input id="confirm-password" type="password" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tampilan</CardTitle>
            <CardDescription>
              Kustomisasi tampilan dan nuansa aplikasi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="dark-mode">Mode Gelap</Label>
                <p className="text-sm text-muted-foreground">
                  Aktifkan atau nonaktifkan tema gelap.
                </p>
              </div>
              <Switch id="dark-mode" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifikasi</CardTitle>
            <CardDescription>
              Pilih cara Anda menerima notifikasi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notifications">Notifikasi Email</Label>
                <p className="text-sm text-muted-foreground">
                  Terima pembaruan penting melalui email.
                </p>
              </div>
              <Switch id="email-notifications" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="push-notifications">Notifikasi Push</Label>
                <p className="text-sm text-muted-foreground">
                  Dapatkan peringatan real-time di perangkat Anda.
                </p>
              </div>
              <Switch id="push-notifications" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} className="bg-accent hover:bg-accent/90">Simpan Perubahan</Button>
        </div>
      </div>

       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Perbarui detail pengguna di bawah ini.' : 'Isi detail untuk pengguna baru.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">Nama</Label>
                <Input id="user-name" name="name" defaultValue={editingUser?.name || ''} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input id="user-email" name="email" type="email" defaultValue={editingUser?.email || ''} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-role">Peran</Label>
                 <Select name="role" defaultValue={editingUser?.role || 'staff'}>
                  <SelectTrigger id="user-role">
                    <SelectValue placeholder="Pilih peran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manajer</SelectItem>
                    <SelectItem value="staff">Staf</SelectItem>
                  </SelectContent>
                </Select>
              </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="user-salaryType">Jenis Gaji</Label>
                    <Select name="salaryType" defaultValue={editingUser?.salaryType || 'Bulanan'}>
                      <SelectTrigger id="user-salaryType">
                        <SelectValue placeholder="Pilih jenis gaji" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bulanan">Bulanan</SelectItem>
                        <SelectItem value="Per Jam">Per Jam</SelectItem>
                      </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="user-baseSalary">Gaji Pokok / Tarif</Label>
                    <Input id="user-baseSalary" name="baseSalary" type="number" defaultValue={editingUser?.baseSalary || 0} required />
                 </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-accent hover:bg-accent/90">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
