import { WebSocket, WebSocketServer } from 'ws';
import { type Server } from 'http';
import { log } from '../vite';

interface NotificationPayload {
  type: 'create' | 'update' | 'delete';
  title: string;
  message: string;
  data?: any;
}

interface VerifyClientInfo {
  origin: string;
  secure: boolean;
  req: any;
}

class NotificationService {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

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
    this.wss.on('connection', (ws: WebSocket) => {
      log('New client connected');
      this.clients.add(ws);

      ws.on('error', (error) => {
        log(`WebSocket error: ${error.message}`);
        this.clients.delete(ws);
      });

      ws.on('close', () => {
        log('Client disconnected');
        this.clients.delete(ws);
      });

      // 发送欢迎消息
      this.sendToClient(ws, {
        type: 'create',
        title: '连接成功',
        message: '已建立实时通知连接'
      });
    });

    this.wss.on('error', (error) => {
      log(`WebSocket server error: ${error.message}`);
    });
  }

  public broadcast(payload: NotificationPayload) {
    const message = JSON.stringify(payload);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
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
    });
  }

  // 日程更新通知
  public notifyScheduleUpdated(title: string) {
    this.broadcast({
      type: 'update',
      title: '日程更新',
      message: `日程 "${title}" 已更新`,
    });
  }

  // 日程删除通知
  public notifyScheduleDeleted(title: string) {
    this.broadcast({
      type: 'delete',
      title: '日程删除',
      message: `日程 "${title}" 已删除`,
    });
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