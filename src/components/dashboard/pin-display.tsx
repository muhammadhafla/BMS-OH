
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, CopyCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PinDisplay() {
  const [pin, setPin] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPin = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/auth/pin');
        if (!response.ok) {
          throw new Error('Gagal mengambil PIN');
        }
        const data = await response.json();
        setPin(data.pin);
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Gagal Memuat PIN',
          description: 'Tidak dapat mengambil PIN otorisasi dari server.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPin();
  }, [toast]);

  const handleCopy = () => {
    if (pin) {
      navigator.clipboard.writeText(pin);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>PIN Otorisasi POS</CardTitle>
        <CardDescription>
          Gunakan PIN ini untuk tindakan yang memerlukan otorisasi di POS. PIN ini diperbarui secara berkala.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        {isLoading ? (
          <Skeleton className="h-10 w-32" />
        ) : pin ? (
          <div className="text-3xl font-bold tracking-widest font-mono bg-muted px-4 py-2 rounded-md">
            {pin}
          </div>
        ) : (
          <div className="text-muted-foreground">Gagal memuat PIN.</div>
        )}
        <Button onClick={handleCopy} variant="outline" size="icon" disabled={!pin || isLoading}>
          {isCopied ? <CopyCheck className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
        </Button>
      </CardContent>
    </Card>
  );
}
