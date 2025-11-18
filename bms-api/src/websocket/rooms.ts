// Room management for WebSocket connections
import { AuthenticatedSocket, connectionManager } from './middleware';
import { BMSWebSocketEvent } from './events';

// Room types
export type RoomType = 
  | 'branch'
  | 'user-role'
  | 'user-specific'
  | 'notification'
  | 'sync'
  | 'system';

// Room interface
export interface Room {
  id: string;
  type: RoomType;
  name: string;
  branchId?: string;
  userId?: string;
  role?: string;
  connections: Set<string>;
  createdAt: Date;
  lastActivity: Date;
}

// Room manager class
export class RoomManager {
  private rooms = new Map<string, Room>();
  private socketToRoom = new Map<string, Set<string>>();

  // Create a room
  createRoom(roomId: string, type: RoomType, name: string, metadata?: any): Room {
    const room: Room = {
      id: roomId,
      type,
      name,
      branchId: metadata?.branchId,
      userId: metadata?.userId,
      role: metadata?.role,
      connections: new Set(),
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.rooms.set(roomId, room);
    console.log(`🏠 Created room: ${roomId} (${type}) - ${name}`);
    return room;
  }

  // Join socket to room
  joinRoom(socket: AuthenticatedSocket, roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      console.warn(`⚠️ Attempted to join non-existent room: ${roomId}`);
      return false;
    }

    // Add socket to room
    room.connections.add(socket.id);
    room.lastActivity = new Date();

    // Add room to socket
    if (!this.socketToRoom.has(socket.id)) {
      this.socketToRoom.set(socket.id, new Set());
    }
    this.socketToRoom.get(socket.id)!.add(roomId);

    console.log(`✅ Socket ${socket.id} joined room: ${roomId}`);
    return true;
  }

  // Leave room
  leaveRoom(socketId: string, roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    room.connections.delete(socketId);
    room.lastActivity = new Date();

    const socketRooms = this.socketToRoom.get(socketId);
    if (socketRooms) {
      socketRooms.delete(roomId);
      if (socketRooms.size === 0) {
        this.socketToRoom.delete(socketId);
      }
    }

    // Clean up empty rooms (except persistent ones)
    if (room.connections.size === 0 && !this.isPersistentRoom(roomId)) {
      this.rooms.delete(roomId);
      console.log(`🗑️ Cleaned up empty room: ${roomId}`);
    }

    return true;
  }

  // Leave all rooms for a socket
  leaveAllRooms(socketId: string): void {
    const socketRooms = this.socketToRoom.get(socketId);
    if (socketRooms) {
      socketRooms.forEach(roomId => {
        this.leaveRoom(socketId, roomId);
      });
    }
    this.socketToRoom.delete(socketId);
  }

  // Get room by ID
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  // Get all rooms
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  // Get rooms by type
  getRoomsByType(type: RoomType): Room[] {
    return this.getAllRooms().filter(room => room.type === type);
  }

  // Get rooms by branch
  getRoomsByBranch(branchId: string): Room[] {
    return this.getAllRooms().filter(room => room.branchId === branchId);
  }

  // Get sockets in a room
  getSocketsInRoom(roomId: string): AuthenticatedSocket[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    const sockets: AuthenticatedSocket[] = [];
    room.connections.forEach(socketId => {
      const socket = connectionManager.connections.get(socketId);
      if (socket) {
        sockets.push(socket);
      }
    });

    return sockets;
  }

  // Check if room exists
  roomExists(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  // Check if socket is in room
  isSocketInRoom(socketId: string, roomId: string): boolean {
    const socketRooms = this.socketToRoom.get(socketId);
    return socketRooms?.has(roomId) || false;
  }

  // Get socket room count
  getSocketRoomCount(socketId: string): number {
    return this.socketToRoom.get(socketId)?.size || 0;
  }

  // Broadcast event to room
  broadcastToRoom(roomId: string, event: BMSWebSocketEvent): number {
    const sockets = this.getSocketsInRoom(roomId);
    sockets.forEach(socket => {
      socket.emit(event.type, event);
    });

    console.log(`📡 Broadcasted ${event.type} to ${sockets.length} sockets in room ${roomId}`);
    return sockets.length;
  }

  // Broadcast event to multiple rooms
  broadcastToRooms(roomIds: string[], event: BMSWebSocketEvent): Map<string, number> {
    const results = new Map<string, number>();
    
    roomIds.forEach(roomId => {
      const count = this.broadcastToRoom(roomId, event);
      results.set(roomId, count);
    });

    return results;
  }

  // Get room statistics
  getRoomStats(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      id: room.id,
      type: room.type,
      name: room.name,
      connections: room.connections.size,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity,
      branchId: room.branchId,
      userId: room.userId,
      role: room.role
    };
  }

  // Get all statistics
  getAllStats() {
    const stats = {
      totalRooms: this.rooms.size,
      totalConnections: this.socketToRoom.size,
      roomsByType: {} as Record<RoomType, number>,
      roomsByBranch: {} as Record<string, number>,
      topRooms: [] as Array<{ id: string; name: string; connections: number }>
    };

    // Count rooms by type
    this.getAllRooms().forEach(room => {
      stats.roomsByType[room.type] = (stats.roomsByType[room.type] || 0) + 1;
    });

    // Count rooms by branch
    this.getAllRooms().forEach(room => {
      if (room.branchId) {
        stats.roomsByBranch[room.branchId] = (stats.roomsByBranch[room.branchId] || 0) + 1;
      }
    });

    // Top rooms by connection count
    stats.topRooms = this.getAllRooms()
      .sort((a, b) => b.connections.size - a.connections.size)
      .slice(0, 10)
      .map(room => ({
        id: room.id,
        name: room.name,
        connections: room.connections.size
      }));

    return stats;
  }

  // Check if room should be persistent
  private isPersistentRoom(roomId: string): boolean {
    const persistentPatterns = [
      /^system:/,
      /^notification:/,
      /^sync:/,
      /^branch-admin:/,
      /^user-role-admin:/
    ];

    return persistentPatterns.some(pattern => pattern.test(roomId));
  }

  // Clean up inactive rooms
  cleanupInactiveRooms(maxAge: number = 3600000): void { // 1 hour default
    const now = Date.now();
    const toDelete: string[] = [];

    this.rooms.forEach((room, roomId) => {
      if (!this.isPersistentRoom(roomId) && 
          room.connections.size === 0 && 
          now - room.lastActivity.getTime() > maxAge) {
        toDelete.push(roomId);
      }
    });

    toDelete.forEach(roomId => {
      this.rooms.delete(roomId);
      console.log(`🧹 Cleaned up inactive room: ${roomId}`);
    });
  }

  // Force cleanup all rooms
  forceCleanup(): void {
    const before = this.rooms.size;
    this.cleanupInactiveRooms(0); // Remove all non-persistent empty rooms
    const after = this.rooms.size;
    
    console.log(`🧹 Force cleanup: removed ${before - after} rooms, ${after} remaining`);
  }
}

// Room name generators
export const RoomNames = {
  // Branch-specific rooms
  branch: (branchId: string) => `branch:${branchId}`,
  branchAdmins: (branchId: string) => `branch-admin:${branchId}`,
  branchStaff: (branchId: string) => `branch-staff:${branchId}`,

  // User role rooms
  roleAdmins: () => `user-role:admin`,
  roleManagers: () => `user-role:manager`,
  roleStaff: () => `user-role:staff`,

  // User-specific rooms
  user: (userId: string) => `user:${userId}`,
  userNotifications: (userId: string) => `notifications:${userId}`,

  // System rooms
  systemNotifications: () => `system:notifications`,
  systemAlerts: () => `system:alerts`,

  // Sync rooms
  syncProducts: (branchId?: string) => branchId ? `sync:products:${branchId}` : `sync:products:all`,
  syncTransactions: (branchId?: string) => branchId ? `sync:transactions:${branchId}` : `sync:transactions:all`,
  syncInventory: (branchId?: string) => branchId ? `sync:inventory:${branchId}` : `sync:inventory:all`,
  syncFull: (branchId?: string) => branchId ? `sync:full:${branchId}` : `sync:full:all`
};

// Room management utilities
export class RoomUtils {
  // Auto-join rooms based on user profile
  static joinUserRooms(socket: AuthenticatedSocket, roomManager: RoomManager): void {
    if (!socket.user || !socket.branchId) return;

    const userRooms = [
      RoomNames.branch(socket.branchId),
      RoomNames.user(socket.user.id),
      RoomNames.userNotifications(socket.user.id),
      RoomNames.roleAdmins(),
      RoomNames.roleManagers(),
      RoomNames.roleStaff(),
    ];

    // Add branch-specific room
    if (socket.user.role === 'ADMIN') {
      userRooms.push(RoomNames.branchAdmins(socket.branchId));
    }

    userRooms.forEach(roomId => {
      if (!roomManager.roomExists(roomId)) {
        roomManager.createRoom(
          roomId,
          roomId.includes('user:') ? 'user-specific' : 
          roomId.includes('branch-') ? 'branch' :
          roomId.includes('user-role:') ? 'user-role' :
          roomId.includes('system:') ? 'system' : 'branch',
          roomId,
          {
            branchId: socket.branchId,
            userId: socket.user?.id,
            role: socket.user?.role
          }
        );
      }
      roomManager.joinRoom(socket, roomId);
    });
  }

  // Leave all user rooms
  static leaveUserRooms(socket: AuthenticatedSocket, roomManager: RoomManager): void {
    const socketRooms = roomManager.socketToRoom.get(socket.id);
    if (socketRooms) {
      socketRooms.forEach(roomId => {
        roomManager.leaveRoom(socket.id, roomId);
      });
    }
  }

  // Get rooms for event broadcasting
  static getEventRooms(event: BMSWebSocketEvent): string[] {
    const rooms: string[] = [];

    // Always include system notifications
    if (event.type === 'system:notification') {
      rooms.push(RoomNames.systemNotifications());
    }

    // Branch-specific events
    if (event.branchId) {
      rooms.push(RoomNames.branch(event.branchId));
      
      // Role-specific rooms for important events
      if (['transaction:created', 'inventory:updated', 'low-stock:alert'].includes(event.type)) {
        rooms.push(RoomNames.branchAdmins(event.branchId));
      }
    }

    // User-specific events
    if (event.userId) {
      rooms.push(RoomNames.user(event.userId));
      rooms.push(RoomNames.userNotifications(event.userId));
    }

    return rooms;
  }
}

// Export room manager instance
export const roomManager = new RoomManager();