import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface SyncMessage {
  type: string;
  title: string;
  message: string;
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

export function useSync() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deviceId = localStorage.getItem('deviceId') || `device-${Math.random().toString(36).substr(2, 9)}`;
  const platform = navigator.platform;

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.addEventListener('open', () => {
      setIsConnected(true);
      // 发送初始同步请求
      ws.send(JSON.stringify({
        type: 'sync_request',
        deviceId,
        platform,
        lastSyncTimestamp: lastSyncTime?.toISOString()
      }));
    });

    ws.addEventListener('message', (event) => {
      try {
        const message: SyncMessage = JSON.parse(event.data);

        // 处理同步响应
        if (message.type === 'sync_response') {
          if (message.data?.schedules) {
            // 更新React Query缓存
            queryClient.setQueryData(['/api/schedules'], (oldData: any) => {
              // 合并现有数据和新数据，避免重复
              const existing = oldData || [];
              const newSchedules = message.data.schedules;
              return [...existing, ...newSchedules.filter((s: any) => 
                !existing.some((e: any) => e.id === s.id)
              )];
            });
          }
          setLastSyncTime(new Date(message.data?.lastSyncTimestamp || Date.now()));
        }

        // 处理同步更新
        if (message.type === 'sync_update' && message.data?.changes) {
          message.data.changes.forEach((change: any) => {
            queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
          });
        }

        // 显示通知
        if (message.title && message.message) {
          toast({
            title: message.title,
            description: message.message,
            variant: message.style?.variant || 'default',
            duration: message.style?.duration || 5000,
          });
        }
      } catch (error) {
        console.error('Failed to process sync message:', error);
      }
    });

    ws.addEventListener('close', () => {
      setIsConnected(false);
      // 尝试重新连接
      setTimeout(() => connect(), 3000);
    });

    ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    });

    return ws;
  }, [deviceId, lastSyncTime, platform, queryClient, toast]);

  useEffect(() => {
    localStorage.setItem('deviceId', deviceId);
    const ws = connect();

    return () => {
      ws.close();
    };
  }, [connect, deviceId]);

  // 提供同步状态和手动同步方法
  return {
    isConnected,
    lastSyncTime,
    deviceId,
    platform,
  };
}
