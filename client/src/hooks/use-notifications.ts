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

        wsRef.current.onopen = () => {
          console.log('WebSocket connected');
          // 清除重连定时器
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // 根据通知类型设置不同的样式
            let variant: "default" | "destructive" = data.type === 'create' ? 'default' : 'destructive';
            let title = '通知';

            switch (data.type) {
              case 'create':
                title = '新建日程';
                break;
              case 'update':
                title = '更新日程';
                variant = 'default';
                break;
              case 'delete':
                title = '删除日程';
                break;
            }

            // 显示通知
            toast({
              title,
              description: data.message,
              variant,
            });
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