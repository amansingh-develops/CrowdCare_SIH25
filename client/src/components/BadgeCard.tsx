import * as React from 'react';
import { Progress } from '@/components/ui/progress';

export function BadgeCard({
  badge,
}: {
  badge: { code: string; tier: number; name: string; icon_url: string; earned: boolean; earned_at?: string | null; progress: number; goal: number };
}) {
  const locked = !badge.earned;
  const pct = badge.goal > 0 ? Math.min(100, Math.round((badge.progress / badge.goal) * 100)) : 0;
  const tierLabel = ['I', 'II', 'III'][Math.max(0, Math.min(2, badge.tier - 1))] || 'I';
  return (
    <div className={`rounded-lg border p-3 bg-white ${locked ? 'opacity-60' : ''}`} title={`${badge.name} — ${pct}%`}>
      <div className="flex items-center gap-2">
        <img src={badge.icon_url} alt={badge.name} className="w-8 h-8" />
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{badge.name}</div>
          <div className="text-xs text-slate-500">Tier {tierLabel}</div>
        </div>
      </div>
      <div className="mt-2">
        <Progress value={pct} />
        <div className="mt-1 text-[10px] text-slate-500">{badge.progress}/{badge.goal}</div>
      </div>
    </div>
  );
}

export default BadgeCard;


