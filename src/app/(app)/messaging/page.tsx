
'use client';

import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Send, User, Users, PlusCircle, MessageSquare } from 'lucide-react';
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
import { sendMessage } from '@/lib/services/messaging';
import { getAllUsersWithSalary } from '@/lib/services/user';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';


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
    onStartConversation: (userId: string) => void
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Mulai Percakapan Baru</DialogTitle>
                    <DialogDescription>Pilih pengguna untuk memulai percakapan.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-72">
                    <div className="space-y-2 p-2">
                    {allUsers.filter(user => user.id !== currentUserId).map(user => (
                        <div 
                            key={user.id} 
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                            onClick={() => {
                                onStartConversation(user.id!);
                                onClose();
                            }}
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
                 <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Batal</Button>
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
  const currentUserName = 'Pengguna Admin';

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
    
    const selectedConvo = conversations.find(c => c.id === selectedConversationId);
    if (!selectedConvo) return;


    try {
        await sendMessage({
            participantIds: selectedConvo.participants,
            senderId: currentUserId,
            senderName: currentUserName,
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
  
  const getOtherParticipant = (convo: Conversation) => {
    const otherId = convo.participants.find(p => p !== currentUserId);
    return convo.participantNames[otherId!] || 'Unknown User';
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };
  
  const handleStartNewConversation = (userId: string) => {
    const participantIds = [currentUserId, userId].sort();
    const conversationId = participantIds.join('_');
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
                 <AvatarFallback>{getOtherParticipant(convo).charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold truncate">{getOtherParticipant(convo)}</p>
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
        {selectedConversation ? (
          <>
            <header className="p-4 border-b flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{getOtherParticipant(selectedConversation).charAt(0)}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{getOtherParticipant(selectedConversation)}</h2>
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

    