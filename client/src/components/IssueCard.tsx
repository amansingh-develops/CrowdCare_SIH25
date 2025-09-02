import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./StatusBadge";
import { Heart, MessageCircle, MapPin, Calendar, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { IssueWithDetails } from "@shared/schema";
import { ISSUE_CATEGORIES } from "@/types";

interface IssueCardProps {
  issue: IssueWithDetails;
  onUpvote?: (issueId: string) => void;
  onView?: (issueId: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function IssueCard({ issue, onUpvote, onView, showActions = true, compact = false }: IssueCardProps) {
  const categoryLabel = ISSUE_CATEGORIES.find(c => c.value === issue.category)?.label || issue.category;
  
  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpvote?.(issue.id);
  };

  const handleView = () => {
    onView?.(issue.id);
  };

  return (
    <Card 
      className="card-hover transition-all duration-200 hover:shadow-md cursor-pointer"
      onClick={handleView}
      data-testid={`card-issue-${issue.id}`}
    >
      <CardContent className={compact ? "p-4" : "p-6"}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1 line-clamp-1" data-testid={`text-issue-title-${issue.id}`}>
              {issue.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-issue-description-${issue.id}`}>
              {issue.description}
            </p>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <StatusBadge status={issue.status} />
            <StatusBadge priority={issue.priority} />
          </div>
        </div>

        {/* Issue Image */}
        {issue.images && issue.images.length > 0 && (
          <div className="mb-3">
            <img
              src={`/uploads/${issue.images[0].filePath}`}
              alt="Issue evidence"
              className="w-full h-32 object-cover rounded-md"
              data-testid={`img-issue-evidence-${issue.id}`}
            />
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center text-xs text-muted-foreground space-x-4 mb-3">
          <div className="flex items-center">
            <MapPin className="w-3 h-3 mr-1" />
            <span className="truncate max-w-32" data-testid={`text-issue-location-${issue.id}`}>
              {issue.location}
            </span>
          </div>
          <div className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            <span data-testid={`text-issue-date-${issue.id}`}>
              {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center">
            <User className="w-3 h-3 mr-1" />
            <span data-testid={`text-issue-reporter-${issue.id}`}>
              {issue.reportedBy.firstName || 'Anonymous'}
            </span>
          </div>
        </div>

        {/* Category Badge */}
        <div className="mb-3">
          <Badge variant="secondary" className="text-xs" data-testid={`badge-category-${issue.id}`}>
            {categoryLabel}
          </Badge>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUpvote}
                className="text-muted-foreground hover:text-accent flex items-center space-x-1"
                data-testid={`button-upvote-${issue.id}`}
              >
                <Heart className="w-4 h-4" />
                <span>{issue.upvotes || 0}</span>
              </Button>
              <div className="flex items-center space-x-1 text-muted-foreground">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm" data-testid={`text-comment-count-${issue.id}`}>
                  {issue.comments?.length || 0}
                </span>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleView}
              data-testid={`button-view-details-${issue.id}`}
            >
              View Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
