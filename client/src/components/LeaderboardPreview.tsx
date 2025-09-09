import * as React from 'react';

export function LeaderboardPreview({ leaders, rank }: { leaders: Array<{ rank: number; name: string; points: number }>; rank?: number | null }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">Leaderboard (Municipality)</span>
        {rank ? <span className="text-xs text-slate-500">Your rank: {rank}</span> : null}
      </div>
      <div className="space-y-2">
        {leaders.slice(0, 5).map((l) => (
          <div key={l.rank} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-6 text-slate-500">#{l.rank}</span>
              <span className="font-medium">{l.name}</span>
            </div>
            <span className="tabular-nums text-slate-700">{l.points.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-right">
        <a href="#" className="text-xs text-sky-700 hover:underline">View Full Leaderboard</a>
      </div>
    </div>
  );
}

export default LeaderboardPreview;


