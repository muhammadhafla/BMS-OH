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

type UserRole = 'admin' | 'manager' | 'staff';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

const initialUsers: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@bms.app', role: 'admin' },
  { id: '2', name: 'Manager User', email: 'manager@bms.app', role: 'manager' },
  { id: '3', name: 'Staff User', email: 'staff@bms.app', role: 'staff' },
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
  const [posAuthPin, setPosAuthPin] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const storedPin = localStorage.getItem('pos-auth-pin');
    if (storedPin) {
      setPosAuthPin(storedPin);
    }
  }, []);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPosAuthPin(e.target.value);
  };

  const handleSaveSettings = () => {
    localStorage.setItem('pos-auth-pin', posAuthPin);
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
              <Input id="name" defaultValue="Admin User" />
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
              <Label htmlFor="pos-pin">PIN Otorisasi POS</Label>
              <Input
                id="pos-pin"
                type="password"
                value={posAuthPin}
                onChange={handlePinChange}
                maxLength={4}
                placeholder="Masukkan 4 digit PIN"
              />
              <p className="text-sm text-muted-foreground">
                PIN ini digunakan untuk mengotorisasi tindakan yang dibatasi di kasir, seperti mengubah harga.
              </p>
            </div>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Peran & Hak Akses</CardTitle>
              <CardDescription>
                Kelola peran pengguna dan hak aksesnya.
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
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                       <Button variant="ghost" size="icon" onClick={() => deleteUser(user.id)} className="text-destructive hover:text-destructive/80">
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
                  <TableHead className="text-center">Manager</TableHead>
                  <TableHead className="text-center">Staff</TableHead>
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
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
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
