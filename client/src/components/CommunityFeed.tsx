import { useEffect, useMemo, useState } from 'react';
import { apiService } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';
import { formatISTDateTime, absoluteMediaUrl } from '@/lib/utils';
import { UpvoteButton } from '@/components/UpvoteButton';
import { useWebSocket } from '@/hooks/useWebSocket';
import { CommentsBox } from '@/components/CommentsBox';

type CommunityItem = {
  id: number;
  title: string;
  category: string;
  reporter_name?: string;
  status: string;
  upvotes: number;
  comments_count: number;
  urgency_score: number;
  created_at: string;
  ai_generated_title?: string;
  ai_generated_description?: string;
  image_url?: string;
  user_has_upvoted?: boolean;
};

export function CommunityFeed({ highlightId }: { highlightId?: number }) {
  const [items, setItems] = useState<CommunityItem[]>([]);
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [expandedImage, setExpandedImage] = useState<Record<number, boolean>>({});
  const [expandedDesc, setExpandedDesc] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  const reportIds = useMemo(() => items.map(i => i.id), [items]);

  const { subscribeToReports } = useWebSocket({
    reportIds,
    onUpvoteUpdate: (msg) => {
      setItems(prev => prev.map(i => i.id === msg.report_id ? { ...i, upvotes: msg.total_upvotes! } : i));
    },
    onCommentNew: (msg) => {
      setItems(prev => prev.map(i => i.id === msg.report_id ? { ...i, comments_count: (i.comments_count || 0) + 1 } : i));
    }
  });

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getCommunityReports({ sort: 'upvotes', limit: 100 });
      setItems(data.map((d: any) => ({ ...d, created_at: d.created_at })));
      subscribeToReports(data.map((d: any) => d.id));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // When highlightId is provided, wait for items to load and then scroll & highlight
  useEffect(() => {
    if (!highlightId) return;
    // set local highlight state
    setHighlightedId(highlightId);
    // attempt scroll after a small delay to ensure DOM is painted
    const t = setTimeout(() => {
      const el = document.getElementById(`report-card-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
    // remove highlight after a few seconds
    const t2 = setTimeout(() => setHighlightedId(null), 5000);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [highlightId, items.length]);

  const toggleUpvote = async (id: number) => {
    try {
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) return;
      const optimistic = [...items];
      const active = !!optimistic[idx].user_has_upvoted;
      optimistic[idx] = {
        ...optimistic[idx],
        upvotes: optimistic[idx].upvotes + (active ? -1 : 1),
        user_has_upvoted: !active,
        urgency_score: Math.max(0, (optimistic[idx].urgency_score || 0) + (active ? -0.5 : 0.5))
      };
      setItems(optimistic);

      const res = await apiService.toggleUpvote(id);
      setItems(prev => prev.map(i => i.id === id ? { ...i, upvotes: res.total_upvotes, user_has_upvoted: res.user_has_upvoted } : i));
    } catch (e) {
      // reload on error
      load();
    }
  };

  const toggleComments = (id: number) => {
    setExpandedComments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">
      {isLoading && <div className="text-sm text-muted-foreground">Loading community feed...</div>}
      {items.map(item => (
        <Card key={item.id} id={`report-card-${item.id}`} className={highlightedId === item.id ? 'ring-2 ring-green-500 animate-pulse' : undefined}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <div className="text-sm text-muted-foreground">{item.reporter_name || 'Anonymous'} • {formatISTDateTime(item.created_at)}</div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{item.category}</Badge>
                <Badge>{item.status}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {item.image_url && (
              <div className="mb-3">
                <img
                  src={absoluteMediaUrl(item.image_url)}
                  alt="evidence"
                  className={`w-full ${expandedImage[item.id] ? 'h-auto' : 'h-48'} object-cover rounded cursor-pointer`}
                  onClick={() => setExpandedImage(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                />
                <button
                  className="text-xs text-blue-600 hover:underline mt-1"
                  onClick={() => setExpandedImage(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                >
                  {expandedImage[item.id] ? 'Collapse image' : 'Expand image'}
                </button>
              </div>
            )}
            {item.ai_generated_description && (
              <div className="mb-3">
                <div className={`text-sm text-muted-foreground whitespace-pre-wrap ${expandedDesc[item.id] ? '' : 'line-clamp-6'}`}>
                  {item.ai_generated_description}
                </div>
                <button
                  className="text-xs text-blue-600 hover:underline mt-1"
                  onClick={() => setExpandedDesc(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                >
                  {expandedDesc[item.id] ? 'Collapse description' : 'Expand description'}
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <UpvoteButton count={item.upvotes || 0} active={!!item.user_has_upvoted} onToggle={() => toggleUpvote(item.id)} />
                <button className="text-sm text-muted-foreground hover:text-foreground flex items-center" onClick={() => toggleComments(item.id)}>
                  <MessageCircle className="w-4 h-4 mr-1" />
                  {item.comments_count || 0}
                </button>
              </div>
              <div className="text-xs text-muted-foreground">Urgency: {item.urgency_score}</div>
            </div>
            {expandedComments[item.id] && (
              <div className="mt-4">
                <CommentsBox reportId={item.id} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {!isLoading && items.length === 0 && (
        <div className="text-sm text-muted-foreground">No reports found in your community yet.</div>
      )}
    </div>
  );
}


