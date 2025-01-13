import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // 更新状态
    const updateMatches = () => {
      setMatches(media.matches);
    };
    
    // 初始化
    updateMatches();
    
    // 监听变化
    media.addEventListener('change', updateMatches);
    
    // 清理
    return () => {
      media.removeEventListener('change', updateMatches);
    };
  }, [query]);

  return matches;
}
