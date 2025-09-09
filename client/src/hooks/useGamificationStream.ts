import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';

export type GamificationEvent =
  | { type: 'hello'; channel: 'gamification'; connected: boolean }
  | { type: 'points_update'; delta: number; total: number }
  | { type: 'badge_unlocked'; badge: string; points_added?: number }
  | { type: 'streak_update'; streak_days: number }
  | { type: 'leaderboard_update'; rank: number };

export function useGamificationStream(options?: {
  onEvent?: (event: GamificationEvent) => void;
}) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/gamification/stream?user_id=${encodeURIComponent(user.id)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        options?.onEvent?.(data as GamificationEvent);
      } catch {}
    };
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => {
      ws.close(1000, 'disconnect');
      wsRef.current = null;
    };
  }, [user?.id]);

  return { connected };
}


