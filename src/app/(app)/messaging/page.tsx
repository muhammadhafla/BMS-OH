
'use client';

import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Send, User, Users, PlusCircle, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import type { Conversation, Message, User as AppUser } from '@/lib/types';
import { sendMessage, getParticipantDetails } from '@/lib/services/messaging';
import { getAllUsersWithSalary } from '@/lib/services/user';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';


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
                            <Label htmlFor="group-name">Nama Grup (Opsional)</Label>
                            <Input 
                                id="group-name" 
                                value={groupName} 
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="Contoh: Tim Pemasaran"
                             />
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
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


export default function MessagingPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hardcoded current user for demonstration
  const currentUserId = 'user_admin_001';
  const currentUser = { id: currentUserId, name: 'Pengguna Admin' };


  useEffect(() => {
    const fetchUsers = async () => {
        try {
            const users = await getAllUsersWithSalary();
            setAllUsers(users);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal memuat pengguna' });
        }
    };
    fetchUsers();
  }, [toast]);
  
  useEffect(() => {
    const q = query(
      collection(firestore, 'conversations'),
      where('participants', 'array-contains', currentUserId),
      orderBy('lastMessage.timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
      setConversations(convos);
    }, (error) => {
        console.error("Error fetching conversations:", error);
        toast({variant: 'destructive', title: 'Gagal memuat percakapan'});
    });

    return () => unsubscribe();
  }, [currentUserId, toast]);

  useEffect(() => {
    if (!selectedConversationId) {
        setMessages([]);
        return;
    };

    const messagesQuery = query(
      collection(firestore, 'conversations', selectedConversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    }, () => {
        // This can error if the conversation doc doesn't exist yet, which is fine.
        setMessages([]);
    });

    return () => unsubscribe();
  }, [selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversationId) return;

    setIsSending(true);
    
    let selectedConvo = conversations.find(c => c.id === selectedConversationId);
    let participantIds: string[];

    if (selectedConvo) {
      participantIds = selectedConvo.participants;
    } else {
      // This is a new conversation, get participants from the ID
      participantIds = selectedConversationId.split('_');
    }

    try {
        const participantDetails = await getParticipantDetails(participantIds);
        
        await sendMessage({
            conversationId: selectedConversationId,
            participantIds: participantIds,
            participantDetails: participantDetails,
            senderId: currentUser.id,
            senderName: currentUser.name,
            text: newMessage.trim(),
        });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ variant: 'destructive', title: 'Gagal mengirim pesan' });
    } finally {
      setIsSending(false);
    }
  };

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  
  const getConversationName = (convo: Conversation) => {
    if (convo.name) return convo.name; // Group chat name
    const otherId = convo.participants.find(p => p !== currentUserId);
    return convo.participantNames[otherId!] || 'Pengguna Tidak Dikenal';
  };
  
  const getAvatarFallback = (convo: Conversation) => {
    const name = getConversationName(convo);
    if (convo.participants.length > 2) return name.charAt(0) || 'G';
    return name.charAt(0) || '?';
  }

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };
  
  const handleStartNewConversation = (userIds: string[], groupName?: string) => {
    const allParticipantIds = [...userIds, currentUserId];
    const uniqueParticipantIds = [...new Set(allParticipantIds)].sort();
    
    let conversationId: string;
    if (uniqueParticipantIds.length > 2) {
        // For group chats, generate a new random ID
        conversationId = `group_${Date.now()}`;
    } else {
        // For 1-on-1 chats, use the deterministic ID
        conversationId = uniqueParticipantIds.join('_');
    }
    
    // We optimistically set the conversation ID. The conversation document
    // will be created on the first message send.
    setSelectedConversationId(conversationId);
  };


  return (
    <>
    <div className="flex flex-1 h-screen">
      <aside className="w-80 border-r flex flex-col">
        <header className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2"><Users size={20}/> Percakapan</h2>
            <Button size="icon" variant="ghost" onClick={() => setIsNewConversationModalOpen(true)}>
                <PlusCircle size={20}/>
            </Button>
          </div>
        </header>
        <ScrollArea className="flex-1">
          {conversations.map((convo) => (
            <div
              key={convo.id}
              className={cn(
                'p-4 cursor-pointer border-b flex gap-3 items-center',
                selectedConversationId === convo.id ? 'bg-muted' : 'hover:bg-muted/50'
              )}
              onClick={() => handleSelectConversation(convo.id)}
            >
              <Avatar>
                 <AvatarFallback>{getAvatarFallback(convo)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold truncate">{getConversationName(convo)}</p>
                <p className="text-sm text-muted-foreground truncate">{convo.lastMessage?.text || 'Belum ada pesan'}</p>
              </div>
              {convo.lastMessage?.timestamp && (
                <p className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                    {formatDistanceToNow(convo.lastMessage.timestamp.toDate(), { addSuffix: true, locale: indonesiaLocale })}
                </p>
              )}
            </div>
          ))}
        </ScrollArea>
      </aside>

      <main className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <>
            <header className="p-4 border-b flex items-center gap-3">
              <Avatar>
                 <AvatarFallback>{selectedConversation ? getAvatarFallback(selectedConversation) : '?'}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{selectedConversation ? getConversationName(selectedConversation) : 'Percakapan Baru'}</h2>
            </header>
            <ScrollArea className="flex-1 p-4 bg-muted/20">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex items-end gap-2 max-w-lg',
                      message.senderId === currentUserId ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    )}
                  >
                    <Avatar className="h-8 w-8">
                       <AvatarFallback>{message.senderName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        'p-3 rounded-lg',
                        message.senderId === currentUserId
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border'
                      )}
                    >
                      <p>{message.text}</p>
                      <p className={cn(
                          "text-xs mt-1",
                           message.senderId === currentUserId
                           ? 'text-primary-foreground/70'
                           : 'text-muted-foreground'
                           )}>
                        {formatDistanceToNow(message.timestamp.toDate(), { addSuffix: true, locale: indonesiaLocale })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>
            <footer className="p-4 border-t">
              <form className="flex gap-2" onSubmit={handleSendMessage}>
                <Input
                  placeholder="Ketik pesan..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={isSending}
                />
                <Button type="submit" disabled={isSending || !newMessage.trim()}>
                  <Send className="mr-2" /> {isSending ? 'Mengirim...' : 'Kirim'}
                </Button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <Card className="w-96 text-center p-8">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2">
                        <MessageSquare size={24}/> Selamat Datang di Pesan Internal
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Pilih percakapan dari sisi kiri untuk memulai, atau buat percakapan baru.</p>
                </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
    <NewConversationDialog
        isOpen={isNewConversationModalOpen}
        onClose={() => setIsNewConversationModalOpen(false)}
        allUsers={allUsers}
        currentUserId={currentUserId}
        onStartConversation={handleStartNewConversation}
    />
    </>
  );
}

    
