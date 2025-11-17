'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MessageSquare,
  Send,
  Inbox,
  Users,
  Clock,
  CheckCircle,
  Circle,
  Star,
  Archive,
  StarOff,
  Reply,
  Loader2,
} from 'lucide-react';
import { apiService } from '@/services/api';

interface Message {
  id: number;
  subject: string;
  content: string;
  sender: string;
  recipient: string;
  status: 'sent' | 'read' | 'unread';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  type: 'direct' | 'broadcast' | 'system';
  created_at: string;
  read_at?: string;
  is_starred: boolean;
  is_archived: boolean;
}

const Messages: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        // Mock data - replace with actual API call
        const mockMessages: Message[] = [
          {
            id: 1,
            subject: 'Update Stok Produk - November 2024',
            content: 'Selamat pagi tim, berikut adalah update stok produk terbaru. Mohon cek inventori dan lakukan reorder jika diperlukan.',
            sender: 'Ahmad Admin',
            recipient: 'Tim Operasional',
            status: 'read',
            priority: 'normal',
            type: 'broadcast',
            created_at: '2024-11-10T08:30:00Z',
            read_at: '2024-11-10T09:15:00Z',
            is_starred: false,
            is_archived: false,
          },
          {
            id: 2,
            subject: 'Meeting Rutin Bulanan',
            content: 'Reminder: Meeting rutin bulanan akan dilaksanakan pada tanggal 15 November 2024. Mohon hadir tepat waktu.',
            sender: 'Sari Manager',
            recipient: 'Semua Staff',
            status: 'unread',
            priority: 'high',
            type: 'broadcast',
            created_at: '2024-11-10T07:00:00Z',
            is_starred: true,
            is_archived: false,
          },
          {
            id: 3,
            subject: 'Konfirmasi Pembelian Supplier',
            content: 'Budi, mohon konfirmasi status pembelian dari supplier PT. Teknologi Maju. Apakah sudah diterima?',
            sender: 'Sari Manager',
            recipient: 'Budi Staff',
            status: 'sent',
            priority: 'normal',
            type: 'direct',
            created_at: '2024-11-09T16:45:00Z',
            is_starred: false,
            is_archived: false,
          },
          {
            id: 4,
            subject: 'Sistem Maintenance',
            content: 'Mohon informasikan bahwa sistem akan melakukan maintenance pada malam ini pukul 23:00-01:00 WIB.',
            sender: 'System Admin',
            recipient: 'Semua User',
            status: 'read',
            priority: 'urgent',
            type: 'system',
            created_at: '2024-11-09T10:00:00Z',
            read_at: '2024-11-09T10:30:00Z',
            is_starred: false,
            is_archived: true,
          }
        ];
        setMessages(mockMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, []);

  const filteredMessages = messages.filter(message =>
    !message.is_archived &&
    (message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
     message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
     message.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
     message.recipient.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: 'secondary' as const,
      read: 'default' as const,
      unread: 'outline' as const,
    };
    const labels = {
      sent: 'Sent',
      read: 'Read',
      unread: 'Unread',
    };
    const icons = {
      sent: <Circle className="h-3 w-3 mr-1" />,
      read: <CheckCircle className="h-3 w-3 mr-1" />,
      unread: <Inbox className="h-3 w-3 mr-1" />,
    };
    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: 'secondary' as const,
      normal: 'default' as const,
      high: 'outline' as const,
      urgent: 'destructive' as const,
    };
    const labels = {
      low: 'Low',
      normal: 'Normal',
      high: 'High',
      urgent: 'Urgent',
    };
    return (
      <Badge variant={variants[priority as keyof typeof variants]}>
        {labels[priority as keyof typeof labels]}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      direct: <Users className="h-4 w-4" />,
      broadcast: <MessageSquare className="h-4 w-4" />,
      system: <CheckCircle className="h-4 w-4" />,
    };
    return icons[type as keyof typeof icons] || <MessageSquare className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('id-ID', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getMessageStats = () => {
    const total = messages.filter(m => !m.is_archived).length;
    const unread = messages.filter(m => !m.is_archived && m.status === 'unread').length;
    const starred = messages.filter(m => !m.is_archived && m.is_starred).length;
    const sent = messages.filter(m => !m.is_archived && m.status === 'sent').length;
    
    return { total, unread, starred, sent };
  };

  const stats = getMessageStats();

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Internal Messaging</h2>
          <p className="text-muted-foreground">
            Komunikasi internal dan pesan antar karyawan
          </p>
        </div>
        <Dialog open={composeDialogOpen} onOpenChange={setComposeDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Compose Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Compose New Message</DialogTitle>
              <DialogDescription>
                Buat pesan baru untuk dikirim ke team atau individual
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">To</label>
                  <Input placeholder="Select recipient(s)" />
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <select className="w-full p-2 border rounded">
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input placeholder="Message subject" />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea placeholder="Type your message here..." rows={6} />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setComposeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Active messages</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Inbox className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.unread}</div>
            <p className="text-xs text-muted-foreground">Belum dibaca</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Starred</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.starred}</div>
            <p className="text-xs text-muted-foreground">Important messages</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
            <p className="text-xs text-muted-foreground">Messages sent</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search messages by subject, content, sender, or recipient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Archive className="h-4 w-4 mr-2" />
          Archived
        </Button>
      </div>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>
            Semua pesan internal dan komunikasi tim
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Memuat pesan...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMessages.map((message) => (
                  <TableRow 
                    key={message.id}
                    className={message.status === 'unread' ? 'bg-muted/50' : ''}
                    onClick={() => setSelectedMessage(message)}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(message.type)}
                        {message.is_starred && <Star className="h-3 w-3 text-yellow-500" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className={`font-medium ${message.status === 'unread' ? 'font-bold' : ''}`}>
                          {message.subject}
                        </div>
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {message.content}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{message.sender}</TableCell>
                    <TableCell>{message.recipient}</TableCell>
                    <TableCell>{getPriorityBadge(message.priority)}</TableCell>
                    <TableCell>{getStatusBadge(message.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(message.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {message.is_starred ? (
                          <Button variant="ghost" size="sm">
                            <StarOff className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm">
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Message Detail Dialog */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {getTypeIcon(selectedMessage.type)}
                <span>{selectedMessage.subject}</span>
                {getPriorityBadge(selectedMessage.priority)}
                {selectedMessage.is_starred && <Star className="h-4 w-4 text-yellow-500" />}
              </DialogTitle>
              <DialogDescription>
                From: {selectedMessage.sender} | To: {selectedMessage.recipient} | {formatDate(selectedMessage.created_at)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/20">
                <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedMessage(null)}>
                  Close
                </Button>
                <Button variant="outline">
                  <Reply className="h-4 w-4 mr-2" />
                  Reply
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Messages;