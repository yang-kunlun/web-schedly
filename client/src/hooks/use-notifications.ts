import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export function useNotifications() {
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    function connect() {
      // 构建WebSocket URL，使用相同的主机名和端口
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
          // 清除重连定时器
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
            let variant: "default" | "destructive" | undefined;
            let title = data.title || '通知';

            // 根据通知类型和优先级设置样式
            switch (data.type) {
              case 'create':
                variant = 'default';
                break;
              case 'update':
                variant = 'default';
                break;
              case 'delete':
                variant = 'destructive';
                break;
              case 'reminder':
                variant = data.priority === 'high' ? 'destructive' : 'default';
                break;
              case 'sync':
                variant = 'default';
                break;
            }

            // 显示通知
            toast({
              title,
              description: data.message,
              variant,
              duration: data.type === 'reminder' ? 10000 : 5000, // 提醒通知显示更长时间
            });

            // 如果是同步通知，可以在这里处理数据同步
            if (data.type === 'sync' && data.data) {
              // TODO: 处理同步数据
              console.log('Received sync data:', data.data);
            }
          } catch (error) {
            console.error('Failed to parse notification:', error);
          }
        };

        wsRef.current.onclose = () => {
          console.log('WebSocket disconnected, attempting to reconnect...');
          // 设置重连定时器
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

    // 清理函数
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [toast]);

  return wsRef.current;
}