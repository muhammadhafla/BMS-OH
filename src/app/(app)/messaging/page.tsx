
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Send, User, Users, PlusCircle, MessageSquare, X, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Conversation, Message, User as AppUser } from '@/lib/types';
import { Label } from '@/components/ui/label';

// =================================================================
// DUMMY DATA (Replaces Firestore)
// =================================================================
const currentUserId = 'user_admin_001';

const allUsers: AppUser[] = [
  { id: 'user_admin_001', name: 'Pengguna Admin', email: 'admin@bms.app', role: 'admin', salaryType: 'Bulanan', baseSalary: 0 },
  { id: 'user_manager_001', name: 'Pengguna Manajer', email: 'manager@bms.app', role: 'manager', salaryType: 'Bulanan', baseSalary: 0 },
  { id: 'user_staff_001', name: 'Pengguna Staf', email: 'staff@bms.app', role: 'staff', salaryType: 'Per Jam', baseSalary: 0 },
];

const initialConversations: Conversation[] = [
  {
    id: 'user_admin_001_user_staff_001',
    participants: ['user_admin_001', 'user_staff_001'],
    participantNames: {
      'user_admin_001': 'Pengguna Admin',
      'user_staff_001': 'Pengguna Staf',
    },
    lastMessage: {
      text: 'Oke, akan saya kerjakan.',
      timestamp: new Date(new Date().getTime() - 5 * 60 * 1000) as any,
      senderId: 'user_staff_001',
    },
  },
  {
    id: 'group_marketing',
    name: 'Tim Pemasaran',
    isGroup: true,
    participants: ['user_admin_001', 'user_manager_001', 'user_staff_001'],
    participantNames: {
      'user_admin_001': 'Pengguna Admin',
      'user_manager_001': 'Pengguna Manajer',
      'user_staff_001': 'Pengguna Staf',
    },
    lastMessage: {
      text: 'Rapat besok jam 10 pagi ya.',
      timestamp: new Date(new Date().getTime() - 60 * 60 * 1000) as any,
      senderId: 'user_manager_001',
    },
  },
];

const initialMessages: Record<string, Message[]> = {
  'user_admin_001_user_staff_001': [
    {
      id: 'msg1',
      conversationId: 'user_admin_001_user_staff_001',
      senderId: 'user_admin_001',
      senderName: 'Pengguna Admin',
      text: 'Tolong siapkan laporan penjualan untuk bulan ini.',
      timestamp: new Date(new Date().getTime() - 10 * 60 * 1000) as any,
    },
    {
      id: 'msg2',
      conversationId: 'user_admin_001_user_staff_001',
      senderId: 'user_staff_001',
      senderName: 'Pengguna Staf',
      text: 'Oke, akan saya kerjakan.',
      timestamp: new Date(new Date().getTime() - 5 * 60 * 1000) as any,
    },
  ],
  'group_marketing': [
    {
      id: 'msg3',
      conversationId: 'group_marketing',
      senderId: 'user_manager_001',
      senderName: 'Pengguna Manajer',
      text: 'Rapat besok jam 10 pagi ya.',
      timestamp: new Date(new Date().getTime() - 60 * 60 * 1000) as any,
    },
  ],
};
// =================================================================

const NewConversationDialog = ({
    isOpen,
    onClose,
    allUsers,
    currentUserId,
    onStartConversation
}: {
    isOpen: boolean,
    onClose: () => void,
    allUsers: AppUser[],
    currentUserId: string,
    onStartConversation: (userIds: string[], groupName?: string) => void
}) => {
    const [selectedUsers, setSelectedUsers] = useState<AppUser[]>([]);
    const [groupName, setGroupName] = useState('');

    const handleUserToggle = (user: AppUser) => {
        setSelectedUsers(prev =>
            prev.find(u => u.id === user.id)
                ? prev.filter(u => u.id !== user.id)
                : [...prev, user]
        );
    };
    
    const handleStart = () => {
        if (selectedUsers.length === 0) return;
        const userIds = selectedUsers.map(u => u.id!);
        if (selectedUsers.length > 1 && !groupName) {
            // Optional: You could add a toast here to require a group name
        }
        onStartConversation(userIds, selectedUsers.length > 1 ? groupName : undefined);
        handleClose();
    }
    
    const handleClose = () => {
        setSelectedUsers([]);
        setGroupName('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Mulai Percakapan Baru</DialogTitle>
                    <DialogDescription>Pilih satu atau lebih pengguna untuk memulai percakapan.</DialogDescription>
                </DialogHeader>
                 <div className="space-y-4 py-2">
                    {selectedUsers.length > 1 && (
                         <div className="space-y-2">
                            <Label htmlFor="group-name">Nama Grup</Label>
                            <Input 
                                id="group-name" 
                                value={groupName} 
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="Contoh: Tim Pemasaran"
                             />
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2 min-h-6">
                        {selectedUsers.map(user => (
                            <Badge key={user.id} variant="secondary" className="pl-2">
                                {user.name}
                                <button onClick={() => handleUserToggle(user)} className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20">
                                    <X size={12}/>
                                </button>
                            </Badge>
                        ))}
                    </div>
                    <ScrollArea className="h-60 border rounded-md">
                        <div className="p-2">
                        {allUsers.filter(user => user.id !== currentUserId).map(user => (
                            <div 
                                key={user.id} 
                                className={cn(
                                    "flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer",
                                    selectedUsers.find(u => u.id === user.id) && "bg-muted"
                                )}
                                onClick={() => handleUserToggle(user)}
                            >
                                <Avatar>
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{user.name}</span>
                                <span className="text-sm text-muted-foreground ml-auto">{user.role}</span>
                            </div>
                        ))}
                        </div>
                    </ScrollArea>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>Batal</Button>
                    <Button onClick={handleStart} disabled={selectedUsers.length === 0}>
                        {selectedUsers.length > 1 ? 'Buat Grup' : 'Mulai Percakapan'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const EditConversationNameDialog = ({
  isOpen,
  onClose,
  conversation,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  onSave: (newName: string) => void;
}) => {
  const [name, setName] = useState('');
  useEffect(() => {
    if (conversation) {
      setName(conversation.name || '');
    }
  }, [conversation]);

  if (!conversation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah Nama Percakapan</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="conversation-name">Nama</Label>
          <Input id="conversation-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => { onSave(name); onClose(); }}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function MessagingPage() {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>(initialMessages);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = allUsers.find(u => u.id === currentUserId)!;

  const messages = useMemo(() => {
    return selectedConversationId ? allMessages[selectedConversationId] || [] : [];
  }, [selectedConversationId, allMessages]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversationId) return;

    setIsSending(true);

    const newMessageObj: Message = {
      id: `msg_${Date.now()}`,
      conversationId: selectedConversationId,
      senderId: currentUser.id!,
      senderName: currentUser.name,
      text: newMessage.trim(),
      timestamp: new Date() as any,
    };
    
    // Simulate network delay
    await new Promise(res => setTimeout(res, 300));
    
    // Add message to local state
    setAllMessages(prev => ({
      ...prev,
      [selectedConversationId]: [...(prev[selectedConversationId] || []), newMessageObj],
    }));

    // Update last message in conversation
    setConversations(prev => prev.map(c => 
      c.id === selectedConversationId 
      ? { ...c, lastMessage: { text: newMessageObj.text, timestamp: newMessageObj.timestamp, senderId: currentUser.id! } }
      : c
    ).sort((a,b) => (b.lastMessage?.timestamp || 0) > (a.lastMessage?.timestamp || 0) ? 1 : -1));

    setNewMessage('');
    setIsSending(false);
  };

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  
  const getConversationName = (convo: Conversation) => {
    if (convo.name) return convo.name; // Group chat name
    const otherId = convo.participants.find(p => p !== currentUserId);
    return convo.participantNames[otherId!] || 'Pengguna Tidak Dikenal';
  };
  
  const getAvatarFallback = (convo: Conversation) => {
    const name = getConversationName(convo);
    if (convo.isGroup) return name.charAt(0) || 'G';
    return name.charAt(0) || '?';
  }

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };
  
  const handleStartNewConversation = (userIds: string[], groupName?: string) => {
    const allParticipantIds = [...userIds, currentUserId].sort();
    const uniqueParticipantIds = [...new Set(allParticipantIds)];

    let conversationId: string;
    let existingConvo = null;

    if (uniqueParticipantIds.length > 2) { // Group chat
        conversationId = `group_${Date.now()}`;
    } else { // 1-on-1 chat
        conversationId = uniqueParticipantIds.join('_');
        existingConvo = conversations.find(c => c.id === conversationId);
    }
    
    if (existingConvo) {
      setSelectedConversationId(existingConvo.id);
      return;
    }

    const participantNames: Record<string, string> = {};
    uniqueParticipantIds.forEach(id => {
      participantNames[id] = allUsers.find(u => u.id === id)?.name || 'Unknown';
    });

    const newConvo: Conversation = {
      id: conversationId,
      participants: uniqueParticipantIds,
      participantNames,
      lastMessage: null,
      isGroup: uniqueParticipantIds.length > 2,
      name: uniqueParticipantIds.length > 2 ? groupName || 'Grup Baru' : undefined,
    };

    setConversations(prev => [newConvo, ...prev]);
    setSelectedConversationId(conversationId);
  };
  
  const handleSaveConversationName = (newName: string) => {
    if (!selectedConversationId) return;
    setConversations(prev => prev.map(c => 
      c.id === selectedConversationId ? { ...c, name: newName } : c
    ));
  };


  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight font-headline">
          Pesan Internal
        </h1>
      </header>
      <Card className="flex flex-1 w-full max-w-5xl mx-auto h-[calc(100vh-200px)]">
        <aside className="w-1/3 border-r flex flex-col">
          <header className="p-3 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2"><Users size={18}/> Percakapan</h2>
              <Button size="icon" variant="ghost" onClick={() => setIsNewConversationModalOpen(true)}>
                  <PlusCircle size={18}/>
              </Button>
            </div>
          </header>
          <ScrollArea className="flex-1">
            {conversations.map((convo) => (
              <div
                key={convo.id}
                className={cn(
                  'p-3 cursor-pointer border-b flex gap-3 items-center',
                  selectedConversationId === convo.id ? 'bg-muted' : 'hover:bg-muted/50'
                )}
                onClick={() => handleSelectConversation(convo.id)}
              >
                <Avatar className="h-9 w-9">
                   <AvatarFallback>{getAvatarFallback(convo)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="font-semibold truncate text-sm">{getConversationName(convo)}</p>
                  <p className="text-xs text-muted-foreground truncate">{convo.lastMessage?.text || 'Belum ada pesan'}</p>
                </div>
                {convo.lastMessage?.timestamp && (
                  <p className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                      {formatDistanceToNow(new Date(convo.lastMessage.timestamp), { addSuffix: true, locale: indonesiaLocale })}
                  </p>
                )}
              </div>
            ))}
          </ScrollArea>
        </aside>

        <main className="flex-1 flex flex-col w-2/3">
          {selectedConversationId ? (
            <>
              <header className="p-3 border-b flex items-center gap-3">
                <Avatar className="h-9 w-9">
                   <AvatarFallback>{selectedConversation ? getAvatarFallback(selectedConversation) : '?'}</AvatarFallback>
                </Avatar>
                <h2 className="text-lg font-bold">{selectedConversation ? getConversationName(selectedConversation) : 'Percakapan Baru'}</h2>
                {selectedConversation?.isGroup && (
                  <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" onClick={() => setIsEditNameModalOpen(true)}>
                    <Edit size={16}/>
                  </Button>
                )}
              </header>
              <ScrollArea className="flex-1 p-4 bg-muted/20">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex items-end gap-2 max-w-md',
                        message.senderId === currentUserId ? 'ml-auto flex-row-reverse' : 'mr-auto'
                      )}
                    >
                      <Avatar className="h-8 w-8">
                         <AvatarFallback>{message.senderName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          'p-2 px-3 rounded-lg',
                          message.senderId === currentUserId
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background border'
                        )}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className={cn(
                            "text-xs mt-1 text-right",
                             message.senderId === currentUserId
                             ? 'text-primary-foreground/70'
                             : 'text-muted-foreground'
                             )}>
                          {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true, locale: indonesiaLocale })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>
              <footer className="p-3 border-t">
                <form className="flex gap-2" onSubmit={handleSendMessage}>
                  <Input
                    placeholder="Ketik pesan..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isSending}
                  />
                  <Button type="submit" disabled={isSending || !newMessage.trim()}>
                    <Send className="mr-2 h-4 w-4" /> Kirim
                  </Button>
                </form>
              </footer>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                  <MessageSquare size={48} className="mx-auto mb-4"/>
                  <h3 className="text-lg font-semibold">Selamat Datang di Pesan Internal</h3>
                  <p className="text-sm">Pilih percakapan dari sisi kiri untuk memulai.</p>
              </div>
            </div>
          )}
        </main>
      </Card>
      <NewConversationDialog
          isOpen={isNewConversationModalOpen}
          onClose={() => setIsNewConversationModalOpen(false)}
          allUsers={allUsers}
          currentUserId={currentUserId}
          onStartConversation={handleStartNewConversation}
      />
      <EditConversationNameDialog
        isOpen={isEditNameModalOpen}
        onClose={() => setIsEditNameModalOpen(false)}
        conversation={selectedConversation || null}
        onSave={handleSaveConversationName}
      />
    </div>
  );
}

