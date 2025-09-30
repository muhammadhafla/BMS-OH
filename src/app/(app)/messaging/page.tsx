
'use client';

import { InternalChat } from '@/components/shared/internal-chat';

export default function MessagingPage() {
  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight font-headline">
          Pesan Internal
        </h1>
         <p className="text-muted-foreground">
          Berkomunikasi dengan anggota tim lain secara internal.
        </p>
      </header>
      <div className="flex-1 w-full max-w-5xl mx-auto h-[calc(100vh-200px)]">
        <InternalChat />
      </div>
    </div>
  );
}
