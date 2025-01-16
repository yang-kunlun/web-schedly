import { useEffect, useRef, useState } from 'react';
import { useToast, type Toast } from '@/hooks/use-toast';
import {
  Bell,
  Plus,
  Pencil,
  Trash,
  RefreshCw,
  type LucideIcon
} from 'lucide-react';

interface NotificationPreferences {
  sound: boolean;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  duration: number;
}

interface NotificationStyle {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  duration?: number;
  icon?: string;
  sound?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const notificationIcons: Record<string, LucideIcon> = {
  'bell': Bell,
  'plus-circle': Plus,
  'pencil': Pencil,
  'trash': Trash,
  'refresh-cw': RefreshCw
};

export function useNotifications() {
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    sound: true,
    position: 'top-right',
    duration: 5000
  });

  // 通知音效
  const notificationSound = new Audio('/notification.mp3');

  const updatePreferences = (newPreferences: Partial<NotificationPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPreferences };
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'update_preferences',
          preferences: updated
        }));
      }
      return updated;
    });
  };

  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        wsRef.current = new WebSocket(wsUrl);

        // 添加平台和设备标识头
        const headers = {
          'X-Platform': 'web',
          'X-Device-ID': localStorage.getItem('deviceId') || `web-${Date.now()}`
        };

        wsRef.current.onopen = () => {
          console.log('WebSocket connected');
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          // 存储设备ID
          if (!localStorage.getItem('deviceId')) {
            localStorage.setItem('deviceId', headers['X-Device-ID']);
          }

          // 请求同步数据
          wsRef.current?.send(JSON.stringify({ type: 'sync_request' }));
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const style = data.style || {};
            let variant = style.variant || 'default';
            const IconComponent = style.icon ? notificationIcons[style.icon] : Bell;

            // 播放通知音效
            if (style.sound && preferences.sound) {
              notificationSound.play().catch(console.error);
            }

            // 显示通知
            toast({
              title: data.title,
              description: data.message,
              variant: variant as Toast['variant'],
              duration: style.duration || preferences.duration,
            });

            // 如果是同步通知，可以在这里处理数据同步
            if (data.type === 'sync' && data.data) {
              console.log('Received sync data:', data.data);
            }
          } catch (error) {
            console.error('Failed to parse notification:', error);
          }
        };

        wsRef.current.onclose = () => {
          console.log('WebSocket disconnected, attempting to reconnect...');
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          toast({
            title: '连接错误',
            description: '无法建立实时通知连接，正在尝试重新连接...',
            variant: 'destructive',
          });
        };
      } catch (error) {
        console.error('Failed to establish WebSocket connection:', error);
      }
    }

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [toast, preferences.sound]);

  return {
    preferences,
    updatePreferences,
    wsRef: wsRef.current
  };
}