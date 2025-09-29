'use client';
//berisi tentang auth//

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/shared/logo';
import { useToast } from '@/hooks/use-toast';
import { signIn } from '@/lib/services/auth'; // We will create this

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    // Bypass login and redirect to dashboard
    router.push('/dashboard');

    // Original login logic - commented out for now
    /*
    try {
      const result = await signIn(email, password); //berisi tentang auth//
      if (result.success) {
        toast({
          title: 'Login Berhasil',
          description: 'Anda akan diarahkan ke dashboard.',
        });
        router.push('/dashboard');
      } else {
        throw new Error(result.error || 'Terjadi kesalahan saat login.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Gagal',
        description: error.message || 'Email atau password salah.',
      });
    } finally {
      setLoading(false);
    }
    */
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-bold">Selamat Datang di BMS</CardTitle>
          <CardDescription>Masuk untuk mengakses dashboard Anda</CardDescription>
        </CardHeader>
        <form onSubmit={handleSignIn}>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90"
              disabled={loading}
            >
              {loading ? 'Mengarahkan...' : 'Masuk (Bypass)'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
