import { WebSocket, WebSocketServer } from 'ws';
import { type Server } from 'http';
import { log } from '../vite';
import { db } from "@db";
import { schedules } from "@db/schema";
import { and, gte, lte } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";

interface NotificationPayload {
  type: 'create' | 'update' | 'delete' | 'reminder' | 'sync';
  title: string;
  message: string;
  platform?: 'web' | 'desktop' | 'mobile';
  priority?: 'high' | 'normal' | 'low';
  timestamp: string;
  data?: any;
  style?: {
    variant?: 'default' | 'destructive' | 'success' | 'warning';
    duration?: number;
    icon?: string;
    sound?: boolean;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  };
}

interface SyncPayload {
  type: 'sync_request' | 'sync_response' | 'sync_update';
  deviceId: string;
  platform: string;
  timestamp: string;
  data?: {
    schedules?: any[];
    lastSyncTimestamp?: string;
    changes?: Array<{
      type: 'create' | 'update' | 'delete';
      schedule: any;
      timestamp: string;
    }>;
  };
}

interface VerifyClientInfo {
  origin: string;
  secure: boolean;
  req: any;
}

interface ConnectedClient {
  ws: WebSocket;
  platform: string;
  deviceId: string;
  lastSyncTimestamp?: string;
  preferences?: {
    sound: boolean;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    duration: number;
  };
}

class NotificationService {
  private wss: WebSocketServer;
  private clients: Map<string, ConnectedClient> = new Map();
  private syncHistory: Map<string, Array<{type: string, data: any, timestamp: string}>> = new Map();

  // 默认通知样式配置
  private defaultStyles = {
    create: {
      variant: 'success',
      duration: 5000,
      icon: 'plus-circle',
      sound: true
    },
    update: {
      variant: 'default',
      duration: 3000,
      icon: 'pencil',
      sound: false
    },
    delete: {
      variant: 'destructive',
      duration: 5000,
      icon: 'trash',
      sound: true
    },
    reminder: {
      variant: 'warning',
      duration: 10000,
      icon: 'bell',
      sound: true
    },
    sync: {
      variant: 'default',
      duration: 3000,
      icon: 'refresh-cw',
      sound: false
    }
  } as const;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      verifyClient: (info: VerifyClientInfo) => {
        const protocol = info.req.headers['sec-websocket-protocol'];
        return !protocol || protocol !== 'vite-hmr';
      }
    });
    this.setupWebSocket();
  }

  private async getSchedulesForSync(startDate: Date, endDate?: Date) {
    const query = {
      where: endDate ? 
        and(
          gte(schedules.startTime, startDate),
          lte(schedules.startTime, endDate)
        ) :
        gte(schedules.startTime, startDate)
    };

    return await db.query.schedules.findMany(query);
  }

  private setupWebSocket() {
    this.wss.on('connection', async (ws: WebSocket, req: any) => {
      const platform = req.headers['x-platform'] || 'web';
      const deviceId = req.headers['x-device-id'] || `web-${Date.now()}`;

      log(`New client connected from ${platform} (${deviceId})`);

      // 设置默认偏好设置
      this.clients.set(deviceId, {
        ws,
        platform,
        deviceId,
        preferences: {
          sound: true,
          position: 'top-right',
          duration: 5000
        }
      });

      // 发送连接成功通知
      this.sendToClient(ws, {
        type: 'create',
        title: '连接成功',
        message: `已建立${platform}平台实时通知连接`,
        platform,
        timestamp: new Date().toISOString(),
        style: this.defaultStyles.create
      });

      // 向其他客户端发送同步通知
      this.broadcastSync(deviceId, platform);

      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message);
          switch (data.type) {
            case 'sync_request':
              await this.handleSyncRequest(deviceId, data.lastSyncTimestamp);
              break;
            case 'sync_update':
              await this.handleSyncUpdate(deviceId, data.changes);
              break;
            case 'update_preferences':
              this.updateClientPreferences(deviceId, data.preferences);
              break;
          }
        } catch (error) {
          log(`Failed to process message: ${error}`);
          this.sendToClient(ws, {
            type: 'sync',
            title: '同步错误',
            message: '处理同步请求时发生错误',
            timestamp: new Date().toISOString(),
            style: {
              ...this.defaultStyles.sync,
              variant: 'destructive'
            }
          });
        }
      });

      ws.on('error', (error) => {
        log(`WebSocket error from ${platform} (${deviceId}): ${error.message}`);
        this.clients.delete(deviceId);
      });

      ws.on('close', () => {
        log(`Client disconnected from ${platform} (${deviceId})`);
        this.clients.delete(deviceId);
      });

      // 初始同步
      await this.handleSyncRequest(deviceId);
    });

    this.wss.on('error', (error) => {
      log(`WebSocket server error: ${error.message}`);
    });
  }

  private updateClientPreferences(deviceId: string, preferences: Partial<ConnectedClient['preferences']>) {
    const client = this.clients.get(deviceId);
    if (client && client.preferences) {
      client.preferences = {
        ...client.preferences,
        ...preferences
      };
      this.clients.set(deviceId, client);

      // 发送确认通知
      this.sendToClient(client.ws, {
        type: 'create',
        title: '设置更新',
        message: '通知偏好设置已更新',
        timestamp: new Date().toISOString(),
        style: {
          variant: 'success',
          duration: 3000
        }
      });
    }
  }

  private broadcastSync(sourceDeviceId: string, sourcePlatform: string) {
    const syncMessage: NotificationPayload = {
      type: 'sync',
      title: '设备同步',
      message: `新设备已连接: ${sourcePlatform}`,
      timestamp: new Date().toISOString(),
      style: this.defaultStyles.sync
    };

    this.clients.forEach((client, deviceId) => {
      if (deviceId !== sourceDeviceId && client.ws.readyState === WebSocket.OPEN) {
        this.sendToClient(client.ws, syncMessage);
      }
    });
  }

  private async handleSyncRequest(deviceId: string, lastSyncTimestamp?: string) {
    const client = this.clients.get(deviceId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      // 获取上次同步时间后的所有日程
      const startDate = lastSyncTimestamp ? new Date(lastSyncTimestamp) : startOfDay(new Date());
      const schedules = await this.getSchedulesForSync(startDate);

      // 发送同步数据
      const syncResponse: SyncPayload = {
        type: 'sync_response',
        deviceId,
        platform: client.platform,
        timestamp: new Date().toISOString(),
        data: {
          schedules,
          lastSyncTimestamp: new Date().toISOString(),
        }
      };

      client.ws.send(JSON.stringify(syncResponse));

      // 更新客户端最后同步时间
      client.lastSyncTimestamp = new Date().toISOString();
      this.clients.set(deviceId, client);

      // 发送同步完成通知
      this.sendToClient(client.ws, {
        type: 'sync',
        title: '同步完成',
        message: '日程数据已同步',
        timestamp: new Date().toISOString(),
        style: this.defaultStyles.sync
      });
    } catch (error) {
      log(`Sync request failed for device ${deviceId}: ${error}`);
      this.sendToClient(client.ws, {
        type: 'sync',
        title: '同步失败',
        message: '无法完成数据同步，请稍后重试',
        timestamp: new Date().toISOString(),
        style: {
          ...this.defaultStyles.sync,
          variant: 'destructive'
        }
      });
    }
  }

  private async handleSyncUpdate(deviceId: string, changes: Array<{type: string; data: any; timestamp: string}>) {
    const client = this.clients.get(deviceId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      // 记录变更历史
      this.syncHistory.set(deviceId, changes);

      // 广播变更到其他设备
      const updatePayload: SyncPayload = {
        type: 'sync_update',
        deviceId,
        platform: client.platform,
        timestamp: new Date().toISOString(),
        data: { changes }
      };

      this.clients.forEach((otherClient, otherId) => {
        if (otherId !== deviceId && otherClient.ws.readyState === WebSocket.OPEN) {
          otherClient.ws.send(JSON.stringify(updatePayload));
        }
      });

      // 发送确认通知
      this.sendToClient(client.ws, {
        type: 'sync',
        title: '更新同步',
        message: '变更已同步到其他设备',
        timestamp: new Date().toISOString(),
        style: this.defaultStyles.sync
      });
    } catch (error) {
      log(`Sync update failed for device ${deviceId}: ${error}`);
      this.sendToClient(client.ws, {
        type: 'sync',
        title: '同步失败',
        message: '无法同步变更到其他设备',
        timestamp: new Date().toISOString(),
        style: {
          ...this.defaultStyles.sync,
          variant: 'destructive'
        }
      });
    }
  }

  public broadcast(payload: Omit<NotificationPayload, 'timestamp'>) {
    const style = this.defaultStyles[payload.type];
    const message = {
      ...payload,
      timestamp: new Date().toISOString(),
      style
    };

    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        // 应用客户端的偏好设置
        if (client.preferences) {
          message.style = {
            ...style,
            sound: client.preferences.sound,
            position: client.preferences.position,
            duration: client.preferences.duration
          };
        }
        this.sendToClient(client.ws, message);
      }
    });
  }

  private sendToClient(ws: WebSocket, payload: NotificationPayload) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  // 日程创建通知
  public notifyScheduleCreated(title: string) {
    this.broadcast({
      type: 'create',
      title: '新日程创建',
      message: `新日程 "${title}" 已创建`,
      priority: 'normal'
    });
  }

  // 日程更新通知
  public notifyScheduleUpdated(title: string) {
    this.broadcast({
      type: 'update',
      title: '日程更新',
      message: `日程 "${title}" 已更新`,
      priority: 'normal'
    });
  }

  // 日程删除通知
  public notifyScheduleDeleted(title: string) {
    this.broadcast({
      type: 'delete',
      title: '日程删除',
      message: `日程 "${title}" 已删除`,
      priority: 'normal'
    });
  }

  // 日程提醒通知
  public notifyScheduleReminder(title: string, startTime: Date) {
    this.broadcast({
      type: 'reminder',
      title: '日程提醒',
      message: `日程 "${title}" 将在 ${this.formatTimeUntil(startTime)} 后开始`,
      priority: 'high'
    });
  }

  private formatTimeUntil(time: Date): string {
    const now = new Date();
    const diff = time.getTime() - now.getTime();
    const minutes = Math.floor(diff / 1000 / 60);

    if (minutes < 60) {
      return `${minutes} 分钟`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours} 小时 ${remainingMinutes} 分钟`;
    }
  }
}

let notificationService: NotificationService | null = null;

export function initializeNotificationService(server: Server) {
  if (!notificationService) {
    notificationService = new NotificationService(server);
    log('NotificationService initialized');
  }
  return notificationService;
}

export function getNotificationService() {
  if (!notificationService) {
    throw new Error('NotificationService not initialized');
  }
  return notificationService;
}