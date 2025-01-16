import { WebSocket, WebSocketServer } from 'ws';
import { type Server } from 'http';
import { log } from '../vite';

interface NotificationPayload {
  type: 'create' | 'update' | 'delete' | 'reminder' | 'sync';
  title: string;
  message: string;
  platform?: 'web' | 'desktop' | 'mobile';
  priority?: 'high' | 'normal' | 'low';
  timestamp: string;
  data?: any;
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
}

class NotificationService {
  private wss: WebSocketServer;
  private clients: Map<string, ConnectedClient> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      verifyClient: (info: VerifyClientInfo) => {
        // 忽略Vite HMR的WebSocket连接请求
        const protocol = info.req.headers['sec-websocket-protocol'];
        return !protocol || protocol !== 'vite-hmr';
      }
    });
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const platform = req.headers['x-platform'] || 'web';
      const deviceId = req.headers['x-device-id'] || `web-${Date.now()}`;

      log(`New client connected from ${platform} (${deviceId})`);

      this.clients.set(deviceId, { ws, platform, deviceId });

      // 发送连接成功通知
      this.sendToClient(ws, {
        type: 'create',
        title: '连接成功',
        message: `已建立${platform}平台实时通知连接`,
        platform,
        timestamp: new Date().toISOString()
      });

      // 向其他客户端发送同步通知
      this.broadcastSync(deviceId, platform);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'sync_request') {
            this.handleSyncRequest(deviceId);
          }
        } catch (error) {
          log(`Failed to parse message: ${error}`);
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
    });

    this.wss.on('error', (error) => {
      log(`WebSocket server error: ${error.message}`);
    });
  }

  private broadcastSync(sourceDeviceId: string, sourcePlatform: string) {
    const syncMessage: NotificationPayload = {
      type: 'sync',
      title: '设备同步',
      message: `新设备已连接: ${sourcePlatform}`,
      timestamp: new Date().toISOString(),
    };

    this.clients.forEach((client, deviceId) => {
      if (deviceId !== sourceDeviceId && client.ws.readyState === WebSocket.OPEN) {
        this.sendToClient(client.ws, syncMessage);
      }
    });
  }

  private handleSyncRequest(deviceId: string) {
    const client = this.clients.get(deviceId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      // 在这里可以实现获取最新日程数据的逻辑
      this.sendToClient(client.ws, {
        type: 'sync',
        title: '同步完成',
        message: '日程数据已同步',
        timestamp: new Date().toISOString(),
      });
    }
  }

  public broadcast(payload: Omit<NotificationPayload, 'timestamp'>) {
    const message = {
      ...payload,
      timestamp: new Date().toISOString()
    };

    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
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
      priority: 'normal',
    });
  }

  // 日程更新通知
  public notifyScheduleUpdated(title: string) {
    this.broadcast({
      type: 'update',
      title: '日程更新',
      message: `日程 "${title}" 已更新`,
      priority: 'normal',
    });
  }

  // 日程删除通知
  public notifyScheduleDeleted(title: string) {
    this.broadcast({
      type: 'delete',
      title: '日程删除',
      message: `日程 "${title}" 已删除`,
      priority: 'normal',
    });
  }

  // 日程提醒通知
  public notifyScheduleReminder(title: string, startTime: Date) {
    this.broadcast({
      type: 'reminder',
      title: '日程提醒',
      message: `日程 "${title}" 将在 ${this.formatTimeUntil(startTime)} 后开始`,
      priority: 'high',
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