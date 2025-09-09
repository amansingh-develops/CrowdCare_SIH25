import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiService } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useGamificationStream, GamificationEvent } from '@/hooks/useGamificationStream';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge as UIBadge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ConfettiAnimation } from '@/components/ConfettiAnimation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type BadgeItem = {
  code: string;
  tier: number;
  name: string;
  icon_url: string;
  earned: boolean;
  earned_at?: string | null;
  progress: number;
  goal: number;
};

export function GamificationWidget() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState('Bronze');
  const [xpInLevel, setXpInLevel] = useState(0);
  const [xpReq, setXpReq] = useState(500);
  const [streak, setStreak] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [leaders, setLeaders] = useState<Array<{ rank: number; name: string; points: number }>>([]);
  const [confettiKey, setConfettiKey] = useState<number>(0);

  const { connected } = useGamificationStream({
    onEvent: (e: GamificationEvent) => {
      if (e.type === 'points_update') {
        setPoints(e.total);
      } else if (e.type === 'badge_unlocked') {
        toast({ title: 'Achievement Unlocked', description: `🏆 ${e.badge}` });
        setConfettiKey((k) => k + 1);
        // Refetch to update badges
        void fetchProfile();
      } else if (e.type === 'streak_update') {
        setStreak(e.streak_days);
      } else if (e.type === 'leaderboard_update') {
        setRank(e.rank);
      }
    },
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await apiService.getGamificationProfile();
      setName(data.user.name);
      setAvatar(data.user.avatar);
      setLevel(data.user.level);
      setPoints(data.user.points);
      setStreak(data.user.streak_days);
      setRank(data.user.rank);
      setXpInLevel(data.user.xp_in_level || 0);
      setXpReq(data.user.xp_required || 500);
      setBadges(data.badges || []);
      setLeaders(data.leaderboard_preview || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
  }, []);

  const levelPct = useMemo(() => {
    if (!xpReq) return 0;
    return Math.max(0, Math.min(100, Math.round((xpInLevel / xpReq) * 100)));
  }, [xpInLevel, xpReq]);

  return (
    <div className="relative">
      <ConfettiAnimation trigger={confettiKey} />
      <Card className="overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{name || 'Citizen'}</div>
              <div className="text-xs text-amber-600 flex items-center gap-1">
                <span role="img" aria-label="streak">🔥</span>{streak} day streak
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500">Points</div>
              <div className="text-lg font-bold tabular-nums">{points.toLocaleString()}</div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <button className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200">Details</button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-6">
                  <DialogTitle className="text-2xl font-bold text-center">{name || 'Citizen'} · Level {level} · {points.toLocaleString()} pts</DialogTitle>
                </DialogHeader>
                <div className="space-y-10">
                  {/* Level Progress Section */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-semibold text-slate-800">Level Progress</span>
                      <span className="text-base text-slate-600 bg-white px-3 py-1 rounded-full">{xpInLevel}/{xpReq} XP</span>
                    </div>
                    <Progress value={levelPct} className="h-4 bg-white" />
                  </div>

                  {/* Badges Section */}
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-lg font-semibold text-slate-800">Achievement Badges</span>
                      <UIBadge variant="secondary" className="text-base px-4 py-2">{badges.filter(b => b.earned).length} earned</UIBadge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {badges.map((b) => {
                        const locked = !b.earned;
                        const pct = b.goal > 0 ? Math.min(100, Math.round((b.progress / b.goal) * 100)) : 0;
                        return (
                          <div key={`${b.code}-${b.tier}`} className={`rounded-xl border-2 p-6 bg-white shadow-sm hover:shadow-md transition-shadow ${locked ? 'opacity-60 border-slate-200' : 'border-slate-300'}`}>
                            <div className="flex flex-col items-center text-center space-y-4">
                              <div className="relative">
                                <img src={b.icon_url} alt={b.name} className="w-16 h-16" />
                                {b.earned && (
                                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">✓</span>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-1">
                                <div className="text-lg font-semibold text-slate-800 leading-tight">{b.name}</div>
                                <div className="text-sm text-slate-500 font-medium">Tier {['I','II','III'][Math.max(0, Math.min(2, b.tier - 1))] || 'I'}</div>
                              </div>
                              <div className="w-full space-y-2">
                                <Progress value={pct} className="h-3" />
                                <div className="text-sm text-slate-600 font-medium">{b.progress}/{b.goal}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Leaderboard Section */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-lg font-semibold text-slate-800">Municipality Leaderboard</span>
                      {rank ? <span className="text-base text-slate-600 bg-white px-3 py-1 rounded-full">Your rank: #{rank}</span> : null}
                    </div>
                    <div className="space-y-3">
                      {leaders.slice(0, 5).map((l, index) => (
                        <div key={l.rank} className={`flex items-center justify-between text-lg py-4 px-4 rounded-lg ${index === 0 ? 'bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-300' : 'bg-white shadow-sm'}`}>
                          <div className="flex items-center gap-4">
                            <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-yellow-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                              {index === 0 ? '👑' : `#${l.rank}`}
                            </span>
                            <span className="font-semibold text-slate-800">{l.name}</span>
                          </div>
                          <span className="tabular-nums text-slate-700 font-bold text-lg">{l.points.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="mt-2">
            <Progress value={levelPct} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default GamificationWidget;


