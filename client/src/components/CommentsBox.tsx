import { useEffect, useState } from 'react';
import { apiService } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { formatISTDateTime } from '@/lib/utils';
import { useWebSocket } from '@/hooks/useWebSocket';

interface CommentItem {
  id: number;
  report_id: number;
  user_id: string;
  user_name?: string;
  comment: string;
  created_at: string;
}

interface CommentsBoxProps {
  reportId: number;
}

export function CommentsBox({ reportId }: CommentsBoxProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { subscribeToReports } = useWebSocket({
    reportIds: [reportId],
    onCommentNew: (msg) => {
      if (msg.report_id !== reportId) return;
      setComments((prev) => [
        {
          id: msg.comment_id!,
          report_id: msg.report_id!,
          user_id: msg.user_id!,
          user_name: msg.user_name,
          comment: msg.comment!,
          created_at: msg.created_at!,
        },
        ...prev,
      ]);
    },
  });

  useEffect(() => {
    apiService.getComments(reportId).then(setComments).catch(() => {});
    subscribeToReports([reportId]);
  }, [reportId]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await apiService.addComment(reportId, newComment.trim());
      setComments((prev) => [created, ...prev]);
      setNewComment('');
    } catch (e) {
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Add a comment"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
        />
        <Button onClick={handleSubmit} disabled={isSubmitting || !newComment.trim()}>
          <MessageCircle className="w-4 h-4 mr-1" />
          Post
        </Button>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {comments.map((c) => (
          <div key={c.id} className="text-sm">
            <div className="font-medium">{c.user_name || 'Citizen'}</div>
            <div className="text-muted-foreground">{c.comment}</div>
            <div className="text-xs text-muted-foreground">{formatISTDateTime(c.created_at)}</div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="text-sm text-muted-foreground">No comments yet.</div>
        )}
      </div>
    </div>
  );
}


