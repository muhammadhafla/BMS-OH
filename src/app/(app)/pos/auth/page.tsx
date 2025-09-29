'use client';
//berisi tentang auth//

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/shared/logo';
import { useToast } from '@/hooks/use-toast';

export default function PosAuthPage() {
  const [pin, setPin] = useState('');
  const [cashierName, setCashierName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Clear session auth on load
    sessionStorage.removeItem('pos-authenticated'); //berisi tentang auth//
    sessionStorage.removeItem('pos-cashier-name'); //berisi tentang auth//
    nameInputRef.current?.focus();
  }, []);

  const handleAuth = (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    // This PIN is for accessing the POS screen.
    const accessPin = localStorage.getItem('pos-access-pin') || '1234'; //berisi tentang auth//

    if (pin === accessPin) {
      toast({
        title: 'Otorisasi Berhasil',
        description: 'Mengarahkan ke Point of Sale.',
      });
      // Set a session storage item to indicate authentication
      sessionStorage.setItem('pos-authenticated', 'true'); //berisi tentang auth//
      sessionStorage.setItem('pos-cashier-name', cashierName); //berisi tentang auth//
      router.push('/pos');
    } else {
      toast({
        variant: 'destructive',
        title: 'Otorisasi Gagal',
        description: 'PIN yang Anda masukkan salah.',
      });
      setPin('');
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-800 p-4">
      <div className="w-full max-w-sm rounded-lg bg-zinc-900/50 p-8 shadow-2xl border border-zinc-700">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <Logo className="!h-20 !w-20 !text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-white">Otorisasi POS</h1>
          <p className="text-zinc-400 mt-2">
            Masukkan nama dan PIN untuk memulai sesi.
          </p>
        </div>
        <form onSubmit={handleAuth} className="mt-8">
          <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="cashierName" className="text-zinc-400">
                    Nama Kasir
                </Label>
                <Input
                    ref={nameInputRef}
                    id="cashierName"
                    type="text"
                    required
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                    disabled={loading}
                    className="h-12 bg-zinc-700 border-zinc-600 text-white focus:border-yellow-400 focus:ring-yellow-400"
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin" className="text-zinc-400">
                PIN Akses
              </Label>
              <Input
                id="pin"
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={loading}
                className="h-12 text-center text-2xl tracking-[1rem] bg-zinc-700 border-zinc-600 text-white focus:border-yellow-400 focus:ring-yellow-400"
                maxLength={4}
              />
            </div>
          </div>
          <div className="mt-8">
            <Button
              type="submit"
              className="w-full h-12 bg-yellow-400 text-lg font-bold text-black hover:bg-yellow-500 disabled:opacity-75"
              disabled={loading || !cashierName || !pin}
            >
              {loading ? 'Memverifikasi...' : 'Mulai Sesi'}
            </Button>
          </div>
        </form>
         <div className="mt-6 text-center">
            <Button variant="link" className="text-zinc-400" onClick={() => router.back()}>
                Kembali ke Dashboard
            </Button>
        </div>
      </div>
    </main>
  );
}
