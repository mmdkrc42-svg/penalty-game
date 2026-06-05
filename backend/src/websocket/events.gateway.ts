import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../database/database.module';
import { AppLogger } from '../common/logger/app-logger.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  path: '/ws',
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>(); // userId -> socketIds

  constructor(
    private readonly jwtService: JwtService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('EventsGateway');
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) throw new WsException('No token');

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      client.data.userId = userId;

      client.join(`user:${userId}`);

      if (!this.userSockets.has(userId)) this.userSockets.set(userId, new Set());
      this.userSockets.get(userId).add(client.id);

      // Send pending notifications
      const notifications = await this.redis.lrange(`notifications:${userId}`, 0, 19);
      if (notifications.length > 0) {
        client.emit('pending_notifications', notifications.map((n) => {
          try { return JSON.parse(n); } catch { return null; }
        }).filter(Boolean));
        await this.redis.del(`notifications:${userId}`);
      }

      this.logger.debug('Client connected', { userId, socketId: client.id });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSockets.delete(userId);
      }
    }
    this.logger.debug('Client disconnected', { socketId: client.id });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: Date.now() });
  }

  // Emit to a specific user
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Emit achievement unlocked
  emitAchievement(userId: string, achievement: any) {
    this.emitToUser(userId, 'achievement_unlocked', achievement);
  }

  // Emit mission completed
  emitMissionCompleted(userId: string, mission: any) {
    this.emitToUser(userId, 'mission_completed', mission);
  }

  // Emit level up
  emitLevelUp(userId: string, data: { level: number; xpReward?: number }) {
    this.emitToUser(userId, 'level_up', data);
  }

  // Emit VIP tier change
  emitVipUpgrade(userId: string, data: { tier: string; benefits: any }) {
    this.emitToUser(userId, 'vip_upgrade', data);
  }

  // Emit balance update
  emitBalanceUpdate(userId: string, balance: number) {
    this.emitToUser(userId, 'balance_update', { balance });
  }

  // Emit global announcement
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }

  isOnline(userId: string): boolean {
    return (this.userSockets.get(userId)?.size || 0) > 0;
  }

  getOnlineCount(): number {
    return this.userSockets.size;
  }
}
